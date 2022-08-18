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
import {
  UprightInverted,
  Notations,
  NormalAngledSquare,
  AboveBelow,
} from "musicxml-interfaces";
import { Component, ReactElement } from "react";
import * as PropTypes from "prop-types";
import { forEach } from "lodash";
import invariant from "invariant";

import Bezier from "./private_views_bezier";
import Glyph from "./private_views_glyph";
import { bboxes } from "./private_smufl";

import Articulation from "./implChord_articulationView";
import { IChordLayout } from "./implChord_chordModel";

import { technicalGlyph } from "./implChord_notation";

export interface IProps {
  spec: Notations;
  layout?: IChordLayout;
  defaultY?: number;
}

/**
 * Notations are things that are attached to notes.
 */
export default class NotationView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number,
  } as any;

  context: {
    originY: number;
  };

  render() {
    const model = this.props.spec;
    const nlayout = this.props.layout;
    const notehead = nlayout ? nlayout.model.noteheadGlyph[0] : "noteheadBlack";
    const bbox = bboxes[notehead];
    const noteheadCenter = (10 * (bbox[0] - bbox[2])) / 2;
    const originX = nlayout ? nlayout.model[0].defaultX + noteheadCenter : 0;
    const children: ReactElement<any>[] = [];

    forEach(model.accidentalMarks, (_accidentalMark) => {
      // TODO
    });

    forEach(model.arpeggiates, (_arpeggiate) => {
      // TODO
    });

    forEach(model.articulations, (articulation, idx) => {
      children.push(
        <Articulation
          articulation={articulation}
          key={`art${idx}`}
          defaultX={nlayout ? nlayout.model[0].defaultX : 0}
        />,
      );
    });

    forEach(model.dynamics, (_dynamic) => {
      // TODO
    });

    forEach(model.fermatas, (fermata, idx) => {
      const direction =
        fermata.type === UprightInverted.Inverted ? "Below" : "Above";
      let shape;
      switch (fermata.shape) {
        case NormalAngledSquare.Angled:
          shape = "fermataShort";
          break;
        case NormalAngledSquare.Square:
          shape = "fermataLong";
          break;
        case NormalAngledSquare.Normal:
        default:
          shape = "fermata";
          break;
      }
      children.push(
        <Glyph
          fill="black"
          glyphName={`${shape}${direction}`}
          key={`fer${idx}`}
          x={originX + fermata.defaultX + (fermata.relativeX || 0)}
          y={
            (this.context.originY || 0) -
            fermata.defaultY -
            (fermata.relativeY || 0)
          }
        />,
      );
    });

    forEach(model.glissandos, (_glissando) => {
      // TODO
    });

    forEach(model.nonArpeggiates, (_nonArpeggiate) => {
      // TODO
    });

    forEach(model.ornaments, (_ornament) => {
      // TODO
    });

    forEach(model.slides, (_slide) => {
      // TODO
    });

    forEach(model.slurs, (_slur) => {
      // TODO
    });

    forEach(model.technicals, (technical, idx) => {
      const t =
        technical.arrow ||
        technical.bend ||
        technical.doubleTongue ||
        technical.downBow ||
        technical.fingering ||
        technical.fingernails ||
        technical.fret ||
        technical.hammerOn ||
        technical.handbell ||
        technical.harmonic ||
        technical.heel ||
        technical.hole ||
        technical.openString ||
        technical.pluck ||
        technical.pullOff ||
        technical.snapPizzicato ||
        technical.stopped ||
        technical.string ||
        technical.tap ||
        technical.thumbPosition ||
        technical.toe ||
        technical.tripleTongue ||
        technical.upBow;

      children.push(
        <Glyph
          fill={t.color || "black"}
          glyphName={technicalGlyph(
            technical,
            !("placement" in t) || t.placement === AboveBelow.Below
              ? "Below"
              : "Above",
          )}
          key={`tech${idx}`}
          x={
            originX +
            (("defaultX" in t ? t.defaultX : 0) || 0) +
            (("relativeX" in t ? t.relativeX : 0) || 0)
          }
          y={
            (this.context.originY || 0) -
            ("defaultY" in t ? t.defaultY : 0) -
            (("relativeY" in t ? t.relativeY : 0) || 0)
          }
        />,
      );
    });

    forEach(model.tieds, (tied) => {
      const tieTo: IChordLayout = (tied as any).satieTieTo;
      if (!tieTo) {
        return;
      }

      const bbox2 = bboxes[notehead];
      const noteheadCenter2 = (10 * (bbox2[0] - bbox2[2])) / 2;
      const offset2 = noteheadCenter2 - noteheadCenter - 4;
      const defaultY = (this.context.originY || 0) - (this.props.defaultY || 0);

      const stem1 = this.props.layout.satieStem;
      const stem2 = tieTo.satieStem;
      let dir = -1;
      if (stem1 && stem2 && stem1.direction === stem2.direction) {
        dir = -stem1.direction;
      } else if (stem1) {
        dir = -stem1.direction;
      } else if (stem2) {
        dir = -stem2.direction;
      }

      // This is the correct style only if space permits. See B.B. page 62.
      const x2: number =
        originX - this.props.layout.overrideX + tieTo.x + offset2;
      const x1: number = originX;
      const y2: number = defaultY - (dir === -1 ? -10 : 10);
      const y1: number = defaultY - (dir === -1 ? -10 : 10);

      const x2mx1: number = x2 - x1;
      const x1mx2: number = -x2mx1;
      const relw: number = 3.2; // How "curved" it is
      const y1my2: number = y1 - y2;
      let absw: number = (-dir * 8.321228) / Math.max(1, Math.abs(y1my2));
      if ((y1my2 > 0 ? -1 : 1) * dir === 1) {
        absw = absw * 2;
      }

      invariant(!isNaN(x2), "Invalid x2 %s", x2);
      invariant(!isNaN(x1), "Invalid x1 %s", x1);
      invariant(!isNaN(y2), "Invalid y2 %s", y2);
      invariant(!isNaN(y1), "Invalid y1 %s", y1);
      invariant(!isNaN(dir), "Invalid dir %s", dir);
      invariant(!isNaN(x2mx1), "Invalid x2mx1 %s", x2mx1);
      invariant(!isNaN(x1mx2), "Invalid x1mx2 %s", x1mx2);
      invariant(!isNaN(relw), "Invalid relw %s", relw);
      invariant(!isNaN(y1my2), "Invalid y1my2 %s", y1my2);
      invariant(!isNaN(absw), "Invalid absw %s", absw);

      children.push(
        <Bezier
          fill="#000000"
          stroke="#000000"
          strokeWidth={1.2}
          x1={x2}
          x2={(0.28278198 / 1.23897534) * x1mx2 + x2}
          x3={(0.9561935 / 1.23897534) * x1mx2 + x2}
          x4={x1}
          x5={(0.28278198 / 1.23897534) * x2mx1 + x1}
          x6={(0.95619358 / 1.23897534) * x2mx1 + x1}
          y1={y2}
          y2={(dir === -1 ? y1my2 : 0) + absw + y2}
          y3={(dir === -1 ? y1my2 : 0) + absw + y2}
          y4={y1}
          y5={(dir === -1 ? 0 : -y1my2) + absw + relw + y1}
          y6={(dir === -1 ? 0 : -y1my2) + absw + relw + y1}
        />,
      );
    });

    forEach(model.tuplets, (_tuplet) => {
      // TODO
    });

    switch (children.length) {
      case 0:
        return null;
      case 1:
        return children[0];
      default:
        return <g>{children}</g>;
    }
  }
}
