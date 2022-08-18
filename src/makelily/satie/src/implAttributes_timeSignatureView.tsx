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
import { Time, TimeSymbolType } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { map } from "lodash";

import Glyph from "./private_views_glyph";

import { NUMBER_SPACING, PLUS_SPACING } from "./implAttributes_attributesData";

/* private */
class TimeSignatureNumber extends Component<ITSNumProps, {}> {
  render() {
    return (
      <g>
        {map(String(this.props.children).split(""), (numberString, i) => (
          <Glyph
            fill={this.props.stroke}
            glyphName={"timeSig" + numberString}
            key={"ts-" + i}
            x={
              this.props.x +
              i * 12 +
              (numberString === "1"
                ? !i && parseInt(this.props.children, 10) >= 10
                  ? -1
                  : 1
                : 0)
            }
            y={this.props.y}
          />
        ))}
      </g>
    );
  }
}

/**
 * Renders a simple, compound, or common time signature.
 */
export default class TimeSignatureView extends Component<
  { spec: Time; key?: string | number },
  {}
> {
  static contextTypes = {
    originY: PropTypes.number,
  } as any;

  context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    if (spec.senzaMisura != null) {
      return null;
    }
    const ts = this._displayTimeSignature();
    if (ts.singleNumber && ts.beats.length === 1 && ts.beats[0].length === 1) {
      return (
        <TimeSignatureNumber
          stroke={spec.color}
          x={spec.defaultX + (spec.relativeX || 0)}
          y={
            (this.context.originY || 0) -
            (spec.defaultY + (spec.relativeY || 0))
          }
        >
          {String(ts.beats[0])}
        </TimeSignatureNumber>
      );
    }

    if (ts.commonRepresentation) {
      const beats = ts.beats;
      const beatType = ts.beatType;

      const hasSingleBeat = beats.length === 1 && beats[0].length === 1;

      const isCommon = hasSingleBeat && beats[0][0] === 4 && beatType[0] === 4;
      const isCut = hasSingleBeat && beats[0][0] === 2 && beatType[0] === 2;

      if (isCommon) {
        return (
          <Glyph
            fill={spec.color}
            glyphName="timeSigCommon"
            x={spec.defaultX + (spec.relativeX || 0)}
            y={
              (this.context.originY || 0) -
              (spec.defaultY + (spec.relativeY || 0))
            }
          />
        );
      } else if (isCut) {
        return (
          <Glyph
            fill={spec.color}
            glyphName="timeSigCutCommon"
            x={spec.defaultX + (spec.relativeX || 0)}
            y={
              (this.context.originY || 0) -
              (spec.defaultY + (spec.relativeY || 0))
            }
          />
        );
      }
      // Cannot be represented in common representation. Pass through.
    }

    const numOffsets = this.numOffsets();
    const denOffsets = this.denOffsets();

    let pos = 0;
    return (
      <g>
        {map(ts.beats, (beatsOuter, idx) => {
          const array = [
            map(beatsOuter, (beats, jdx) => [
              <TimeSignatureNumber
                key={`num_${idx}_${jdx}`}
                stroke={spec.color}
                x={
                  spec.defaultX +
                  (spec.relativeX || 0) +
                  numOffsets[idx] +
                  pos +
                  jdx * NUMBER_SPACING
                }
                y={
                  (this.context.originY || 0) -
                  (spec.defaultY + (spec.relativeY || 0) + 10)
                }
              >
                {String(beats)}
              </TimeSignatureNumber>,
              jdx + 1 !== beatsOuter.length && (
                <Glyph
                  fill="black"
                  glyphName="timeSigPlusSmall"
                  key={`num_plus_numerator_${idx}_${jdx}`}
                  x={
                    spec.defaultX +
                    (spec.relativeX || 0) +
                    numOffsets[idx] +
                    pos +
                    jdx * NUMBER_SPACING +
                    17
                  }
                  y={
                    (this.context.originY || 0) -
                    spec.defaultY +
                    (spec.relativeY || 0) -
                    10
                  }
                />
              ),
            ]),
            <TimeSignatureNumber
              key="den"
              stroke={spec.color}
              x={spec.defaultX + (spec.relativeX || 0) + denOffsets[idx] + pos}
              y={
                (this.context.originY || 0) -
                (spec.defaultY + (spec.relativeY || 0) - 10)
              }
            >
              {String(ts.beatType[idx])}
            </TimeSignatureNumber>,
            idx + 1 !== ts.beats.length && (
              <Glyph
                fill="black"
                glyphName="timeSigPlus"
                key={`num_plus_${idx}`}
                x={
                  spec.defaultX +
                  (spec.relativeX || 0) +
                  numOffsets[idx] +
                  pos +
                  beatsOuter.length * NUMBER_SPACING -
                  10
                }
                y={
                  (this.context.originY || 0) -
                  spec.defaultY +
                  (spec.relativeY || 0)
                }
              />
            ),
          ];
          pos += beatsOuter.length * NUMBER_SPACING + PLUS_SPACING;
          return array;
        })}
      </g>
    );
  }

  numOffsets() {
    // This is sketchy.
    const ts = this._displayTimeSignature();
    return map(ts.beats, (beats, idx) => {
      if (beats.length > 1) {
        return 0;
      }
      let culm = 0;
      if (beats[0] < 10 && ts.beatType[idx] >= 10) {
        culm += 5;
      }
      return culm;
    });
  }
  denOffsets() {
    // This is sketchy.
    const ts = this._displayTimeSignature();

    return map(ts.beatType, (beatType, idx) => {
      let culm = 0;
      const numToDenOffset = ((ts.beats[idx].length - 1) * NUMBER_SPACING) / 2;
      culm += numToDenOffset;
      if (ts.beats[idx][0] >= 10 && beatType < 10) {
        culm += 7;
      }

      return culm;
    });
  }

  _displayTimeSignature() {
    const spec = this.props.spec;
    return {
      beatType: spec.beatTypes,
      beats: map(spec.beats, (beats) =>
        beats.split("+").map((n) => parseInt(n, 10)),
      ),
      commonRepresentation:
        spec.symbol === TimeSymbolType.Common ||
        spec.symbol === TimeSymbolType.Cut,
      singleNumber: spec.symbol === TimeSymbolType.SingleNumber,
    };
  }
}

/* private */
interface ITSNumProps {
  key?: string | number;
  x: number;
  y: number;
  stroke: string;
  children?: string;
}
