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

import Color from "@khanacademy/wonder-blocks-color";
import { View } from "@khanacademy/wonder-blocks-core";
import Link from "@khanacademy/wonder-blocks-link";
import {
  OneColumnModal,
  TwoColumnModal,
} from "@khanacademy/wonder-blocks-modal";
import Tooltip from "@khanacademy/wonder-blocks-tooltip";
import {
  Body,
  Footnote,
  HeadingSmall,
  Title,
} from "@khanacademy/wonder-blocks-typography";
import { css } from "aphrodite";
import React from "react";

import { CLIENT_ID, getOauthRedirect } from "./auth";
import ModalWrapper from "./ModalWrapper";
import { GITHUB_STYLE } from "./styles";

interface Props {
  csrf: string;
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
export default class ModalLogin extends React.PureComponent<Props> {
  componentWillMount(): void {
    const randomContainer: Uint32Array = new Uint32Array(1);
    crypto.getRandomValues(randomContainer);
    const csrf: string = randomContainer[0].toString();

    this.props.setCSRF(csrf);
  }

  render(): JSX.Element {
    const { csrf, onHide } = this.props;

    if (!CLIENT_ID) {
      return (
        <ModalWrapper onClose={onHide}>
          <OneColumnModal
            content={
              <p>
                GitHub integration is not enabled in this copy of Hacklily since
                the <code>REACT_APP_GITHUB_CLIENT_ID</code> environment variable
                was not set when bundling the application.
              </p>
            }
          />
        </ModalWrapper>
      );
    }

    return (
      <ModalWrapper onClose={onHide}>
        <TwoColumnModal
          fullBleedSidebar={false}
          sidebar={
            <View>
              <Title style={{ marginBottom: 16 }}>
                The home for beautiful sheet music. 100% free.
              </Title>
              <Body style={{ marginBottom: 16 }}>
                Save songs to your Hacklily library to access them anywhere and
                share them with others.
              </Body>
              <Body style={{ color: Color.white64, marginBottom: 16 }}>
                Songs you save will be <strong>public</strong> on GitHub and
                Hacklily. If you do not have a{" "}
                <Link
                  light={true}
                  href="https://help.github.com/articles/github-glossary/#repository"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  repo
                </Link>{" "}
                named <code>sheet-music</code>, Hacklily will create one.
              </Body>
              <Body style={{ color: Color.white64 }}>
                Only save songs you want to share. See the{" "}
                <Link
                  light={true}
                  href="privacy-statement.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  privacy statement
                </Link>{" "}
                and{" "}
                <Link
                  light={true}
                  href="dmca.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DMCA policy
                </Link>
                .
              </Body>
            </View>
          }
          content={
            <div>
              <HeadingSmall style={{ marginTop: 16, marginBottom: 16 }}>
                Sign in now to manage your sheet music library.
              </HeadingSmall>
              <View style={{ marginBottom: 16 }}>
                <Link href={getOauthRedirect(csrf)}>
                  <button className={css(GITHUB_STYLE.btnGithub)}>
                    Continue with GitHub
                  </button>
                </Link>
              </View>
              <Footnote>
                <Tooltip
                  placement="bottom"
                  content="Don't panic — creating a GitHub account is easy! Click 'Continue with GitHub', and then choose 'Create an account'."
                >
                  <Link>No GitHub account?</Link>
                </Tooltip>
              </Footnote>
            </div>
          }
        />
      </ModalWrapper>
    );
  }
}
