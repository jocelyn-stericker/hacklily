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

import { css } from 'aphrodite';
import React from 'react';

import { BUTTON_STYLE, LOGS_STYLE } from './styles';

interface LogsProps {
  logs: string | null;
}

interface LogsState {
  hover: boolean;
}

export default class Logs extends React.Component<LogsProps, LogsState> {
  state: LogsState = {
    hover: false,
  };

  render(): JSX.Element | null {
    const { logs } = this.props;
    const { hover } = this.state;
    if (!logs) {
      return null;
    }

    if (hover) {
      return (
        <div
          className={css(BUTTON_STYLE.buttonStyle, LOGS_STYLE.logsButton)}
          onMouseLeave={this.handleMouseLeave}
        >
          <pre>
            {logs}
          </pre>
        </div>
      );
    }

    return (
      <div
        className={css(BUTTON_STYLE.buttonStyle, LOGS_STYLE.logsButton)}
        onMouseEnter={this.handleMouseEnter}
      >
        <i className="fa fa-file-o" aria-hidden={true} />{' '}
        Logs
      </div>
    );
  }

  private handleMouseEnter = (): void => {
    this.setState({
      hover: true,
    });
  }

  private handleMouseLeave = (): void => {
    this.setState({
      hover: false,
    });
  }
}
