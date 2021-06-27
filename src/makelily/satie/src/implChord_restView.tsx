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
import { MultipleRest, Note } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { map } from "lodash";
import invariant from "invariant";

import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";
import { bboxes } from "./private_smufl";

export interface IProps {
  multipleRest?: MultipleRest;
  notehead?: string;
  spec: Note;
}

/**
 * Renders a rest.
 */
export default class Rest extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    if (spec.printObject === false) {
      return null;
    }
    const rest = spec.rest;
    invariant(!!spec.rest, "Attempting to render a non-rest with Rest");
    const notehead = this.props.notehead;

    const x = spec.defaultX + (spec.relativeX || 0);
    const y = this.context.originY - (spec.defaultY + (spec.relativeY || 0));
    const dotOffset = bboxes[notehead][0] * 10 + 6;

    return (
      <g>
        <Glyph fill={spec.color} glyphName={notehead} key="R" x={x} y={y} />
        {rest.measure && this.props.multipleRest && (
          <text
            className="mmn_"
            fontWeight="bold"
            fontSize={48}
            textAnchor="middle"
            x={x + (bboxes[notehead][0] * 10) / 2}
            y={y - 30}
          >
            {this.props.multipleRest.count} /*TODO: useSymbols*/
          </text>
        )}
        {spec.dots && spec.printDot !== false
          ? map(spec.dots, (dot, idx) => (
              <Dot
                fill={dot.color}
                key={idx + "d"}
                radius={2.4}
                x={x + dotOffset + 6 * idx}
                y={y - (dot.defaultY + (dot.relativeY || 0))}
                // y: y + (line - 3)*10 + (((line * 2) % 2) ? 0 : 5)
              />
            ))
          : null}
      </g>
    );
  }
}
