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

import Button from "@khanacademy/wonder-blocks-button";
import Tooltip from "@khanacademy/wonder-blocks-tooltip";
import React from "react";

import { LOGS_STYLE } from "./styles";

interface Props {
  loading: boolean;
  logs: string | null;
}

/**
 * Renders a logs button, that when hovered, expands to show the output from Lilypond.
 *
 * This is visible in the app whenever the preview is visible.
 */
export default class Logs extends React.Component<Props> {
  render(): JSX.Element | null {
    const { logs, loading } = this.props;

    const error = !logs || logs.includes("error") || logs.includes("warning");

    const btn = (
      <Button
        spinner={loading}
        kind="secondary"
        color={error ? "destructive" : "default"}
        style={LOGS_STYLE.logsButton}
      >
        <i
          className={error ? "fa fa-warning fa-fw" : "fa fa-file-o fa-fw"}
          aria-hidden={true}
        />
        &nbsp; Logs
      </Button>
    );

    if (loading || !logs) {
      return btn;
    }

    return (
      <Tooltip
        content={
          <pre
            style={{
              paddingLeft: 16,
              paddingRight: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {logs}
          </pre>
        }
      >
        {btn}
      </Tooltip>
    );
  }
}
