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
import { CLIENT_ID, getOauthRedirect } from "./auth";
import { GITHUB_STYLE, MODAL_STYLE } from "./styles";

interface Props {
  connectToGitHubReason: string | null;
  csrf: string;
  intl: InjectedIntl;
  onHide(): void;
  setCSRF(csrf: string): void;
}

/**
 * Login modal that explains the privacy of Hacklily and redirects the user to
 * the GitHub OAauth flow.
 *
 * Renders when you click login from the menu, or press "New Song" / "Save / share"
 * while not logged in.
 *
 * Sets a new CSRF for the app before rendering. The CSRF is used throughout the
 * OAuth flow.
 *
 * The user is redirected back to the app after the flow. <App /> then calls
 * checkLogin, below, to set localStorage.
 */
class ModalLogin extends React.PureComponent<Props> {
  componentWillMount(): void {
    const randomContainer: Uint32Array = new Uint32Array(1);
    crypto.getRandomValues(randomContainer);
    const csrf: string = randomContainer[0].toString();

    this.props.setCSRF(csrf);
  }

  render(): JSX.Element {
    const { csrf, onHide, connectToGitHubReason, intl } = this.props;

    if (!CLIENT_ID) {
      return (
        <ReactModal
          isOpen={true}
          onRequestClose={onHide}
          className={css(MODAL_STYLE.modal)}
          contentLabel={intl.formatMessage({
            id: "ModalLogin.title",
            defaultMessage: "Sign in",
          })}
          overlayClassName={css(MODAL_STYLE.overlay)}
        >
          <p>
            GitHub integration is not enabled in this copy of Hacklily since the{" "}
            <code>REACT_APP_GITHUB_CLIENT_ID</code> environment variable was not
            set when bundling the application.
          </p>
        </ReactModal>
      );
    }

    const explanation: React.ReactNode = (
      <span>
        <strong>
          <i className="fa fa-info-circle" aria-hidden="true" />{" "}
          {connectToGitHubReason ||
            intl.formatMessage({
              id: "ModalLogin.defaultReason",
              defaultMessage: "Sign in or create an account",
            })}
        </strong>
      </span>
    );

    return (
      <ReactModal
        isOpen={true}
        onRequestClose={onHide}
        className={css(MODAL_STYLE.modal)}
        contentLabel={intl.formatMessage({
          id: "ModalLogin.title",
          defaultMessage: "Sign in",
        })}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            {explanation}
            <button
              className={css(MODAL_STYLE.closeButton)}
              aria-label={intl.formatMessage({
                id: "ModalLogin.back",
                defaultMessage: "Back to song",
              })}
              onClick={onHide}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </button>
          </div>
          <div className={css(MODAL_STYLE.modalBody)}>
            <p className={css(MODAL_STYLE.signInPrivacy)}>
              <FormattedHTMLMessage
                id="ModalLogin.songsArePublic"
                defaultMessage="Songs you save will be <strong>public</strong> on GitHub and Hacklily."
              />
            </p>
            <p className={css(MODAL_STYLE.signInPrivacy)}>
              <FormattedHTMLMessage
                id="ModalLogin.willCreateRepo"
                values={{
                  repo: (
                    <a
                      href="https://help.github.com/articles/github-glossary/#repository"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FormattedMessage
                        id="ModalLogin.willCreateRepo_repo"
                        defaultMessage="repo"
                      />
                    </a>
                  ),
                }}
                defaultMessage="If you do not have a {repo} named <code>sheet-music</code>, Hacklily will create one."
              />
            </p>
            <p className={css(MODAL_STYLE.login)}>
              <a href={getOauthRedirect(csrf)}>
                <button className={css(GITHUB_STYLE.btnGithub)}>
                  <FormattedMessage
                    id="ModalLogin.continueWithGitHub"
                    defaultMessage="Continue with GitHub"
                  />
                </button>
              </a>
            </p>
            <p className={css(MODAL_STYLE.license)}>
              <FormattedMessage
                id="ModalLogin.licenseInfo"
                values={{
                  privacyStatement: (
                    <a
                      href="privacy-statement.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FormattedMessage
                        id="ModalLogin.licenseInfo_privacy"
                        defaultMessage="privacy statement"
                      />
                    </a>
                  ),
                  dmca: (
                    <a
                      href="dmca.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FormattedMessage
                        id="ModalLogin.licenseInfo_dmca"
                        defaultMessage="DMCA"
                      />
                    </a>
                  ),
                }}
                defaultMessage="Only save songs you want to share. See the {privacyStatement}. {DMCA}"
              />
            </p>
          </div>
        </div>
      </ReactModal>
    );
  }
}

export default injectIntl(ModalLogin);
