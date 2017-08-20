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

import { File, ls } from './gitfs';
import { Auth } from './ModalLogin';
import { HEADER_STYLE, MENU_STYLE } from './styles';

interface Props {
  auth: Auth | null;
  windowWidth: number;
  onDeleteSong(song: string): void;
  onHide(): void;
  onLoadSong(song: string): void;
  onShowAbout(): void;
  onSignIn(): void;
  onSignOut(): void;
}

interface State {
  repoError: React.ReactNode | null;
  repoTree: File[] | null;
}

/**
 * Renders the OPENED menu that is visible when clicking the button to the
 * left of the view mode selector.
 *
 * The menu button is rendered by <Header />
 *
 * NOTE: THIS IS NOT THE MENU IN THE STANDALONE APP. See StandaloneAppHost and
 * the hacklily-standalone repo.
 */
class Menu extends React.PureComponent<Props, State> {
  state: State = {
    repoError: null,
    repoTree: null,
  };

  componentDidMount(): void {
    this.fetchSongs();
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.auth !== this.props.auth) {
      this.fetchSongs();
    }
  }

  render(): JSX.Element {
    const { auth, onSignOut, onHide, onShowAbout, windowWidth } = this.props;

    let signOut: React.ReactNode;
    if (auth) {
      signOut = (
        <button onClick={onSignOut} className={css(MENU_STYLE.option)}>
          <i className="fa fa-fw fa-sign-out" aria-hidden={true} />{' '}
          Sign out ({auth.name})
        </button>
      );
    }

    let warning: React.ReactNode = null;
    if (windowWidth < 500) {
      warning = (
        <div>
          <i className="fa fa-fw fa-exclamation-triangle" />{' '}
          Hacklily works best on wider screens.
        </div>
      );
    }

    // tslint:disable:no-http-string because of silly lilypond
    const tutorial: React.ReactNode = (
      <a
          href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
          rel="noopener noreferrer"
          className={css(MENU_STYLE.option)}
          target="_blank"
      >
        <i className="fa fa-fw fa-life-ring" aria-hidden={true} />{' '}
        Lilypond manual
      </a>
    );
    // tslint:enable:no-http-string because of silly lilypond

    const about: React.ReactNode = (
      <button onClick={onShowAbout} className={css(MENU_STYLE.option)}>
        <i className="fa fa-fw fa-info-circle" aria-hidden={true} />{' '}
        About Hacklily
      </button>
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
          {warning}
          <div className={css(MENU_STYLE.songList, MENU_STYLE.option)}>
            {this.renderSongs()}
          </div>
          {signOut}
          {tutorial}
          {about}
        </div>
      </ReactModal>
    );
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
        repoError: null,
        repoTree: null,
      });
    }
  }

  private handleSongDeleteClick = (ev: React.MouseEvent<HTMLButtonElement>): void => {
    const song: string | undefined = ev.currentTarget.dataset.song;
    if (!song) {
      throw new Error('No song defined on element.');
    }
    this.props.onDeleteSong(song);
  }

  private handleSongLiClick = (ev: React.MouseEvent<HTMLButtonElement>): void => {
    const song: string | undefined = ev.currentTarget.dataset.song;
    if (!song) {
      throw new Error('No song defined on element.');
    }
    this.props.onLoadSong(song);
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
                <button
                  className={css(MENU_STYLE.song)}
                  onClick={this.handleSongLiClick}
                  data-song={`${auth.repo}/${song.path}`}
                >
                  <i className="fa fa-file-o fa-fw" aria-hidden={true} />{' '}
                  {song.path}
                </button>
                <button
                  className={css(MENU_STYLE.deleteSong)}
                  onClick={this.handleSongDeleteClick}
                  data-song={`${auth.repo}/${song.path}`}
                >
                  <i className="fa fa-remove fa-fw" aria-hidden={true} />
                  <span className={css(HEADER_STYLE.srOnly)}>
                    Delete this song
                  </span>
                </button>
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
          <button onClick={onSignIn} className={css(MENU_STYLE.placeholderLink)}>
            Sign in
          </button>{' '}to see your songs.
        </div>
      );
    }

    return songs;
  }
}

export default Menu;
