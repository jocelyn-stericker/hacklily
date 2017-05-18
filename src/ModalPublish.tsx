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

import { Conflict, File, ls, rm, write } from './gitfs';
import { Auth } from './ModalLogin';
import ModalSaving from './ModalSaving';
import RPCClient from './RPCClient';
import { BUTTON_STYLE, MODAL_STYLE, PUBLISH_STYLE } from './styles';

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
  saving: boolean;
}

/**
 * This is the modal you see when you try to save an untitled file.
 * It asks you for a name.
 */
class ModalPublish extends React.PureComponent<Props, State> {
  state: State = {
    filename: '',
    files: null,
    saving: false,
  };

  componentDidMount(): void {
    this.loadExistingSongs();
  }

  render(): JSX.Element {
    const { auth, onHide } = this.props;
    const { filename, files, saving } = this.state;

    if (saving) {
      return <ModalSaving />;
    }

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
            <button
              aria-label="Back to song"
              onClick={onHide}
              className={css(MODAL_STYLE.closeButton)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </button>
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
                onChange={this.handleChange}
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
                <i className="fa fa-save" aria-hidden={true} />{' '}
                Save / share
              </button>
            </div>
          </div>
        </div>
      </ReactModal>
    );
  }

  private handleChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
    const filename: string = ev.target.value.replace(/[^a-zA-Z0-9_-]*/g, '');
    this.setState({
      filename,
    });
  }

  private handleSave = async (): Promise<void> => {
    let didFail: boolean = false;
    try {
      this.setState({
        saving: true,
      });
      const { code, auth, rpc } = this.props;
      const { filename } = this.state;
      await publish(code, auth, `${filename}.ly`, rpc, false);
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.log(err);
      didFail = true;
    } finally {
      this.setState({
        saving: false,
      });
      if (!didFail) {
        this.props.onPublished(`${this.props.auth.repo}/${this.state.filename}.ly`);
      }
    }
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

}

function b64EncodeUnicode(str: string): string {
  // first we use encodeURIComponent to get percent-encoded UTF-8,
  // then we convert the percent encodings into raw bytes which
  // can be fed into btoa.
  return btoa(
    encodeURIComponent(str).replace(
      /%([0-9A-F]{2})/g,
      (match: string, p1: string) => String.fromCharCode(+(`0x${p1}`)),
    ),
  );
}

export async function publish(
  code: string,
  auth: Auth,
  filename: string,
  rpc: RPCClient,
  overwrite: boolean,
): Promise<boolean> {
  const pdf: string = (await rpc.call('render', {
    backend: 'pdf',
    src: code,
  })).result.files[0];

  const pdfFilename: string = filename.replace(/\.ly$/, '.pdf');

  const files: File[] = await ls(auth.accessToken, auth.repo);
  const file: File | undefined = files.find((candidate: File) =>
    candidate.path === filename);
  const pdfFile: File | undefined = files.find((candidate: File) =>
    candidate.path === pdfFilename);

  if (!overwrite && (file || pdfFile)) {
    alert('That name is already taken.');

    return false;
  }

  const { accessToken, repo } = auth;
  try {
    // These each result in a commit -- it would be better to write them all at once.
    await write(accessToken, repo, pdfFilename, pdf, pdfFile ? pdfFile.sha : undefined , 'master');
    await write(accessToken, repo, filename, b64EncodeUnicode(code),
                file ? file.sha : undefined, 'master');
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.log(err);
    if (err instanceof Conflict) {
      if (overwrite) {
        alert(
          'Could not save file. ' +
          'You may need to wait a minute or so after publishing before publishing again.',
        );

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

export async function unpublish(
  auth: Auth,
  filename: string,
  rpc: RPCClient,
): Promise<boolean> {

  const pdfFilename: string = filename.replace(/\.ly$/, '.pdf');

  const files: File[] = await ls(auth.accessToken, auth.repo);
  const file: File | undefined = files.find((candidate: File) =>
    candidate.path === filename);
  const pdfFile: File | undefined = files.find((candidate: File) =>
    candidate.path === pdfFilename);

  const { accessToken, repo } = auth;
  try {
    // These each result in a commit -- it would be better to write them all at once.
    if (pdfFile) {
      await rm(accessToken, repo, pdfFilename, pdfFile.sha , 'master');
    }
    if (file) {
      await rm(accessToken, repo, filename, file.sha, 'master');
    }
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.log(err);
    if (err instanceof Conflict) {
      alert('Could not delete file.');

      return false;
    } else {
      alert('Could not delete file.');

      return false;
    }
  }

  return true;
}

export default ModalPublish;
