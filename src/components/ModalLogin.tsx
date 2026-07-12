/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
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

import React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { CLIENT_ID, getOauthRedirect } from "#/lib/auth";
import { cn } from "#/lib/utils";

interface Props {
  csrf: string;
  onHide(): void;
  setCSRF(csrf: string): void;
}

/**
 * Login modal that explains the privacy of Hacklily and redirects the user to
 * the GitHub OAauth flow.
 *
 * Renders when you click login from the menu, or press "New Song" / "Save"
 * while not logged in.
 *
 * Sets a new CSRF for the app before rendering. The CSRF is used throughout the
 * OAuth flow.
 *
 * The user is redirected back to the app after the flow. <App /> then calls
 * checkLogin, below, to set localStorage.
 */
export default class ModalLogin extends React.PureComponent<Props> {
  componentDidMount(): void {
    const randomContainer = new Uint32Array(1);
    crypto.getRandomValues(randomContainer);
    const csrf: string = randomContainer[0].toString();

    this.props.setCSRF(csrf);
  }

  render(): JSX.Element {
    const { csrf, onHide } = this.props;

    if (!CLIENT_ID) {
      return (
        <Dialog open={true} onOpenChange={(open) => !open && onHide()}>
          <DialogContent>
            <div>
              GitHub integration is not enabled in this copy of Hacklily since
              the <code>REACT_APP_GITHUB_CLIENT_ID</code> environment variable
              was not set when bundling the application.
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog open={true} onOpenChange={(open) => !open && onHide()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to continue</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-lg leading-relaxed">
              <strong>
                Hacklily is the home for beautiful sheet music. It&apos;s 100%
                free.
              </strong>{" "}
              Sign in now to manage your sheet music library.
            </p>
            <p className="leading-relaxed">
              Save songs to your Hacklily library to access them anywhere and
              share them with others.
            </p>
            <p className="leading-relaxed">
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
            <div className="mt-4 w-full text-center">
              <a href={getOauthRedirect(csrf)}>
                <button className="bg-[#2a2a2a] bg-[url('./github.svg')] bg-[length:2em] bg-[position:1em] bg-no-repeat border-none rounded-[0.5em] text-white cursor-pointer text-[1em] h-[4em] leading-[1em] px-[2em] pl-[4em] no-underline transition-all duration-500 w-[262px] hover:bg-[#444444] active:bg-[#101010]">
                  Continue with GitHub
                </button>
              </a>
            </div>
            <p className={cn("text-muted-foreground", "mt-4 -mb-4")}>
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
        </DialogContent>
      </Dialog>
    );
  }
}
