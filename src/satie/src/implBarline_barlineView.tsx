// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { some, map } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import type { ReactElement } from "react";
import { Component } from "react";

import { PartSymbolType } from "#/musicxml-interfaces";

import AttributesView from "./implAttributes_attributesView";
import type { IBarlineLayout } from "./implBarline_barlineModel";
import Line from "./private_views_line";

/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
export default class BarlineView extends Component<
  { layout: IBarlineLayout },
  {}
> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
    systemBottom: PropTypes.number.isRequired,
    systemTop: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
    systemBottom: number;
    systemTop: number;
  };

  render(): ReactElement<any> {
    const originY = this.context.originY;

    const layout = this.props.layout;
    const model = layout.model;

    const x = model.defaultX;
    const y = originY - model.defaultY;

    // TODO: render BarStyleType.Dashed:
    // TODO: render BarStyleType.Dotted:
    // TODO: render BarStyleType.Short:
    // TODO: render BarStyleType.Tick:

    let yTop: number;
    let yBottom: number;
    if (
      (layout.partSymbol && layout.partSymbol.type !== PartSymbolType.None) ||
      (layout.partGroups &&
        some(layout.partGroups, (group) => group.groupBarline))
    ) {
      yTop = this.context.systemTop;
      yBottom = this.context.systemBottom;
    } else {
      yTop = y - layout.height - layout.yOffset;
      yBottom = y + layout.height - layout.yOffset;
    }

    if (model.satieAttributes) {
      model.satieAttributes.overrideX =
        layout.overrideX + model.satieAttribsOffset;
    }

    return (
      <g>
        {map(layout.lineStarts, (start, idx) => (
          <Line
            key={idx}
            stroke={model.barStyle.color}
            strokeWidth={layout.lineWidths[idx]}
            x1={x + start + layout.lineWidths[idx] / 2}
            x2={x + start + layout.lineWidths[idx] / 2}
            y1={yTop}
            y2={yBottom}
          />
        ))}
        {model.satieAttributes && (
          <AttributesView layout={model.satieAttributes} />
        )}
      </g>
    );
  }
}
