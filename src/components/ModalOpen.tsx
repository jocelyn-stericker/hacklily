// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2019-present Jocelyn Stericker <jocelyn@nettek.ca>

import { Trash, File as FileIcon, Ellipsis, Loader2 } from "lucide-react";
import React from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#/components/ui/tabs.tsx";
import type { Auth } from "#/lib/auth";
import type { File } from "#/lib/gitfs";
import { ls } from "#/lib/gitfs";
import { cn } from "#/lib/utils";

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
    void this.fetchSongs();
  }

  render() {
    const { auth, onSignIn } = this.props;
    const { repoTree, repoError } = this.state;

    let songs: React.ReactNode;

    if (auth) {
      if (repoError) {
        songs = <div className={cn(styles.placeholder)}>{repoError}</div>;
      } else if (!repoTree) {
        songs = (
          <div className={cn(styles.placeholder)}>
            <Loader2 className="animate-spin size-6" />
          </div>
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        const lilySongs: File[] = repoTree
          .filter((song: File) => song.path.endsWith(".ly"))
          .sort();
        if (!lilySongs.length) {
          songs = (
            <div className={cn(styles.placeholder)}>
              Save a song to see it here.
            </div>
          );
        } else {
          const eachSong: React.ReactNode[] = lilySongs.map((song: File) => {
            const menu = (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <Ellipsis size="1em" className="inline" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    data-song={`${auth.repo}/${song.path}`}
                    onClick={this.handleSongDeleteClick}
                  >
                    <Trash size="1em" className="inline" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
            return (
              <tr key={song.path} data-song={`${auth.repo}/${song.path}`}>
                <td
                  className="truncate"
                  onClick={this.handleSongLiClick}
                  title={song.path}
                >
                  <FileIcon size="1em" className="mr-2 align-middle inline" />
                  {song.path}
                </td>
                <td className={cn(styles.tableIcon)}>{menu}</td>
              </tr>
            );
          });
          songs = (
            <table className="table-fixed w-full overflow-y-auto text-sm [&_tr]:hover:bg-muted [&_tr]:cursor-pointer [&_tr:nth-child(even)]:bg-muted/50">
              <tbody>{eachSong}</tbody>
            </table>
          );
        }
      }
    } else {
      songs = (
        <div
          className={cn(
            "flex-1 flex flex-row items-center justify-center",
            "text-lg",
          )}
        >
          <div>
            <a
              className="underline cursor-pointer text-blue-500"
              onClick={onSignIn}
            >
              Sign in
            </a>{" "}
            to see your songs.
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
      } catch (_err) {
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
      <Dialog open={true} onOpenChange={(open) => !open && onHide()}>
        <DialogContent className="sm:max-w-[565px]">
          <DialogHeader>
            <DialogTitle>Open song</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="github" orientation="vertical">
            <TabsList className="flex-col w-fit">
              <TabsTrigger value="github">GitHub</TabsTrigger>
              <TabsTrigger value="more-soon" disabled={true}>
                More soon&hellip;
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="github"
              className="flex-1 h-[300px] overflow-y-auto"
            >
              <GitHubOpen {...this.props} />
            </TabsContent>
            <TabsContent value="more-soon" />
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }
}
export default ModalOpen;

const styles = {
  placeholder: "flex-1 flex flex-row items-center justify-center",
  tableIcon: "w-[38px]",
} as const;
