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

import { MODAL_STYLE } from './styles';

interface Props {
  onHide(): void;
}

/**
 * A 404 modal that is rendered when the 404 query is set.
 *
 * 404.html (which GitHub pages will render for every unmatched URL) redirects to
 * '/?404=1', which renders <App 404="1" />, which results in this modal being shown.
 */
export default class Modal404 extends React.PureComponent<Props, void> {
  render(): JSX.Element {
    return (
      <ReactModal
        className={css(MODAL_STYLE.modal)}
        contentLabel="About Hacklily"
        isOpen={true}
        onRequestClose={this.props.onHide}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            <strong>Page not found (404)</strong>
            <button
              aria-label="Back to song"
              onClick={this.props.onHide}
              className={css(MODAL_STYLE.closeButton)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </button>
          </div>
          <div className={css(MODAL_STYLE.modalBody)}>
            <p style={{ marginTop: 0 }}>
              The requested page may have been moved or deleted.
            </p>
            <p>
              Hacklily is a free online sheet-music editor and publishing tool.
              While you are here, why not{' '}
              <button onClick={this.props.onHide} className={css(MODAL_STYLE.link)}>
                give it a try
              </button>?
            </p>
          </div>
        </div>
      </ReactModal>
    );
  }
}
