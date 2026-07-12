// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { map } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { MultipleRest, Note } from "#/musicxml-interfaces";

import { bboxes } from "./private_smufl";
import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";

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

  declare context: {
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
            {this.props.multipleRest.count /*TODO: useSymbols*/}
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
