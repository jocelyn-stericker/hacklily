// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { times } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { StaffDetails } from "#/musicxml-interfaces";

import { bravura } from "./private_smufl";
import Line from "./private_views_line";

export interface IProps {
  key?: string | number;
  width: number;
  staffDetails: StaffDetails;
  defaultX: number;
  defaultY: number;
}

/**
 * Renders the (usually 5) lines that make up a staff.
 */
export default class StaffLines extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const middle = this.context.originY - this.props.defaultY;
    const staffDetails = this.props.staffDetails;
    const offset = (staffDetails.staffLines - 1) / 2;
    return (
      <g>
        {times(staffDetails.staffLines, (i) => (
          <Line
            key={"staff-" + i}
            stroke="#6A6A6A"
            // TODO: Use print
            strokeWidth={bravura.engravingDefaults.staffLineThickness * 10}
            x1={this.props.defaultX}
            x2={this.props.defaultX + this.props.width}
            y1={middle - 10 * (i - offset)}
            y2={middle - 10 * (i - offset)}
          />
        ))}
      </g>
    );
  }
}
