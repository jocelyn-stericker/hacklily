/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

import { css } from 'aphrodite';
import dompurify from 'dompurify';
import React from 'react';

// lodash.debounce has a blank "default" object defined, so the synthetic importer
// plugin does not replace default, leading to us importing the empty "default" object
// if we use the ES6 import syntax.
// tslint:disable-next-line:no-require-imports
import lodashDebounce = require('lodash.debounce');

import { MODE_BOTH, MODE_VIEW, ViewMode } from './Header';
import Logs from './Logs';
import RPCClient, { RenderResponse } from './RPCClient';
import { APP_STYLE } from './styles';

const DEBOUNCE_REFERSH_TIMEOUT: number = 1000;
const BODY_IFRAME_TEMPLATE: string = `
<link rel="stylesheet" type="text/css" href="/preview.css">
<div id="root"></div>
`;

interface PreviewProps {
  code: string;
  mode: ViewMode;
  rpc: RPCClient;
  logs: string | null;
  onSelectionChanged(selection: monaco.ISelection | null): void;
  onLogsObtained(logs: string | null): void;
}

interface AppState {
  pendingPreviews: number;
  previewAlreadyDirty: boolean;
  error: string | null;
}

export default class Preview extends React.PureComponent<PreviewProps, AppState> {
  state: AppState = {
    pendingPreviews: 0,
    previewAlreadyDirty: false,
    error: null,
  };

  private sheetMusicView: HTMLIFrameElement;
  private iframeLoaded: boolean = false;

  private update: () => void = lodashDebounce(
    async () => {
      const { code, rpc } = this.props;
      if (this.state.pendingPreviews) {
        this.setState({
          previewAlreadyDirty: true,
        });
        return;
      }

      this.setState({
        pendingPreviews: this.state.pendingPreviews + 1,
      });

      if (!this.iframeLoaded) {
        this.handleIFrameLoaded();
      }

      try {
        const response: RenderResponse = await rpc.call('render', {
          src: code,
          backend: 'svg',
        });

        const { files, logs } = response.result;

        const root: HTMLElement | null =
          this.sheetMusicView.contentWindow.document.getElementById('root');
        if (!root) {
          throw new Error('Could not get sheet music view root!');
        }

        // tslint:disable-next-line:no-inner-html
        root.innerHTML = dompurify.sanitize(files.join(''), {
          ALLOW_UNKNOWN_PROTOCOLS: true,
        } as object);
        const cleanLogs: string = this.cleanLogs(logs);
        this.props.onLogsObtained(cleanLogs);

        const svgs: SVGSVGElement[] = Array.from(root.getElementsByTagName('svg'));
        for (const svg of svgs) {
          svg.removeAttribute('width');
          svg.removeAttribute('height');
        }
        this.setState({
          pendingPreviews: this.state.pendingPreviews - 1,
        });
        if (this.state.previewAlreadyDirty) {
          this.setState({
            error: null,
            previewAlreadyDirty: false,
          });
          this.update();
        }
        return;
      } catch (err) {
        this.setState({
          pendingPreviews: this.state.pendingPreviews - 1,
          previewAlreadyDirty: true,
        });
      }
    } ,
    DEBOUNCE_REFERSH_TIMEOUT,
  );

  render(): JSX.Element {
    const { mode, logs } = this.props;
    const { pendingPreviews, error } = this.state;
    return (
      <div>
        <iframe
          className={css(APP_STYLE.sheetMusicView)}
          frameBorder="0"
          height="100%"
          ref={this.handleSetSheetMusicView}
          width={mode === MODE_BOTH ? '50%' : (mode === MODE_VIEW ? '100%' : '0')}
        />
        {pendingPreviews > 0 && <div className={css(APP_STYLE.pendingPreviewMask)} />}
        {error && <div className={css(APP_STYLE.errorMask)}>{error}</div>}
        {mode !== MODE_VIEW && <Logs logs={logs} />}
      </div>
    );
  }

  componentDidMount(): void {
    this.update();
  }

  componentDidUpdate(prevProps: PreviewProps): void {
    if (prevProps.code !== this.props.code) {
      this.update();
    }
  }

  private handleSetSheetMusicView = (sheetMusicView: HTMLIFrameElement): void => {
    this.sheetMusicView = sheetMusicView;
  }

  private handleIFrameLoaded = (): void => {
    if (this.sheetMusicView) {
      const body: HTMLElement = this.sheetMusicView.contentWindow.document.body;
      // tslint:disable-next-line:no-inner-html
      body.innerHTML = BODY_IFRAME_TEMPLATE;
      body.addEventListener('click', (ev: MouseEvent) => {
        let target: HTMLElement | null = ev.target as HTMLElement | null;
        while (target && target.localName !== 'a') {
          target = target.parentElement;
        }
        if (target && target.localName === 'a') {
          ev.preventDefault();
          const link: string | null = target.getAttribute('xlink:href');
          if (!link) {
            return;
          }
          const pathAndLocation: string[] = link.split('.ly:');
          if (pathAndLocation.length === 2) {
            const [line, startColumn, endColumn] = pathAndLocation[1].split(':');
            this.props.onSelectionChanged({
              // NOTE: we add a line on render:
              selectionStartLineNumber: parseInt(line, 10) - 1,
              positionLineNumber: parseInt(line, 10) - 1,

              selectionStartColumn: parseInt(startColumn, 10) + 1,
              positionColumn: parseInt(endColumn, 10) + 1,
            });
          }
        }
      });
    }
    this.iframeLoaded = true;
  }

  private cleanLogs(logs: string): string {
    return logs
      // Move wrapper errors to the start of the page.
      .replace(/\/tmp\/lyp\/wrappers\/hacklily.ly:([0-9]*):([0-9]*)/g,
               '/tmp/hacklily.ly:2:1')
      // Hide confusing reference to lyp
      .replace(/`\/tmp\/lyp\/wrappers\/hacklily.ly'/g,
               '`hacklily-wrapper.ly\'')
      .replace(/^Lyp.*\n/gm, '')
      .replace(/^GNU LilyPond Server.*[\n\s]*/gm, '')
      // Remove prompt
      .replace(/^>\s*\n?/gm, '');
  }
}
