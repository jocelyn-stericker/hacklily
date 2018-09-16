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

import { MODAL_STYLE } from "./styles";

interface Props {
  intl: InjectedIntl;
}

/**
 * A modal that is rendered while saving a song.
 * There's no escaping this modal. It's visible until saving completes.
 */
class ModalSaving extends React.PureComponent<Props> {
  render(): JSX.Element {
    const { intl } = this.props;

    return (
      <ReactModal
        className={css(MODAL_STYLE.modal)}
        contentLabel={intl.formatDate("Saving...")}
        isOpen={true}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            <FormattedMessage
              id="ModalSaving.saving"
              defaultMessage="Saving, please wait&hellip;"
            />{" "}
            <i className="fa fa-spinner fa-spin" aria-hidden={true} />
          </div>
        </div>
      </ReactModal>
    );
  }
}

export default injectIntl(ModalSaving);
