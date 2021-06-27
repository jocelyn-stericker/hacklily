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

import {
  Button,
  Classes,
  Colors,
  ControlGroup,
  Dialog,
  Icon,
  InputGroup,
  Intent,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

import { Auth } from "./auth";
import { Conflict, File, FileNotFound, ls, rm, write } from "./gitfs";
import ModalSaving from "./ModalSaving";
import RPCClient from "./RPCClient";

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
    this.loadExistingSongs();
  }

  render(): JSX.Element {
    // TODO(jocelyn): Split this up
    const { auth, onHide } = this.props;
    const { filename, files, invitationRequired, saving } = this.state;
    let disabled: boolean = false;

    if (saving) {
      return <ModalSaving />;
    }

    let error: React.ReactNode = null;
    if (!filename.length) {
      disabled = true;
      error = (
        <span className={css(styles.error)}>
          <Icon icon="error" /> Please enter a filename.
        </span>
      );
    } else if (
      files &&
      files.map((file: File) => file.path).indexOf(`${filename}.ly`) !== -1
    ) {
      disabled = true;
      error = (
        <span className={css(styles.error)}>
          <Icon icon="error" /> That filename is taken.
        </span>
      );
    } else if (invitationRequired) {
      error = (
        <span className={css(styles.error)}>
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
      <Dialog
        title="Save song"
        isOpen={true}
        onClose={onHide}
        className={css(styles.modal)}
      >
        <div className={Classes.DIALOG_BODY}>
          <ControlGroup>
            <div className={css(styles.prefix)}>
              Save to:&nbsp;
              <code className={Classes.MONOSPACE_TEXT}>
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
            <InputGroup
              value={filename}
              className={css(styles.input)}
              placeholder="filename"
              autoFocus={true}
              onChange={this.handleChange}
              rightElement={
                <div className={css(styles.suffix)}>
                  <code className={Classes.MONOSPACE_TEXT}>&nbsp;.ly</code>
                </div>
              }
            />
          </ControlGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            {error}
            <Button
              onClick={this.handleSave}
              disabled={disabled}
              intent={Intent.PRIMARY}
              icon="floppy-disk"
            >
              Save
            </Button>
          </div>
        </div>
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
    let didFail: boolean = false;
    try {
      this.setState({
        saving: true,
      });
      const { code, auth, rpc } = this.props;
      const { filename } = this.state;
      await doPublish(code, auth, `${filename}.ly`, rpc, false);
    } catch (err) {
      if (err instanceof FileNotFound) {
        didFail = true;
        this.setState({
          invitationRequired: true,
        });

        return;
      }

      console.log(err);
      alert(err.toString());
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
  // Decide whether to use the stable version or not.
  let version: "unstable" | "stable" = "stable";
  const maybeVersion = /\\version\s*"(\d+)\.?(\d+)?\.?(\d+)?/gm.exec(code);
  const versionSlices = maybeVersion
    ? maybeVersion.slice(1).map((v) => parseInt(v, 10))
    : [];
  const isUnstable = versionSlices[0] === 2 && versionSlices[1] > 18;
  version = isUnstable ? "unstable" : "stable";

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

const styles = StyleSheet.create({
  prefix: {
    alignSelf: "center",
    marginRight: 4,
  },
  error: {
    color: Colors.RED1,
    flex: 1,
    alignSelf: "center",
  },
  mono: {
    fontFamily: "monospace",
  },
  modal: {
    width: 565,
  },
  input: {
    fontFamily: "monospace",
    display: "flex",
    flex: 1,
  },
  suffix: {
    height: 30,
    lineHeight: "30px",
    marginRight: 7,
  },
});
