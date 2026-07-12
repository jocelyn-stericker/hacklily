// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import * as PropTypes from "prop-types";
import type { ReactElement } from "react";
import React, { Component } from "react";

import type { Dynamics, Direction } from "#/musicxml-interfaces";

import Glyph from "./private_views_glyph";

export interface IProps {
  layout: { model: Direction; overrideX?: number };
  key?: string | number;
}

export default class DynamicsView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number,
  };

  declare context: {
    originY: number;
  };

  render(): ReactElement<any> {
    const layout = this.props.layout;
    const model = layout.model;
    const dynamicsContainer = model.directionTypes.filter(
      (dt) => dt.dynamics,
    )[0];
    invariant(!!dynamicsContainer, "No dynamics found!");
    const dynamics =
      typeof dynamicsContainer !== "number" &&
      typeof dynamicsContainer !== "function" &&
      dynamicsContainer.dynamics;

    const initX =
      this.props.layout.overrideX +
      dynamics.defaultX +
      (dynamics.relativeX || 0);
    const initY =
      (this.context.originY || 0) -
      dynamics.defaultY -
      (dynamics.relativeY || 0);

    const glyphName = this.getGlyphName(dynamics);
    if (!glyphName) {
      return null;
    }

    return (
      <Glyph
        fill={dynamics.color || "black"}
        glyphName={glyphName}
        x={initX}
        y={initY}
      />
    );
  }

  getGlyphName(dynamics: Dynamics) {
    /* Not included in MusicXML:

          "dynamicMessaDiVoce": "U+E540",
          "dynamicMezzo": "U+E521",
          "dynamicNiente": "U+E526",
          "dynamicNienteForHairpin": "U+E541",
          "dynamicPF": "U+E52E",
          "dynamicRinforzando": "U+E523",
          "dynamicSforzando": "U+E524",
          "dynamicSforzatoPiano": "U+E53A",
          "dynamicZ": "U+E525",
        */
    switch (true) {
      case dynamics.f:
        return "dynamicForte";
      case dynamics.ff:
        return "dynamicFF";
      case dynamics.fff:
        return "dynamicFFF";
      case dynamics.ffff:
        return "dynamicFFFF";
      case dynamics.fffff:
        return "dynamicFFFFF";
      case dynamics.ffffff:
        return "dynamicFFFFFF";

      case dynamics.fp:
        return "dynamicFortePiano";
      case dynamics.fz:
        return "dynamicForzando";

      case dynamics.mf:
        return "dynamicMF";
      case dynamics.mp:
        return "dynamicMP";

      case dynamics.p:
        return "dynamicPiano";
      case dynamics.pp:
        return "dynamicPP";
      case dynamics.ppp:
        return "dynamicPPP";
      case dynamics.pppp:
        return "dynamicPPPP";
      case dynamics.ppppp:
        return "dynamicPPPPP";
      case dynamics.pppppp:
        return "dynamicPPPPPP";

      case dynamics.rf:
        return "dynamicRinforzando1";
      case dynamics.rfz:
        return "dynamicRinforzando2";

      case dynamics.sf:
        return "dynamicSforzando1";
      case dynamics.sffz:
        return "dynamicSforzatoFF";
      case dynamics.sfp:
        return "dynamicSforzandoPiano";
      case dynamics.sfpp:
        return "dynamicSforzandoPianissimo";
      case dynamics.sfz:
        return "dynamicSforzato";

      default:
        console.warn("Found unknown dynamic!");
        return null;
    }
  }
}
