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

import * as logoSvg from './logo.svg';
import preventDefault from './util/preventDefault';

import ButtonGroup, { ButtonSpec } from './ButtonGroup';
import { BUTTON_STYLE, HEADER_STYLE } from './styles';

export type ViewMode = 'view' | 'edit' | 'both';
export const MODE_VIEW: ViewMode = 'view';
export const MODE_BOTH: ViewMode = 'both';
export const MODE_EDIT: ViewMode = 'edit';

interface HeaderProps {
  loggedIn: boolean;
  mode: ViewMode;
  online: boolean;
  song: string | undefined;
  isDirty: boolean;
  onModeChanged(mode: ViewMode): void;
  onShowMenu(): void;
  onShowNew(): void;
  onShowPublish(): void;
}

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

export default class Header extends React.PureComponent<HeaderProps, void> {
  render(): JSX.Element {
    const { mode, loggedIn, onModeChanged, onShowMenu } = this.props;
    const modeButtons: ButtonSpec[] = [
      {
        value: MODE_VIEW,
        title: 'View',
        content: (
          <i
            aria-hidden={true}
            className={`fa fa-eye ${css(HEADER_STYLE.modeItem)}`}
          />
        ),
      },
      {
        value: MODE_BOTH,
        title: 'Split screen between viewer and editor',
        content: (
          <i
            aria-hidden={true}
            className={`fa fa-columns ${css(HEADER_STYLE.modeItem)}`}
          />
        ),
      },
      {
        value: MODE_EDIT,
        title: 'Edit',
        content: (
          <i
            aria-hidden={true}
            className={`fa fa-pencil ${css(HEADER_STYLE.modeItem)}`}
          />
        ),
      },
    ];
    const communityToolbar: React.ReactNode = this.renderCommunityToolbar();
    return (
      <div className={css(HEADER_STYLE.header)}>
        <img src={logoSvg} className={css(HEADER_STYLE.logo)} alt="Frog, Hacklily logo" />
        <div className={css(HEADER_STYLE.headerGroupWrapper, HEADER_STYLE.songs)}>
          <a
            href="#"
            title="Menu"
            onClick={preventDefault(onShowMenu)}
          >
            <span className={css(BUTTON_STYLE.buttonStyle, HEADER_STYLE.songsText)}>
              {!loggedIn && <span>Hacklily &mdash; </span>}
              {this.props.song ? last(this.props.song.split('/')).split('.ly')[0] : 'untitled'}
              {this.props.isDirty ? '*' : ''}{' '}
              <span className={css(HEADER_STYLE.srOnly)}>: an online LilyPond editor</span>
              <i className="fa fa-chevron-down" aria-hidden={true} />
            </span>
          </a>
        </div>
        <div className={css(HEADER_STYLE.headerGroupWrapper)}>
          <ButtonGroup
            value={mode}
            buttons={modeButtons}
            onChange={onModeChanged}
          />
        </div>
        <div className={css(HEADER_STYLE.headerSpacer)} />
        {communityToolbar}
      </div>
    );
  }
  renderCommunityToolbar(): React.ReactNode {
    const { online, song, onShowNew, onShowPublish, isDirty } = this.props;
    let saveShare: React.ReactNode;
    if (song) {
      if (isDirty) {
        saveShare = (
          <strong>
            <i className="fa fa-save" />{' '}
            Save updates
          </strong>
        );
      } else {
        saveShare = 'All changes saved.';
      }
    } else {
      saveShare = (
        <strong>
          <i className="fa fa-share-square-o" />{' '}
          Save / share
        </strong>
      );
    }
    if (online) {
      return (
        <div className={css(HEADER_STYLE.headerGroupWrapper)}>
          <a
            href="#"
            title="Publish"
            className={css(HEADER_STYLE.newSong)}
            onClick={preventDefault(onShowNew)}
          >
            <i className="fa fa-plus" />{' '}
            New song
          </a>
          <a
            href={isDirty || !song ? '#' : undefined}
            title="Publish"
            className={css(HEADER_STYLE.publish)}
            onClick={preventDefault(onShowPublish)}
          >
            {saveShare}
          </a>
        </div>
      );
    } else {
      return (
        <div className={css(HEADER_STYLE.headerGroupWrapper)}>
          <i className="fa fa-spinner fa-spin" aria-hidden={true} />
          <div style={{ display: 'inline-block', width: 10 }} />
        </div>
      );
    }
  }
}
