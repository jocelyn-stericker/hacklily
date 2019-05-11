/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2019 - present Joshua Netterfield <joshua@nettek.ca>
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

import {
  Button,
  Classes,
  Dialog,
  HTMLTable,
  Icon,
  Intent,
  Menu,
  MenuItem,
  Popover,
  Spinner,
  Tab,
  Tabs,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

import { Auth } from "./auth";
import { File, ls } from "./gitfs";

interface Props {
  auth: Auth | null;
  onHide(): void;
  onSignIn(): void;
  onDeleteSong(song: string): void;
  onLoadSong(song: string): void;
}

interface GitHubState {
  repoError: React.ReactNode | null;
  repoTree: File[] | null;
}

class GitHubOpen extends React.Component<Props, GitHubState> {
  state: GitHubState = {
    repoError: null,
    repoTree: null,
  };

  componentDidMount(): void {
    this.fetchSongs();
  }

  render() {
    const { auth, onSignIn } = this.props;
    const { repoTree, repoError } = this.state;

    let songs: React.ReactNode;

    if (auth) {
      if (repoError) {
        songs = <div className={css(styles.placeholder)}>{repoError}</div>;
      } else if (!repoTree) {
        songs = (
          <div className={css(styles.placeholder)}>
            <Spinner />
          </div>
        );
      } else {
        const lilySongs: File[] = repoTree
          .filter((song: File) => song.path.endsWith(".ly"))
          .sort();
        if (!lilySongs.length) {
          songs = (
            <div className={css(styles.placeholder)}>
              Save a song to see it here.
            </div>
          );
        } else {
          const eachSong: React.ReactNode[] = lilySongs.map((song: File) => {
            const menu = (
              <Menu data-song={`${auth.repo}/${song.path}`}>
                <MenuItem
                  text="Delete"
                  intent={Intent.DANGER}
                  icon="trash"
                  onClick={this.handleSongDeleteClick}
                />
              </Menu>
            );
            return (
              <tr key={song.path} data-song={`${auth.repo}/${song.path}`}>
                <td
                  className={Classes.TEXT_OVERFLOW_ELLIPSIS}
                  onClick={this.handleSongLiClick}
                  title={song.path}
                >
                  <Icon icon="document" className={css(styles.docIcon)} />
                  {song.path}
                </td>
                <td className={css(styles.tableIcon)}>
                  <Popover content={menu}>
                    <Button minimal={true} icon="more" small={true} />
                  </Popover>
                </td>
              </tr>
            );
          });
          songs = (
            <HTMLTable
              condensed={true}
              interactive={true}
              striped={true}
              className={css(styles.table)}
            >
              <tbody>{eachSong}</tbody>
            </HTMLTable>
          );
        }
      }
    } else {
      songs = (
        <div className={css(styles.placeholder) + " " + Classes.TEXT_LARGE}>
          <div>
            <a onClick={onSignIn}>Sign in</a> to see your songs.
          </div>
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

  private handleSongDeleteClick = (ev: React.MouseEvent<HTMLElement>): void => {
    let target: HTMLElement | null = ev.currentTarget;
    while (target) {
      const song: string | undefined = target.dataset.song;
      if (song) {
        if (confirm(`Really delete ${song}?`)) {
          this.props.onDeleteSong(song);
        }
        return;
      }
      target = target.parentElement;
    }

    throw new Error("No song defined on element.");
  };

  private handleSongLiClick = (ev: React.MouseEvent<HTMLElement>): void => {
    let target: HTMLElement | null = ev.currentTarget;
    while (target) {
      const song: string | undefined = target.dataset.song;
      if (song) {
        this.props.onLoadSong(song);
        return;
      }
      target = target.parentElement;
    }

    throw new Error("No song defined on element.");
  };
}

/**
 * This is the modal you see when you try to save an untitled file.
 * It asks you for a name.
 */
class ModalOpen extends React.PureComponent<Props, {}> {
  render(): JSX.Element {
    const { onHide } = this.props;

    return (
      <Dialog
        title="Open song"
        isOpen={true}
        onClose={onHide}
        className={css(styles.modal)}
        icon="document-open"
      >
        <div className={Classes.DIALOG_BODY}>
          <Tabs vertical={true} animate={true} renderActiveTabPanelOnly={true}>
            <Tab
              id="github"
              title={
                <div>
                  <Icon icon="git-repo" className={css(styles.methodIcon)} />{" "}
                  GitHub
                </div>
              }
              panel={<GitHubOpen {...this.props} />}
              panelClassName={css(styles.panel)}
            />
            <Tab
              id="more-soon"
              title={
                <div>
                  <Icon icon="time" className={css(styles.methodIcon)} />
                  More soon&hellip;
                </div>
              }
              disabled={true}
            />
          </Tabs>
        </div>
      </Dialog>
    );
  }
}
export default ModalOpen;

const styles = StyleSheet.create({
  modal: {
    width: 565,
  },
  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderLink: {
    ":hover": {
      color: "black",
    },
    color: "blue",
    fontSize: 16,
    textDecoration: "underline",
  },
  innerSongList: {
    listStyle: "none",
    marginLeft: 0,
    marginTop: 0,
    paddingLeft: 0,
  },
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
  song: {
    ":hover": {
      color: "blue",
    },
    color: "black",
    fontSize: 16,
    marginBottom: 4,
    textDecoration: "none",
  },
  panel: {
    display: "flex",
    flex: 1,
    height: 300,
    overflowY: "auto",
  },
  methodIcon: {
    marginRight: 8,
  },
  table: {
    tableLayout: "fixed",
    width: "100%",
    overflowY: "auto",
  },
  tableIcon: {
    width: 38,
  },
  docIcon: {
    marginRight: 8,
  },
});
