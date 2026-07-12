/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
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

import { Save, TriangleAlert } from "lucide-react";
import React from "react";

import ModalSaving from "#/components/ModalSaving";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { track } from "#/lib/analytics";
import type { Auth } from "#/lib/auth";
import type { File } from "#/lib/gitfs";
import { Conflict, FileNotFound, ls, rm, write } from "#/lib/gitfs";
import { renderVersionFor } from "#/lib/lilypondVersion";
import type RPCClient from "#/lib/RPCClient";
import { cn } from "#/lib/utils";

interface Props {
  auth: Auth;
  code: string;
  rpc: RPCClient;
  onHide(): void;
  onPublished(path: string): void;
}

interface State {
  filename: string;
  files: File[] | null;
  invitationRequired: boolean;
  saving: boolean;
}

/**
 * This is the modal you see when you try to save an untitled file.
 * It asks you for a name.
 */
class ModalPublish extends React.PureComponent<Props, State> {
  state: State = {
    filename: "",
    files: null,
    invitationRequired: false,
    saving: false,
  };

  componentDidMount(): void {
    void this.loadExistingSongs();
  }

  render(): JSX.Element {
    // TODO(jocelyn): Split this up
    const { auth, onHide } = this.props;
    const { filename, files, invitationRequired, saving } = this.state;
    let disabled = false;

    if (saving) {
      return <ModalSaving />;
    }

    let error: React.ReactNode = null;
    if (!filename.length) {
      disabled = true;
      error = (
        <span className={cn("text-red-700 flex-1 self-center")}>
          <TriangleAlert size="1em" /> Please enter a filename.
        </span>
      );
    } else if (
      files &&
      files.map((file: File) => file.path).indexOf(`${filename}.ly`) !== -1
    ) {
      disabled = true;
      error = (
        <span className={cn("text-red-700 flex-1 self-center")}>
          <TriangleAlert size="1em" /> That filename is taken.
        </span>
      );
    } else if (invitationRequired) {
      error = (
        <span className={cn("text-red-700 flex-1 self-center")}>
          Permission denied. You may need to{" "}
          <a
            href={`https://github.com/${auth.repo}/invitations`}
            target="_blank"
            rel="noreferrer noopener"
          >
            enable write access
          </a>{" "}
          then try agin!
        </span>
      );
    }

    return (
      <Dialog open={true} onOpenChange={(open) => !open && onHide()}>
        <DialogContent className="sm:max-w-[565px]">
          <DialogHeader>
            <DialogTitle>Save song</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <div className="self-center whitespace-nowrap">
              Save to:&nbsp;
              <code className="font-mono">
                <a
                  href={`https://github.com/${auth.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {`${auth.repo}`}
                </a>
                /
              </code>
            </div>
            <div className="relative flex-1">
              <Input
                value={filename}
                className="font-mono pr-12"
                placeholder="filename"
                autoFocus={true}
                onChange={this.handleChange}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <code className="font-mono text-xs text-muted-foreground">
                  .ly
                </code>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2 w-full">
              {error}
              <Button
                onClick={this.handleSave}
                disabled={disabled}
                variant="default"
              >
                <Save size="1em" />
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  private handleChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
    const filename: string = ev.target.value.replace(/[^a-zA-Z0-9_-]*/g, "");
    this.setState({
      filename,
    });
  };

  private handleSave = async (): Promise<void> => {
    let didFail = false;
    try {
      this.setState({
        saving: true,
      });
      const { code, auth, rpc } = this.props;
      const { filename } = this.state;
      await doPublish(code, auth, `${filename}.ly`, rpc, false);
      track("github/publish");
    } catch (err) {
      if (err instanceof FileNotFound) {
        didFail = true;
        this.setState({
          invitationRequired: true,
        });

        return;
      }

      console.log(err);
      alert(String(err));
      didFail = true;
    } finally {
      this.setState({
        saving: false,
      });
      if (!didFail) {
        this.props.onPublished(
          `${this.props.auth.repo}/${this.state.filename}.ly`,
        );
      }
    }
  };

  private loadExistingSongs = async (): Promise<void> => {
    const {
      auth: { accessToken, repo },
    } = this.props;

    const files: File[] = await ls(accessToken, repo);
    this.setState({
      files,
    });
  };
}

function b64EncodeUnicode(str: string): string {
  // first we use encodeURIComponent to get percent-encoded UTF-8,
  // then we convert the percent encodings into raw bytes which
  // can be fed into btoa.
  return btoa(
    encodeURIComponent(str).replace(
      /%([0-9A-F]{2})/g,
      (_match: string, p1: string) => String.fromCharCode(+`0x${p1}`),
    ),
  );
}

export async function doPublish(
  code: string,
  auth: Auth,
  filename: string,
  rpc: RPCClient,
  overwrite: boolean,
): Promise<boolean> {
  const version = renderVersionFor(code);

  const pdf: string = (
    await rpc.call("render", {
      version,
      backend: "pdf",
      src: code,
    })
  ).result.files[0];

  const pdfFilename: string = filename.replace(/\.ly$/, ".pdf");

  const files: File[] = await ls(auth.accessToken, auth.repo);
  const file: File | undefined = files.find(
    (candidate: File) => candidate.path === filename,
  );
  const pdfFile: File | undefined = files.find(
    (candidate: File) => candidate.path === pdfFilename,
  );

  if (!overwrite && (file || pdfFile)) {
    throw new Error("That name is already taken.");
  }

  const { accessToken, repo } = auth;
  try {
    // These each result in a commit -- it would be better to write them all at once.
    await write(
      accessToken,
      repo,
      pdfFilename,
      pdf,
      pdfFile ? pdfFile.sha : undefined,
    );
    await write(
      accessToken,
      repo,
      filename,
      b64EncodeUnicode(code),
      file ? file.sha : undefined,
    );
  } catch (err) {
    console.log(err);
    if (err instanceof Conflict) {
      if (overwrite) {
        throw new Error(
          "Could not save file. " +
            "You may need to wait a minute or so after publishing before publishing again.",
        );
      } else {
        throw new Error("This name is already taken.");
      }
    } else if (err instanceof FileNotFound) {
      // This is probably actually an authentication issue.
      // Let the caller deal with daat.
      throw err;
    } else {
      throw new Error("Could not save file.");
    }
  }

  return true;
}

export async function doUnpublish(
  auth: Auth,
  filename: string,
  _rpc: RPCClient,
): Promise<boolean> {
  const pdfFilename: string = filename.replace(/\.ly$/, ".pdf");

  const files: File[] = await ls(auth.accessToken, auth.repo);
  const file: File | undefined = files.find(
    (candidate: File) => candidate.path === filename,
  );
  const pdfFile: File | undefined = files.find(
    (candidate: File) => candidate.path === pdfFilename,
  );

  const { accessToken, repo } = auth;
  try {
    // These each result in a commit -- it would be better to write them all at once.
    if (pdfFile) {
      await rm(accessToken, repo, pdfFilename, pdfFile.sha);
    }
    if (file) {
      await rm(accessToken, repo, filename, file.sha);
    }
  } catch (err) {
    console.log(err);
    if (err instanceof Conflict) {
      alert("Could not delete file.");

      return false;
    }

    alert("Could not delete file.");

    return false;
  }

  return true;
}

export default ModalPublish;
