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
import React from 'react';
import * as ReactModal from 'react-modal';

import preventDefault from './util/preventDefault';

import { Auth } from './ConnectToGitHub';
import { Conflict, File, ls, write } from './gitfs';
import RPCClient from './RPCClient';
import { BUTTON_STYLE, MODAL_STYLE, PUBLISH_STYLE } from './styles';

interface PublishProps {
  code: string;
  auth: Auth;
  rpc: RPCClient;
  onHide(): void;
}

interface PublishState {
  filename: string;
  files: File[] | null;
}

class Publish extends React.PureComponent<PublishProps, PublishState> {
  state: PublishState = {
    filename: '',
    files: null,
  };

  render(): JSX.Element {
    const { auth, onHide } = this.props;
    const { filename, files } = this.state;

    let error: React.ReactNode = null;
    if (!filename.length) {
      error = (
        <span className={css(PUBLISH_STYLE.error)}>
          <i className="fa fa-exclamation-triangle" aria-hidden={true} />{' '}
          Please enter a filename.
        </span>
      );
    } else if (files && files.map((file: File) => file.path).indexOf(`${filename}.ly`) !== -1) {
      error = (
        <span className={css(PUBLISH_STYLE.error)}>
          <i className="fa fa-exclamation-triangle" aria-hidden={true} />{' '}
          That filename is taken.
        </span>
      );
    }

    return (
      <ReactModal
        className={css(MODAL_STYLE.modal, MODAL_STYLE.big)}
        contentLabel="Publish"
        isOpen={true}
        onRequestClose={onHide}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            Save / share song
            <a
              aria-label="Back to song"
              href="#"
              onClick={preventDefault(onHide)}
              className={css(MODAL_STYLE.closeButton)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </a>
          </div>
          <div className={css(MODAL_STYLE.modalBody)}>
            <div className={css(PUBLISH_STYLE.row)}>
              <span className={css(PUBLISH_STYLE.cell)}>
                Save to:
                <code className={css(PUBLISH_STYLE.mono)}>
                  &nbsp;https://{auth.repo.split('/')[0]}.github.io/u/{auth.username}/
                </code>
              </span>
              <input
                value={filename}
                className={css(PUBLISH_STYLE.cell, PUBLISH_STYLE.expand, PUBLISH_STYLE.mono)}
                placeholder="filename"
                autoFocus={true}
                onChange={preventDefault(this.handleChange)}
              />
              {/* Don't judge me too strongly (ok, judge me a little), but I have no idea */}
              {/* where 7 comes from, and I want to get on with the fun part of making Hacklily. */}
              <div style={{ width: 7, display: 'table-cell' }} />
            </div>
            <div className={css(PUBLISH_STYLE.footer)}>
              {error}
              <button
                href="#"
                onClick={this.handleSave}
                disabled={error !== null}
                className={css(BUTTON_STYLE.buttonStyle, PUBLISH_STYLE.publishBtn)}
              >
                <i className="fa fa-share-square-o" aria-hidden={true} />{' '}
                Save / share
              </button>
            </div>
          </div>
        </div>
      </ReactModal>
    );
  }

  componentDidMount(): void {
    this.loadExistingSongs();
  }

  private loadExistingSongs = async(): Promise<void> => {
    const {
      auth: {
        accessToken,
        repo,
      },
    } = this.props;

    const files: File[] = await ls(accessToken, repo);
    this.setState({
      files,
    });
  }

  private handleChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
    const filename: string = ev.target.value.replace(/[^a-zA-Z0-9_-]*/g, '');
    this.setState({
      filename,
    });
  }

  private handleSave = async (): Promise<void> => {
    await publish(this.props.code, this.props.auth, this.state.filename, this.props.rpc, false);
  }
}

export async function publish(
  code: string,
  auth: Auth,
  filename: string,
  rpc: RPCClient,
  overwrite: boolean,
): Promise<boolean> {

  // tslint:disable-next-line:insecure-random

  const pdf: string = (await rpc.call('render', {
    backend: 'pdf',
    src: code,
  })).result.files[0];

  const svg: string = (await rpc.call('render', {
    backend: 'svg',
    src: code,
  })).result.files[0];

  const pdfFilename: string = filename.replace(/\.ly$/, '.pdf');
  const svgFilename: string = filename.replace(/\.ly$/, '.svg');

  const files: File[] = await ls(auth.accessToken, auth.repo);
  const file: File | undefined = files.find((candidate: File) =>
    candidate.path === filename);
  const pdfFile: File | undefined = files.find((candidate: File) =>
    candidate.path === pdfFilename);
  const svgFile: File | undefined = files.find((candidate: File) =>
    candidate.path === svgFilename);

  if (!overwrite && (file || pdfFile || svgFile)) {
    alert('That name is already taken.');
    return false;
  }

  const { accessToken, repo } = auth;
  try {
    await write(accessToken, repo, filename, btoa(code), file ? file.sha : undefined, 'master');
    await write(accessToken, repo, pdfFilename, pdf, pdfFile ? pdfFile.sha : undefined , 'master');
    await write(accessToken, repo, svgFilename, btoa(svg), svgFile ? svgFile.sha : undefined ,
                'master');
  } catch (err) {
    if (err instanceof Conflict) {
      if (overwrite) {
        alert('The song was modified somewhere else.');
        return false;
      } else {
        alert('This name is already taken.');
        return false;
      }
    } else {
      alert('Could not save file.');
      return false;
    }
  }
  return true;
}

export default Publish;
