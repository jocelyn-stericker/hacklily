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
import { File, ls } from './gitfs';
import { MENU_STYLE } from './styles';

interface MenuProps {
  auth: Auth | null;
  onHide(): void;
  onShowAbout(): void;
  onSignIn(): void;
  onSignOut(): void;
  onLoadSong(song: string): void;
}

interface MenuState {
  repoTree: File[] | null;
  repoError: React.ReactNode | null;
}

class Menu extends React.PureComponent<MenuProps, MenuState> {
  state: MenuState = {
    repoTree: null,
    repoError: null,
  };

  render(): JSX.Element {
    const { auth, onSignOut, onHide, onShowAbout } = this.props;

    const songs: React.ReactNode = this.renderSongs();

    let signOut: React.ReactNode;
    if (auth) {
      signOut = (
        <a href="#" onClick={preventDefault(onSignOut)} className={css(MENU_STYLE.option)}>
          <i className="fa fa-fw fa-sign-out" aria-hidden={true} />{' '}
          Sign out ({auth.name})
        </a>
      );
    }

    // tslint:disable:no-http-string because of silly lilypond
    const tutorial: React.ReactNode = (
      <a
          href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
          className={css(MENU_STYLE.option)}
          target="_blank"
      >
        <i className="fa fa-fw fa-life-ring" aria-hidden={true} />{' '}
        Lilypond manual
      </a>
    );
    // tslint:enable:no-http-string because of silly lilypond

    const about: React.ReactNode = (
      <a href="#" onClick={preventDefault(onShowAbout)} className={css(MENU_STYLE.option)}>
        <i className="fa fa-fw fa-info-circle" aria-hidden={true} />{' '}
        About Hacklily
      </a>
    );

    return (
      <ReactModal
        className={css(MENU_STYLE.menu)}
        contentLabel="Menu"
        isOpen={true}
        onRequestClose={onHide}
        overlayClassName={css(MENU_STYLE.menuOverlay)}
      >
        <div className={css(MENU_STYLE.menuColumn)}>
          <div className={css(MENU_STYLE.songList, MENU_STYLE.option)}>
            {songs}
          </div>
          {signOut}
          {tutorial}
          {about}
        </div>
      </ReactModal>
    );
  }

  componentDidMount(): void {
    this.fetchSongs();
  }

  componentDidUpdate(prevProps: MenuProps): void {
    if (prevProps.auth !== this.props.auth) {
      this.fetchSongs();
    }
  }

  private renderSongs(): React.ReactNode {
    const { auth, onSignIn } = this.props;
    const { repoTree, repoError } = this.state;

    let songs: React.ReactNode;

    if (auth) {
      if (repoError) {
        songs = (
          <div className={css(MENU_STYLE.placeholder)}>
            {repoError}
          </div>
        );
      } else if (!repoTree) {
        songs = (
          <div className={css(MENU_STYLE.placeholder)}>
            <i className="fa fa-spinner fa-spin" aria-hidden={true} />
          </div>
        );
      } else {
        const lilySongs: File[] = repoTree
          .filter((song: File) => song.path.endsWith('.ly'))
          .sort();
        if (!lilySongs.length) {
          songs = (
            <div className={css(MENU_STYLE.placeholder)}>
              Save / share a song to see it here.
            </div>
          );
        } else {
          const eachSong: React.ReactNode[] = lilySongs
            .map((song: File) => (
              <li key={song.path}>
                <a
                  href="#"
                  onClick={this.handleSongLiClick}
                  data-song={`${auth.repo}/${song.path}`}
                >
                  {song.path}
                </a>
              </li>
            ));
          songs = (
            <ul className={css(MENU_STYLE.innerSongList)}>
              {eachSong}
            </ul>
          );
        }
      }
    } else {
      songs = (
        <div className={css(MENU_STYLE.placeholder)}>
          <a href="#" onClick={preventDefault(onSignIn)}>
            Sign in
          </a>{' '}to see your songs.
        </div>
      );
    }
    return songs;
  }

  private fetchSongs = async (): Promise<void> => {
    const { auth } = this.props;
    if (auth) {
      try {
        const repoTree: File[] = await ls(auth.accessToken, auth.repo);
        this.setState({
          repoTree,
        });
      } catch (err) {
        this.setState({
          repoError: 'Could not retreive your songs.',
        });
      }
    } else {
      this.setState({
        repoTree: null,
        repoError: null,
      });
    }
  }

  private handleSongLiClick = (ev: React.MouseEvent<HTMLAnchorElement>): void => {
    ev.preventDefault();
    ev.stopPropagation();
    const song: string | undefined = ev.currentTarget.dataset.song;
    if (!song) {
      throw new Error('No song defined on element.');
    }
    this.props.onLoadSong(song);
  }
}

export default Menu;
