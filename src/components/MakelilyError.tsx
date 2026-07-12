/**
 * @license
 * This file is part of Makelily.
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

import { cn } from "../lib/utils";
import makelilyStyles from "./makelilyStyles";
import type { MakelilyToolProps } from "./MakelilyToolProps";

/**
 * Placeholder for when an error was caught.
 */
const ToolError: React.FC<MakelilyToolProps> = () => {
  return (
    <span className={cn(makelilyStyles.tool)}>
      <div className={cn(makelilyStyles.section)}>
        <h3 className={cn(makelilyStyles.toolHeading)}>
          It&apos;s not your fault!
        </h3>
      </div>
      <div className={cn(makelilyStyles.section)}>
        The tool you were using crashed, so it has been closed. Please{" "}
        <a
          href="https://codeberg.org/jocelyn-stericker/hacklily/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          file an issue
        </a>{" "}
        so I can try fixing it.
      </div>
    </span>
  );
};

export default ToolError;
