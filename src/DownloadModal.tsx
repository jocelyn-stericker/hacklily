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

import { css } from "aphrodite";
import React from "react";
import { FormattedMessage, InjectedIntl, injectIntl } from "react-intl";
import ReactModal from "react-modal";

import { BUTTON_STYLE, MODAL_STYLE } from "./styles";

interface Props {
  loading: boolean;
  intl: InjectedIntl;
  songURL: string | null;
  onExportLy(): any;
  onExportMIDI(): any;
  onExportPDF(): any;

  onHide(): void;
}

/**
 * Options for downloading a song.
 */
class DownloadModal extends React.PureComponent<Props> {
  render(): JSX.Element {
    const {
      loading,
      onHide,
      onExportLy,
      onExportMIDI,
      onExportPDF,
      songURL,
      intl: { formatMessage },
    } = this.props;

    return (
      <ReactModal
        className={css(MODAL_STYLE.modal)}
        contentLabel={formatMessage({
          id: "DownloadModal.title",
          defaultMessage: "Download or Export",
        })}
        isOpen={true}
        onRequestClose={onHide}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            <FormattedMessage
              id="DownloadModal.title"
              defaultMessage="Download or Export"
            />
            <button
              aria-label={formatMessage({
                id: "DownloadModal.back",
                defaultMessage: "Back to song",
              })}
              onClick={onHide}
              className={css(MODAL_STYLE.closeButton)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </button>
          </div>
          {loading && (
            <i className="fa fa-spinner fa-spin" aria-hidden={true} />
          )}
          {!loading && (
            <div className={css(MODAL_STYLE.modalBody)}>
              <div>
                <a
                  href="javascript:void(0)"
                  onClick={onExportLy}
                  className={css(
                    BUTTON_STYLE.buttonStyle,
                    BUTTON_STYLE.downloadChoiceButton,
                  )}
                >
                  <i className="fa fa-download" />{" "}
                  <FormattedMessage
                    id="DownloadModal.ly"
                    defaultMessage="Download LilyPond file"
                  />
                </a>
              </div>
              <div>
                <a
                  href="javascript:void(0)"
                  onClick={onExportPDF}
                  className={css(
                    BUTTON_STYLE.buttonStyle,
                    BUTTON_STYLE.downloadChoiceButton,
                  )}
                >
                  <i className="fa fa-file-pdf-o" />{" "}
                  <FormattedMessage
                    id="DownloadModal.pdf"
                    defaultMessage="Export PDF"
                  />
                </a>
              </div>
              <div>
                <a
                  href="javascript:void(0)"
                  onClick={onExportMIDI}
                  className={css(
                    BUTTON_STYLE.buttonStyle,
                    BUTTON_STYLE.downloadChoiceButton,
                  )}
                >
                  <i className="fa fa-music" />{" "}
                  <FormattedMessage
                    id="DownloadModal.midi"
                    defaultMessage="Export MIDI"
                  />
                </a>
              </div>
              {songURL && (
                <div>
                  <a
                    href={songURL.replace(/\.ly$/, ".pdf")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css(
                      BUTTON_STYLE.buttonStyle,
                      BUTTON_STYLE.downloadChoiceButton,
                    )}
                  >
                    <i className="fa fa-github" />{" "}
                    <FormattedMessage
                      id="DownloadModal.gh"
                      defaultMessage="View on GitHub"
                    />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </ReactModal>
    );
  }
}

export default injectIntl(DownloadModal);
