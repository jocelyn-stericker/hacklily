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
import ReactModal from "react-modal";

import {
  FormattedHTMLMessage,
  FormattedMessage,
  InjectedIntl,
  injectIntl,
} from "react-intl";
import { BUTTON_STYLE, MODAL_STYLE } from "./styles";

interface Props {
  intl: InjectedIntl;
  resolveGitHub(): void;
  resolveLocalStorage(): void;
}

/**
 * This is shown when you load a song that was loaded dirty and has been edited elsewhere.
 */
class ModalConflict extends React.PureComponent<Props> {
  render(): JSX.Element {
    const { intl } = this.props;

    return (
      <ReactModal
        className={css(MODAL_STYLE.modal)}
        contentLabel={intl.formatMessage({
          id: "ModalConflict.sr",
          defaultMessage: "Resolve external changes",
        })}
        isOpen={true}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            <FormattedMessage
              id="ModalConflict.title"
              defaultMessage="Keep unsaved changes?"
            />
          </div>
          <div className={css(MODAL_STYLE.modalBody)}>
            <p style={{ marginTop: 0 }}>
              <FormattedHTMLMessage
                id="ModalConflict.description"
                defaultMessage="<strong>This song was edited outside of this browser.</strong> You can either keep the unsaved version from this browser, or revert to the saved version."
              />
            </p>
            <p>
              <FormattedHTMLMessage
                id="ModalConflict.tip"
                defaultMessage="<strong>Tip: </strong> Next time, save songs before closing Hacklily."
              />
            </p>
            <div style={{ display: "flex", marginBottom: 10 }}>
              <div style={{ flex: 1 }} />
              <div>
                <button
                  onClick={this.props.resolveLocalStorage}
                  className={css(BUTTON_STYLE.buttonStyle)}
                >
                  <FormattedMessage
                    id="ModalConflict.keepUnsaved"
                    defaultMessage="Keep unsaved version"
                  />
                </button>
                <button
                  onClick={this.props.resolveGitHub}
                  className={css(BUTTON_STYLE.buttonStyle)}
                >
                  <FormattedMessage
                    id="ModalConflict.revertToSaved"
                    defaultMessage="Revert to saved version"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ReactModal>
    );
  }
}

export default injectIntl(ModalConflict);
