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
 * The About dialog, accessible through the menu in the header.
 */
class ModalAbout extends React.PureComponent<Props, void> {
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
            About Hacklily
            <button
              aria-label="Back to song"
              onClick={this.props.onHide}
              className={css(MODAL_STYLE.closeButton)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </button>
        </div>
        <div className={css(MODAL_STYLE.modalBody)}>
          <div>
            <strong>
              Hacklily is an online sheet-music editor and publishing tool.
            </strong>
            <p>
              It is powered by{' '}
              {/*tslint:disable:no-http-string because of silly lilypond*/}
              <a href="http://lilypond.org/" target="_blank" rel="noopener noreferrer">LilyPond</a>.
              New to LilyPond? Take a look at the{' '}
              <a
                href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
                rel="noopener noreferrer"
                target="_blank"
              >
                tutorial
              </a>!
              {/*tslint:enable:no-http-string becuase of silly lilypond*/}
            </p>
            <p>
              This project is open-source.
              Please{' '}
              <a
                href="https://github.com/hacklily/hacklily"
                target="_blank"
                rel="noopener noreferrer"
              >
                contribute on GitHub
              </a>!
            </p>
          </div>
          <div className={css(MODAL_STYLE.license)}>
            <p>
              {/* index.html contains the jslicense1 rel for scrapers */}
                See also the{' '}
                <a href="about-javascript.html">
                  license statements
                  <span className={css(MODAL_STYLE.gpl)}>
                  <img
                    src="gplv3-127x51.png"
                    alt="Licensed under the GNU General Public License version 3"
                  />
                </span>
                </a>,{' '}
                <a href="dmca.html">
                  DMCA info
                </a>, and{' '}
                <a href="privacy-statement.html">
                  privacy statement
                </a>.
                <br />
                &copy; Copyright{' '}
                <a href="https://nettek.ca" target="_blank" rel="noopener noreferrer">
                  Joshua Netterfield
                </a> 2017 - present. 🇨🇦
            </p>
          </div>
        </div>
        </div>
      </ReactModal>
    );
  }
}

export default ModalAbout;
