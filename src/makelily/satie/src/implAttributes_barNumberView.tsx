/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from "react";
import { Position } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";

export interface IProps {
  spec: Position;
  barNumber: string;
  key?: string | number;
}

export default class BarNumber extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    return (
      <text
        className="bn_"
        fontSize={24}
        x={spec.defaultX + (spec.relativeX || 0)}
        y={this.context.originY - spec.defaultY - (spec.relativeY || 0)}
      >
        {this.props.barNumber}
      </text>
    );
  }
}
