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

import { Classes, Dialog } from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

import { CLIENT_ID, getOauthRedirect } from "./auth";

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
        <Dialog isOpen={true} onClose={onHide}>
          <div className={Classes.DIALOG_BODY}>
            GitHub integration is not enabled in this copy of Hacklily since the{" "}
            <code>REACT_APP_GITHUB_CLIENT_ID</code> environment variable was not
            set when bundling the application.
          </div>
        </Dialog>
      );
    }

    return (
      <Dialog
        icon="log-in"
        title="Sign in to continue"
        isOpen={true}
        onClose={onHide}
      >
        <div className={Classes.DIALOG_BODY}>
          <p className={Classes.TEXT_LARGE + " " + Classes.RUNNING_TEXT}>
            <strong>
              Hacklily is the home for beautiful sheet music. It's 100% free.
            </strong>{" "}
            Sign in now to manage your sheet music library.
          </p>
          <p className={Classes.RUNNING_TEXT}>
            Save songs to your Hacklily library to access them anywhere and
            share them with others.
          </p>
          <p className={Classes.RUNNING_TEXT}>
            Songs you save will be <strong>public</strong> on GitHub and
            Hacklily. If you do not have a{" "}
            <a
              href="https://help.github.com/articles/github-glossary/#repository"
              target="_blank"
              rel="noopener noreferrer"
            >
              repo
            </a>{" "}
            named <strong>sheet-music</strong>, Hacklily will create one.
          </p>
          <div className={css(styles.btnGithubWrapper)}>
            <a href={getOauthRedirect(csrf)}>
              <button className={css(styles.btnGithub)}>
                Continue with GitHub
              </button>
            </a>
          </div>
          <p className={Classes.TEXT_MUTED + " " + css(styles.finePrint)}>
            Only save songs you want to share. See the{" "}
            <a
              href="privacy-statement.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              privacy statement
            </a>{" "}
            and{" "}
            <a href="dmca.html" target="_blank" rel="noopener noreferrer">
              DMCA policy
            </a>
            .
          </p>
        </div>
      </Dialog>
    );
  }
}

const styles = StyleSheet.create({
  btnGithubWrapper: {
    marginTop: 16,
    width: "100%",
    textAlign: "center",
  },
  btnGithub: {
    ":active": {
      backgroundColor: "#101010",
    },
    ":hover": {
      backgroundColor: "#444444",
    },
    backgroundColor: "#2a2a2a",
    backgroundImage: "url('./github.svg')",
    backgroundPosition: "1em",
    backgroundRepeat: "no-repeat",
    backgroundSize: "2em",
    border: "none",
    borderRadius: "0.5em",
    color: "white",
    cursor: "pointer",
    fontSize: "1em",
    height: "4em",
    lineHeight: "1em",
    padding: "0 2em 0 4em",
    textDecoration: "none",
    transition: "all 0.5s",
    width: 262,
  },
  finePrint: { marginTop: 16, marginBottom: -16 },
});
