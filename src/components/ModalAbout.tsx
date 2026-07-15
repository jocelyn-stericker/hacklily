// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

interface Props {
  onHide(): void;
}

/**
 * The About dialog, accessible through the menu in the header.
 */
const ModalAbout: React.FC<Props> = React.memo(function ModalAbout(props) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && props.onHide()}>
      <DialogContent className="sm:max-w-[565px]">
        <DialogHeader>
          <DialogTitle>About Hacklily</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p>
            Hacklily is an online sheet-music editor and publishing tool. It is
            powered by{" "}
            <a
              className="underline cursor-pointer text-blue-500"
              href="http://lilypond.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LilyPond
            </a>
            . New to LilyPond? Take a look at the{" "}
            <a
              className="underline cursor-pointer text-blue-500"
              href={`http://lilypond.org/doc/v${
                process.env.REACT_APP_STABLE_LILYPOND_VERSION?.split(".")
                  .slice(0, 2)
                  .join(".") ?? "2.26"
              }/Documentation/learning/tutorial`}
              rel="noopener noreferrer"
              target="_blank"
            >
              tutorial
            </a>
            !
          </p>
          <p>
            You can view Hacklily&apos;s source and contribute code on{" "}
            <a
              className="underline cursor-pointer text-blue-500"
              href="https://codeberg.org/jocelyn-stericker/hacklily"
              target="_blank"
              rel="noopener noreferrer"
            >
              Codeberg
            </a>
            .
          </p>
          <p>
            Hacklily counts anonymous, cookieless usage stats with{" "}
            <a
              className="underline cursor-pointer text-blue-500"
              href="https://www.goatcounter.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              GoatCounter
            </a>{" "}
            to see which features get used &mdash; nothing that identifies you.
            You can see the numbers for yourself at{" "}
            <a
              href="https://stats.hacklily.org"
              target="_blank"
              className="underline cursor-pointer text-blue-500"
              rel="noopener noreferrer"
            >
              stats.hacklily.org
            </a>
            .
          </p>
          {renderLilyPondVersions()}
          <div
            className="text-xs text-muted-foreground flex flex-col gap-2"
            style={{ position: "relative" }}
          >
            <p>
              This project is{" "}
              <a
                className="underline cursor-pointer text-blue-500"
                href="https://www.fsf.org/about/what-is-free-software"
              >
                free software
              </a>
              : you can redistribute it and/or modify it under the terms of the
              GNU Affero General Public License (GNU AGPL) as published by the
              Free Software Foundation, either version 3 of the License, or (at
              your option) any later version. The code is distributed WITHOUT
              ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
              or FITNESS FOR A PARTICULAR PURPOSE. See the GNU AGPL for more
              details.
            </p>
            <p>
              <a
                className="underline cursor-pointer text-blue-500"
                href="https://www.gnu.org/licenses/agpl-3.0.html"
              >
                Read the GNU Affero General Public License version 3.
                <span className="absolute bottom-0 right-0 max-[530px]:hidden">
                  <img
                    src="agplv3-155x51.png"
                    alt="Licensed under the GNU Affero General Public License version 3"
                  />
                </span>
              </a>
            </p>
            <p>
              See{" "}
              <a
                className="underline cursor-pointer text-blue-500"
                href="privacy-statement.html"
              >
                privacy statement
              </a>
              .
            </p>
            <p>
              &copy; Copyright{" "}
              <a
                className="underline cursor-pointer text-blue-500"
                href="https://nettek.ca"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jocelyn Stericker
              </a>{" "}
              2017 - present. 🇨🇦
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={props.onHide} variant="outline">
            Close
          </Button>
          <Button
            variant="default"
            onClick={() =>
              window.open(
                `http://lilypond.org/doc/v${
                  process.env.REACT_APP_STABLE_LILYPOND_VERSION?.split(".")
                    .slice(0, 2)
                    .join(".") ?? "2.26"
                }/Documentation/learning/tutorial`,
                "_blank",
                "noopener noreferrer",
              )
            }
          >
            Start Tutorial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

function renderLilyPondVersions(): JSX.Element | null {
  const stable: string | undefined =
    process.env.REACT_APP_STABLE_LILYPOND_VERSION;
  const unstable: string | undefined =
    process.env.REACT_APP_UNSTABLE_LILYPOND_VERSION;
  if (!stable && !unstable) {
    return null;
  }
  return (
    <p>
      LilyPond renderer versions:{" "}
      {stable && (
        <span>
          stable <strong>{stable}</strong>
        </span>
      )}
      {stable && unstable && " · "}
      {unstable && (
        <span>
          unstable <strong>{unstable}</strong>
        </span>
      )}
    </p>
  );
}

export default ModalAbout;
