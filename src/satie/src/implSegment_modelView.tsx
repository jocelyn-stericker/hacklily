// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import React, { Component } from "react";

import type { ILayout } from "./document";
import { Type } from "./document";
import AttributesView from "./implAttributes_attributesView";
import BarlineView from "./implBarline_barlineView";
import ChordView from "./implChord_chordView";
import DirectionView from "./implDirection_directionView";
import VisualCursorView from "./implVisualCursor_visualCursorView";
import { Targetable } from "./private_views_metadata";

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

export interface IProps {
  layout: ILayout;
  version: number;
  key?: string | number;
  originX: number;
}

export interface IState {}

class ModelView extends Component<IProps, IState> {
  static childContextTypes = {
    originY: PropTypes.number,
  } as any;

  static contextTypes = {
    originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
  } as any;

  declare context: {
    originYByPartAndStaff: { [key: string]: number[] };
  };

  render(): any {
    const layout = this.props.layout as any; // Sigh...
    switch (layout.renderClass) {
      case Type.Attributes:
        return <AttributesView layout={layout} />;
      case Type.Barline:
        return <BarlineView layout={layout} />;
      case Type.Chord:
        return <ChordView layout={layout} />;
      case Type.Direction:
        return <DirectionView layout={layout} />;
      case Type.VisualCursor:
        return <VisualCursorView layout={layout} />;
      default:
        return null;
    }
  }

  getChildContext() {
    const layout = this.props.layout;
    return {
      originY:
        this.context.originYByPartAndStaff[layout.part][
          layout.model.staffIdx || 1
        ] || 0,
    };
  }

  shouldComponentUpdate(nextProps: IProps, _nextState: IState) {
    if (nextProps.version !== this.props.version) {
      return true;
    }

    if (
      this.props.layout.renderClass === Type.Attributes &&
      (this.props.layout as any).staffWidth !==
        (nextProps.layout as any).staffWidth
    ) {
      return true;
    }

    return false;
  }
}

Targetable()(ModelView);

export default ModelView;
