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

import {
  AnchorButton,
  Button,
  Classes,
  Dialog,
  Intent,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

interface Props {
  onHide(): void;
}

/**
 * The About dialog, accessible through the menu in the header.
 */
class ModalAbout extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog
        icon="info-sign"
        isOpen={true}
        onClose={this.props.onHide}
        title="About Hacklily"
        className={css(styles.modal)}
      >
        <div className={Classes.DIALOG_BODY}>
          <p className={Classes.TEXT_LARGE}>
            <strong>
              Hacklily is an online sheet-music editor and publishing tool.
            </strong>
          </p>
          <p>
            It is powered by{" "}
            <a
              href="http://lilypond.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LilyPond
            </a>
            . New to LilyPond? Take a look at the{" "}
            <a
              href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
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
              href="https://github.com/hacklily/hacklily"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
          <div
            className={`${Classes.TEXT_SMALL} ${Classes.TEXT_MUTED}`}
            style={{ position: "relative" }}
          >
            <p>
              This project is{" "}
              <a href="https://www.fsf.org/about/what-is-free-software">
                free software
              </a>
              : you can redistribute it and/or modify it under the terms of the
              GNU General Public License (GNU GPL) as published by the Free
              Software Foundation, either version 3 of the License, or (at your
              option) any later version. The code is distributed WITHOUT ANY
              WARRANTY; without even the implied warranty of MERCHANTABILITY or
              FITNESS FOR A PARTICULAR PURPOSE. See the GNU GPL for more
              details.
            </p>
            <p>
              <a href="https://www.gnu.org/licenses/gpl-3.0.html">
                Read the GNU General Public License version 3.
                <span className={css(styles.gpl)}>
                  <img
                    src="gplv3-127x51.png"
                    alt="Licensed under the GNU General Public License version 3"
                  />
                </span>
              </a>
            </p>
            <p style={{ marginBottom: 0 }}>
              {/* about-javascript.html contains the jslicense1 rel for scrapers */}
              See{" "}
              <a href="about-javascript.html">additional license statements</a>,{" "}
              <a href="dmca.html">DMCA info</a>, and{" "}
              <a href="privacy-statement.html">privacy statement</a>.
              <br />
              &copy; Copyright{" "}
              <a
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
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={this.props.onHide}>Close</Button>
            <AnchorButton
              href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
              intent={Intent.PRIMARY}
              rel="noopener noreferrer"
              target="_blank"
            >
              Start Tutorial
            </AnchorButton>
          </div>
        </div>
      </Dialog>
    );
  }
}

export default ModalAbout;

const styles = StyleSheet.create({
  modal: {
    width: 565,
  },
  gpl: {
    "@media (max-width: 530px)": {
      display: "none",
    },
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});
