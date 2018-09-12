/**
 * @license
 * This file is part of Makelily.
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
import React = require("react");

import tabStyles from "./tabStyles";
import { ToolProps } from "./tool";

/**
 * Placeholder for when an error was caught.
 */
export default class ToolError extends React.Component<ToolProps> {
  render(): JSX.Element {
    return (
      <span className={css(tabStyles.tool)}>
        <div className={css(tabStyles.section)}>
          <h3 className={css(tabStyles.toolHeading)}>It's not your fault*!</h3>
        </div>
        <div className={css(tabStyles.section)}>
          The tool you were using crashed, so it has been closed. Please{" "}
          <a
            href="https://github.com/hacklily/makelily/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            file an issue
          </a>{" "}
          so I can try fixing it.
        </div>
        <div className={css(tabStyles.section)}>
          *if you are Joshua, it is probably your fault.
        </div>
      </span>
    );
  }
}
