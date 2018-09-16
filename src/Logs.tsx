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
import { FormattedMessage } from "react-intl";

import { BUTTON_STYLE, LOGS_STYLE } from "./styles";

interface Props {
  logs: string | null;
}

interface State {
  hover: boolean;
}

/**
 * Renders a logs button, that when hovered, expands to show the output from Lilypond.
 *
 * This is visible in the app whenever the preview is visible.
 */
export default class Logs extends React.Component<Props, State> {
  state: State = {
    hover: false,
  };

  render(): JSX.Element | null {
    const { logs } = this.props;
    const { hover } = this.state;
    if (logs === null) {
      return null;
    }

    if (hover) {
      // The mask is so that on touch devices where onMouseLeave is supported,
      // if the user taps outside of the logs, the logs go away.
      return (
        <div
          className={css(LOGS_STYLE.mask)}
          onClick={this.handleMouseLeave}
          role="presentation"
        >
          <div
            className={css(BUTTON_STYLE.buttonStyle, LOGS_STYLE.logsButton)}
            onMouseLeave={this.handleMouseLeave}
          >
            <pre style={{ whiteSpace: "pre-wrap" }}>{logs}</pre>
          </div>
        </div>
      );
    }

    return (
      <div
        className={css(BUTTON_STYLE.buttonStyle, LOGS_STYLE.logsButton)}
        onClick={this.handleMouseClick}
        onMouseEnter={this.handleMouseEnter}
        role="button"
      >
        <i className="fa fa-file-o" aria-hidden={true} />{" "}
        <FormattedMessage id="Logs.Logs" defaultMessage="Logs" />
      </div>
    );
  }

  private handleMouseClick = (): void => {
    // For touch browsers.
    this.handleMouseEnter();
  };

  private handleMouseEnter = (): void => {
    // HACK: in mobile, for some reason if we do this right away,
    // the mask's click event also goes through.
    setTimeout(() => {
      this.setState({
        hover: true,
      });
    }, 10);
  };

  private handleMouseLeave = (): void => {
    this.setState({
      hover: false,
    });
  };
}
