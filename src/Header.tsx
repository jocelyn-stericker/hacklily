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

import ButtonGroup, { ButtonSpec } from './ButtonGroup';
import { BUTTON_STYLE, HEADER_STYLE } from './styles';

export type ViewMode = 'view' | 'edit' | 'both';
export const MODE_VIEW: ViewMode = 'view';
export const MODE_BOTH: ViewMode = 'both';
export const MODE_EDIT: ViewMode = 'edit';
export const MIN_BOTH_WIDTH: number = 630;

interface Props {
  isDirty: boolean;
  loggedIn: boolean;
  mode: ViewMode;
  online: boolean;
  song: string | undefined;
  windowWidth: number;
  onModeChanged(mode: ViewMode): void;
  onShowMenu(): void;
  onShowNew(): void;
  onShowPublish(): void;
}

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

/**
 * Renders the top of the app.
 */
export default class Header extends React.PureComponent<Props, void> {
  render(): JSX.Element {
    const { mode, loggedIn, onModeChanged, onShowMenu, windowWidth } = this.props;
    const modeButtons: ButtonSpec[] = [];
    modeButtons.push({
      content: (
        <i
          aria-hidden={true}
          className={`fa fa-eye ${css(HEADER_STYLE.modeItem)}`}
        />
      ),
      title: 'View',
      value: MODE_VIEW,
    });
    if (windowWidth >= MIN_BOTH_WIDTH) {
      modeButtons.push({
        content: (
          <i
            aria-hidden={true}
            className={`fa fa-columns ${css(HEADER_STYLE.modeItem)}`}
          />
        ),
        title: 'Split screen between viewer and editor',
        value: MODE_BOTH,
      });
    }
    modeButtons.push({
      content: (
        <i
          aria-hidden={true}
          className={`fa fa-pencil ${css(HEADER_STYLE.modeItem)}`}
        />
      ),
      title: 'Edit',
      value: MODE_EDIT,
    });

    const communityToolbar: React.ReactNode = this.renderCommunityToolbar();
    let menu: React.ReactNode = null;
    if (windowWidth >= MIN_BOTH_WIDTH) {
      menu = (
        <div className={css(HEADER_STYLE.headerGroupWrapper, HEADER_STYLE.songs)}>
          <button
            title="Menu"
            className={css(BUTTON_STYLE.buttonStyle, HEADER_STYLE.songsText)}
            onClick={onShowMenu}
          >
            {!loggedIn && <span>Hacklily &mdash; </span>}
            {this.props.song ? last(this.props.song.split('/')).split('.ly')[0] : 'untitled'}
            {this.props.isDirty ? '*' : ''}{' '}
            <span className={css(HEADER_STYLE.srOnly)}>: an online LilyPond editor</span>
            <i className="fa fa-chevron-down" aria-hidden={true} />
          </button>
        </div>
      );
    } else {
      menu = (
        <div className={css(HEADER_STYLE.headerGroupWrapper, HEADER_STYLE.songs)}>
          <button
            title="Menu"
            className={css(BUTTON_STYLE.buttonStyle, HEADER_STYLE.songsText)}
            onClick={onShowMenu}
          >
            <i className="fa-bars fa" />{' '}
            Menu
          </button>
        </div>
      );
    }

    return (
      <div className="header">
        <img src={logoSvg} className={css(HEADER_STYLE.logo)} alt="Frog, Hacklily logo" />
        {menu || <span style={{ width: 10 }} />}
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
    const { online, song, onShowNew, onShowPublish, isDirty, windowWidth } = this.props;
    const micro: boolean = windowWidth <= 500;

    let saveShare: React.ReactNode;
    if (song) {
      if (isDirty) {
        saveShare = (
          <span>
            <i className="fa fa-save" />{' '}
            {!micro && <span>Save updates</span>}
          </span>
        );
      } else if (!micro) {
        saveShare = 'All changes saved.';
      }
    } else {
      saveShare = (
        <span>
          <i className="fa fa-save" />{' '}
          {!micro && <span>Save / share</span>}
        </span>
      );
    }

    if (!isDirty && !this.props.song) {
      return (
        <div className={css(HEADER_STYLE.headerGroupWrapper)}>
          <button
            title="Publish"
            className={css(HEADER_STYLE.newSong)}
          >
            {!micro && <span>No changes made.</span>}
          </button>
        </div>
      );
    } else if (online) {
      return (
        <div className={css(HEADER_STYLE.headerGroupWrapper)}>
          <button
            title="Publish"
            className={css(HEADER_STYLE.newSong)}
            onClick={onShowNew}
          >
            <i className="fa fa-plus" />{' '}
            {!micro && <span>New song</span>}
          </button>
          <button
            title="Publish"
            className={css(HEADER_STYLE.publish, isDirty && HEADER_STYLE.publishActive)}
            onClick={isDirty || !song ? onShowPublish : undefined}
          >
            {saveShare}
          </button>
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
