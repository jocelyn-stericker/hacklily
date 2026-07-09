/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from "react";
import { Position, Notehead } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";

import Glyph from "./private_views_glyph";

export interface IProps {
  key?: string | number;
  spec: Notehead | Position;
  notehead: string;
}

/**
 * Renders a notehead.
 */
export default class NoteheadView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    const pos = spec as Position;
    const head = spec as Notehead;

    return (
      <Glyph
        fill={head.color}
        glyphName={this.props.notehead}
        // scale: this.props.grace ? 0.6 : 1.0,
        x={pos.defaultX + (pos.relativeX || 0)}
        y={this.context.originY - pos.defaultY - (pos.relativeY || 0)}
      />
    );
  }
}
