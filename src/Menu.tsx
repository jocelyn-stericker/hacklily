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

import { css, StyleSheet } from "aphrodite";
import React from "react";
import ReactModal from "react-modal";

import { Auth } from "./auth";
import { File, ls } from "./gitfs";

interface Props {
  auth: Auth | null;
  colourScheme: "vs-dark" | "vs";
  windowWidth: number;
  onDeleteSong(song: string): void;
  onHide(): void;
  onLoadSong(song: string): void;
  onShowAbout(): void;
  onSignIn(): void;
  onSignOut(): void;
  setColourScheme(colourScheme: "vs-dark" | "vs"): void;
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
        <button onClick={onSignOut} className={css(styles.option)}>
          <i className="fa fa-fw fa-sign-out" aria-hidden={true} /> Sign out (
          {auth.name})
        </button>
      );
    }

    let warning: React.ReactNode = null;
    if (windowWidth < 500) {
      warning = (
        <div>
          <i className="fa fa-fw fa-exclamation-triangle" /> Hacklily works best
          on wider screens.
        </div>
      );
    }

    // tslint:disable:no-http-string because of silly lilypond
    const tutorial: React.ReactNode = (
      <a
        href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
        rel="noopener noreferrer"
        className={css(styles.option)}
        target="_blank"
      >
        <i className="fa fa-fw fa-life-ring" aria-hidden={true} /> Lilypond
        manual
      </a>
    );
    // tslint:enable:no-http-string because of silly lilypond

    const about: React.ReactNode = (
      <button onClick={onShowAbout} className={css(styles.option)}>
        <i className="fa fa-fw fa-info-circle" aria-hidden={true} /> About
        Hacklily
      </button>
    );

    return (
      <ReactModal
        className={css(styles.menu)}
        contentLabel="Menu"
        isOpen={true}
        onRequestClose={onHide}
        overlayClassName={css(styles.menuOverlay)}
      >
        <div className={css(styles.menuColumn)}>
          {warning}
          <div className={css(styles.songList, styles.option)}>
            {this.renderSongs()}
          </div>
          {signOut}
          {tutorial}
          {this.renderSetColourScheme()}
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
          repoError: "Could not retreive your songs.",
        });
      }
    } else {
      this.setState({
        repoError: null,
        repoTree: null,
      });
    }
  };

  private handleColourSchemeToggled = (): void => {
    const newColourScheme: "vs-dark" | "vs" =
      this.props.colourScheme === "vs-dark" ? "vs" : "vs-dark";

    this.props.setColourScheme(newColourScheme);
  };

  private handleSongDeleteClick = (
    ev: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    const song: string | undefined = ev.currentTarget.dataset.song;
    if (!song) {
      throw new Error("No song defined on element.");
    }
    this.props.onDeleteSong(song);
  };

  private handleSongLiClick = (
    ev: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    const song: string | undefined = ev.currentTarget.dataset.song;
    if (!song) {
      throw new Error("No song defined on element.");
    }
    this.props.onLoadSong(song);
  };

  private renderSetColourScheme(): React.ReactNode {
    const text: string =
      this.props.colourScheme === "vs-dark"
        ? "Use light colour scheme"
        : "Use dark colour scheme";

    return (
      <button
        onClick={this.handleColourSchemeToggled}
        className={css(styles.option)}
      >
        <i className="fa fa-fw fa-lightbulb-o" aria-hidden={true} /> {text}
      </button>
    );
  }

  private renderSongs(): React.ReactNode {
    const { auth, onSignIn } = this.props;
    const { repoTree, repoError } = this.state;

    let songs: React.ReactNode;

    if (auth) {
      if (repoError) {
        songs = <div className={css(styles.placeholder)}>{repoError}</div>;
      } else if (!repoTree) {
        songs = (
          <div className={css(styles.placeholder)}>
            <i className="fa fa-spinner fa-spin" aria-hidden={true} />
          </div>
        );
      } else {
        const lilySongs: File[] = repoTree
          .filter((song: File) => song.path.endsWith(".ly"))
          .sort();
        if (!lilySongs.length) {
          songs = (
            <div className={css(styles.placeholder)}>
              Save / share a song to see it here.
            </div>
          );
        } else {
          const eachSong: React.ReactNode[] = lilySongs.map((song: File) => (
            <li key={song.path}>
              <button
                className={css(styles.song)}
                onClick={this.handleSongLiClick}
                data-song={`${auth.repo}/${song.path}`}
              >
                <i className="fa fa-file-o fa-fw" aria-hidden={true} />{" "}
                {song.path}
              </button>
              <button
                className={css(styles.deleteSong)}
                onClick={this.handleSongDeleteClick}
                data-song={`${auth.repo}/${song.path}`}
              >
                <i className="fa fa-remove fa-fw" aria-hidden={true} />
                <span className={css(styles.srOnly)}>Delete this song</span>
              </button>
            </li>
          ));
          songs = <ul className={css(styles.innerSongList)}>{eachSong}</ul>;
        }
      }
    } else {
      songs = (
        <div className={css(styles.placeholder)}>
          <button onClick={onSignIn} className={css(styles.placeholderLink)}>
            Sign in
          </button>{" "}
          to see your songs.
        </div>
      );
    }

    return songs;
  }
}

export default Menu;

const styles = StyleSheet.create({
  srOnly: {
    border: 0,
    clip: "rect(0,0,0,0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    width: 1,
  },
  deleteSong: {
    ":hover": {
      color: "red",
    },
    color: "#aeaeae",
    float: "right",
  },
  innerSongList: {
    listStyle: "none",
    marginLeft: 0,
    marginTop: 0,
    paddingLeft: 0,
  },
  menu: {
    "::after": {
      "@media (max-width: 500px)": {
        left: 97,
      },
      borderBottomColor: "white",
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderStyle: "solid",
      borderTopColor: "transparent",
      borderWidth: 12,
      bottom: "100%",
      content: '" "',
      height: 0,
      left: 40,
      marginLeft: -30,
      pointerEvents: "none",
      position: "absolute",
      width: 0,
    },
    "@media (max-width: 500px)": {
      left: 0,
      position: "absolute",
      width: "100%",
    },
    backgroundColor: "white",
    border: "1px solid rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "row",
    height: 500,
    left: 65,
    outline: "none",
    padding: "14px 7px 4px 7px",
    position: "absolute",
    top: 48,
    width: 400,
    zIndex: 1050,
  },
  menuColumn: {
    "@media (max-width: 500px)": {
      marginRight: 14,
    },
    display: "flex",
    flex: 1,
    flexDirection: "column",
    overflow: "auto",
    paddingLeft: 7,
    paddingRight: 7,
  },
  menuOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  option: {
    ":hover": {
      color: "blue",
    },
    backgroundColor: "#f6f6f6",
    border: "1px solid #dedede",
    color: "black",
    fontSize: 16,
    marginBottom: 10,
    padding: 10,
    textAlign: "left",
    textDecoration: "none",
  },
  placeholder: {
    color: "black",
    fontSize: 16,
    left: "50%",
    position: "absolute",
    textAlign: "center",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
  },
  placeholderLink: {
    ":hover": {
      color: "black",
    },
    color: "blue",
    fontSize: 16,
    textDecoration: "underline",
  },
  section: {
    fontSize: 24,
    fontWeight: "bold",
    paddingBottom: 7,
  },
  song: {
    ":hover": {
      color: "blue",
    },
    color: "black",
    fontSize: 16,
    marginBottom: 4,
    textDecoration: "none",
  },
  songList: {
    flex: 1,
    position: "relative",
  },
});
