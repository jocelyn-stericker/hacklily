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

import Link from "@khanacademy/wonder-blocks-link";
import { OneColumnModal } from "@khanacademy/wonder-blocks-modal";
import { Body, Footnote, Tagline } from "@khanacademy/wonder-blocks-typography";
import { css } from "aphrodite";
import React from "react";

import ModalWrapper from "./ModalWrapper";
import { MODAL_STYLE } from "./styles";

interface Props {
  onHide(): void;
}

/**
 * The About dialog, accessible through the menu in the header.
 */
class ModalAbout extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <ModalWrapper onClose={this.props.onHide}>
        <OneColumnModal
          content={
            <Body>
              <Tagline>
                Hacklily is an online sheet-music editor and publishing tool.
              </Tagline>
              <Body tag="p">
                It is powered by{" "}
                {/*tslint:disable:no-http-string because of silly lilypond*/}
                <Link
                  href="http://lilypond.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LilyPond
                </Link>
                . New to LilyPond? Take a look at the{" "}
                <Link
                  href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  tutorial
                </Link>
                !{/*tslint:enable:no-http-string becuase of silly lilypond*/}
              </Body>
              <Body tag="p">
                You can view Hacklily's source and contribute code on{" "}
                <Link
                  href="https://github.com/hacklily/hacklily"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </Link>
                .
              </Body>
              <Footnote style={{ position: "relative" }}>
                <p>
                  This project is{" "}
                  <Link href="https://www.fsf.org/about/what-is-free-software">
                    free software
                  </Link>
                  : you can redistribute it and/or modify it under the terms of
                  the GNU General Public License (GNU GPL) as published by the
                  Free Software Foundation, either version 3 of the License, or
                  (at your option) any later version. The code is distributed
                  WITHOUT ANY WARRANTY; without even the implied warranty of
                  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
                  GNU GPL for more details.
                </p>
                <p>
                  <Link href="https://www.gnu.org/licenses/gpl-3.0.html">
                    Read the GNU General Public License version 3.
                    <span className={css(MODAL_STYLE.gpl)}>
                      <img
                        src="gplv3-127x51.png"
                        alt="Licensed under the GNU General Public License version 3"
                      />
                    </span>
                  </Link>
                </p>
                <p style={{ marginBottom: 0 }}>
                  {/* about-javascript.html contains the jslicense1 rel for scrapers */}
                  See{" "}
                  <Link href="about-javascript.html">
                    additional license statements
                  </Link>
                  , <Link href="dmca.html">DMCA info</Link>, and{" "}
                  <Link href="privacy-statement.html">privacy statement</Link>.
                  <br />
                  &copy; Copyright{" "}
                  <Link
                    href="https://nettek.ca"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Joshua Netterfield
                  </Link>{" "}
                  2017 - present. 🇨🇦
                </p>
              </Footnote>
            </Body>
          }
        />
      </ModalWrapper>
    );
  }
}

export default ModalAbout;
