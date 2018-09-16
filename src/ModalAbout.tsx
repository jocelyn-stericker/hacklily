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
  onHide(): void;
}

/**
 * The About dialog, accessible through the menu in the header.
 */
class ModalAbout extends React.PureComponent<Props> {
  render(): JSX.Element {
    const { formatMessage } = this.props.intl;

    return (
      <ReactModal
        className={css(MODAL_STYLE.modal)}
        contentLabel={formatMessage({
          id: "ModalAbout.title",
          defaultMessage: "About Hacklily",
        })}
        isOpen={true}
        onRequestClose={this.props.onHide}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            <FormattedMessage
              id="ModalAbout.title"
              defaultMessage="About Hacklily"
            />
            <button
              aria-label={formatMessage({
                id: "ModalAbout.back",
                defaultMessage: "Back to song",
              })}
              onClick={this.props.onHide}
              className={css(MODAL_STYLE.closeButton)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </button>
          </div>
          <div className={css(MODAL_STYLE.modalBody)}>
            <div>
              <strong>
                <FormattedMessage
                  id="ModalAbout.overview"
                  defaultMessage="Hacklily is an online sheet-music editor and publishing tool."
                />
              </strong>
              <p>
                <FormattedMessage
                  id="ModalAbout.poweredByLilypond"
                  defaultMessage="It is powered by {lilypond}."
                  values={{
                    // tslint:disable:no-http-string because of silly lilypond
                    lilypond: (
                      <a
                        href="http://lilypond.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LilyPond
                      </a>
                    ),
                  }}
                />{" "}
                <FormattedMessage
                  id="ModalAbout.tutorialCallout"
                  defaultMessage="New to LilyPond? Take a look at the {tutorial}!"
                  values={{
                    // tslint:disable:no-http-string because of silly lilypond
                    tutorial: (
                      <a
                        href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <FormattedMessage
                          id="ModalAbout.tutorial"
                          defaultMessage="tutorial"
                        />
                      </a>
                    ),
                  }}
                />{" "}
              </p>
              <p>
                <FormattedMessage
                  id="ModalAbout.githubCallout"
                  defaultMessage="You can view Hacklily's source and contribute code on {gitHub}."
                  values={{
                    gitHub: (
                      <a
                        href="https://github.com/hacklily/hacklily"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub
                      </a>
                    ),
                  }}
                />
              </p>
            </div>
            <div className={css(MODAL_STYLE.license)}>
              <p>
                <FormattedMessage
                  id="ModalAbout.freeSoftwareCallout"
                  defaultMessage={
                    "This project is {freeSoftware}: you can redistribute it " +
                    "and/or modify it under the terms of the GNU General Public License (GNU " +
                    "GPL) as published by the Free Software Foundation, either version 3 of the " +
                    "License, or (at your option) any later version. The code is distributed " +
                    "WITHOUT ANY WARRANTY; without even the implied warranty of " +
                    "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU " +
                    "GPL for more details."
                  }
                  values={{
                    freeSoftware: (
                      <a href="https://www.fsf.org/about/what-is-free-software">
                        <FormattedMessage
                          id="ModalAbout.freeSoftwareLink"
                          defaultMessage="free software"
                        />
                      </a>
                    ),
                  }}
                />
              </p>
              <p>
                <a href="https://www.gnu.org/licenses/gpl-3.0.html">
                  <FormattedMessage
                    id="ModalAbout.gplLink"
                    defaultMessage="Read the GNU General Public License version 3."
                  />
                </a>
              </p>
              <p>
                {/* about-javascript.html contains the jslicense1 rel for scrapers */}
                <FormattedMessage
                  id="AboutModal.additionalLegal"
                  defaultMessage="See {additionalLicenseStatements}, {dmcaInfo}, and {privacy}."
                  values={{
                    additionalLicenseStatements: (
                      <a href="about-javascript.html">
                        <FormattedMessage
                          id="AboutModal.additionalLicenseStatements"
                          defaultMessage="additional license statements"
                        />
                        <span className={css(MODAL_STYLE.gpl)}>
                          <img
                            src="gplv3-127x51.png"
                            alt={formatMessage({
                              id: "AboutModal.gplAltText",
                              defaultMessage:
                                "Licensed under the GNU General Public License version 3",
                            })}
                          />
                        </span>
                      </a>
                    ),
                    dmcaInfo: (
                      <a href="dmca.html">
                        <FormattedMessage
                          id="AboutModal.dmca"
                          defaultMessage="DMCA info"
                        />
                      </a>
                    ),
                    privacy: (
                      <a href="privacy-statement.html">
                        <FormattedMessage
                          id="AboutModal.privacy"
                          defaultMessage="privacy statement"
                        />
                      </a>
                    ),
                  }}
                />
                <br />
                <FormattedMessage
                  id="AboutModal.copyright"
                  defaultMessage="&copy; Copyright {author} 2017 - present."
                  values={{
                    author: (
                      <a
                        href="https://nettek.ca"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Joshua Netterfield
                      </a>
                    ),
                  }}
                />{" "}
                🇨🇦
              </p>
            </div>
          </div>
        </div>
      </ReactModal>
    );
  }
}

export default injectIntl(ModalAbout);
