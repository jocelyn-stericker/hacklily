// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import invariant from "invariant";
import { chain, flatten, mapValues, map, forEach } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { ILayout } from "./document";
import ModelView from "./implSegment_modelView";
import type { IMeasureLayout } from "./private_measureLayout";
import { MAX_SAFE_INTEGER } from "./private_util";

export interface IProps {
  layout: IMeasureLayout;
  key?: string | number;
  version: number;
}

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

export default class MeasureView extends Component<IProps, {}> {
  static childContextTypes = {
    originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
    systemBottom: PropTypes.number.isRequired,
    systemTop: PropTypes.number.isRequired,
  } as any;

  static contextTypes = {
    originY: PropTypes.number,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const layout = this.props.layout;

    return (
      <g transform={`translate(${layout.originX})`}>
        {chain(flatten(layout.elements))
          .filter((layout: ILayout) => !!layout.model) // Remove helpers.
          .map((layout: ILayout) => (
            <ModelView
              key={(layout as any).key}
              version={this.props.layout.getVersion()}
              layout={layout}
              originX={this.props.layout.originX}
            />
          ))
          .value()}
      </g>
    );

    /* TODO: lyric boxes */
    /* TODO: free boxes */
    /* TODO: slurs and ties */
  }

  getChildContext() {
    const { layout } = this.props;
    const originYByPartAndStaff = mapValues(layout.originY, (layouts) =>
      this.extractOrigins(layouts),
    );
    let bottom = MAX_SAFE_INTEGER;
    let top = 0;
    forEach(layout.originY, (origins) => {
      forEach(origins, (origin, staff) => {
        if (!staff) {
          return;
        }
        bottom = Math.min(origin, bottom);
        top = Math.max(origin, top);
      });
    });

    // TODO 1: Fix stave height
    // TODO 2: Do not ignore top/bottom staff in staffGroup of attributes
    // TODO 3: A part can be in many groups.
    return {
      originYByPartAndStaff: originYByPartAndStaff,
      systemBottom: this.context.originY - bottom + 20.5,
      systemTop: this.context.originY - top - 20.5,
    };
  }

  extractOrigins(layouts: number[]) {
    return map(layouts, (layout) => this.invert(layout));
  }

  invert(y: number) {
    return this.context.originY - y;
  }

  shouldComponentUpdate(nextProps: IProps) {
    invariant(
      !isNaN(this.props.version),
      `Invalid non-numeric version ${this.props.version}`,
    );
    return (
      this.props.version !== nextProps.version ||
      this.props.layout.originX !== nextProps.layout.originX ||
      this.props.layout.width !== nextProps.layout.width
    );
  }
}
