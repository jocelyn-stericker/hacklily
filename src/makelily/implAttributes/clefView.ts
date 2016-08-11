/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Clef, SymbolSize} from "musicxml-interfaces";
import {createFactory, Component, DOM, PropTypes} from "react";

import Glyph from "../private/views/glyph";
import {bboxes} from "../private/smufl";

const $Glyph = createFactory(Glyph);

/**
 * Responsible for the rendering of a clef.
 */
export default class ClefView extends Component<{spec: Clef, key?: string | number}, void> {
    static contextTypes = {
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
    };

    render(): any {
        const spec = this.props.spec;

        if (spec.printObject === false) {
            return null;
        }

        let clefX = spec.defaultX + (spec.relativeX || 0);
        let clefY = this.context.originY - (spec.defaultY + (spec.relativeY || 0) +
            (this.renderedLine() - 3) * 10);
        let clefSign = this.sign();

        if (!clefSign) {
            return null;
        }

        let clefGlyph = $Glyph({
            fill: spec.color,
            glyphName: clefSign,
            x: clefX,
            y: clefY
        });

        let clefOctaveChange = parseInt(spec.clefOctaveChange, 10);
        let clefDecorations: any[] = [];

        let clefSignBox = bboxes[clefSign];
        let left = clefSignBox[0];
        let top = clefSignBox[1];
        let right = clefSignBox[2];
        let bottom = clefSignBox[3]; // The linter doesn't like destructuring yet :(

        // We want it to actually touch, not just be outside the bbox
        let bScalingFactor = spec.sign.toUpperCase() === "F" ? 0.7 : 1;
        let topLeftOffset = spec.sign.toUpperCase() === "G" ? left * 2 : 0;
        top = -top * 10 + clefY;
        bottom = -bottom * 10 * bScalingFactor + clefY;
        left = left * 10 + clefX;
        right = right * 10 + clefX;

        let decorativeX = (left + right) / 2;
        if (clefOctaveChange === 2) {
            clefDecorations.push($Glyph({
                fill: spec.color,
                glyphName: "clef15",
                key: "15ma",
                x: decorativeX - (bboxes["clef15"][0] * 10 +
                        bboxes["clef15"][2] * 10) / 2 + topLeftOffset,
                y: top
            }));
        } else if (clefOctaveChange === 1) {
            clefDecorations.push($Glyph({
                fill: spec.color,
                glyphName: "clef8",
                key: "8va",
                x: decorativeX - (bboxes["clef8"][0] * 10 +
                        bboxes["clef8"][2] * 10) / 2 + topLeftOffset,
                y: top
            }));
        } else if (clefOctaveChange === -1) {
            clefDecorations.push($Glyph({
                fill: spec.color,
                glyphName: "clef8",
                key: "8vb",
                x: decorativeX - (bboxes["clef8"][0] * 10 + bboxes["clef8"][2] * 10) / 2,
                y: bottom + bboxes["clef8"][1] * 10
            }));
        } else if (clefOctaveChange === -2) {
            clefDecorations.push($Glyph({
                fill: spec.color,
                glyphName: "clef15",
                key: "15mb",
                x: decorativeX - (bboxes["clef15"][0] * 10 + bboxes["clef15"][2] * 10) / 2,
                y: bottom + bboxes["clef15"][1] * 10
            }));
        }
        if (clefDecorations) {
            return DOM.g(null,
                clefGlyph,
                clefDecorations);
        } else {
            return clefGlyph;
        }
    }

    sign() {
        const clef = this.props.spec.sign.toLowerCase();

        if (clef === "percussion") {
            return "unpitchedPercussionClef1";
        } else if (clef === "tab") {
            return "6stringTabClef";
        } else if (clef === "none") {
            return null;
        } else {
            return clef + "Clef" + (this.props.spec.size === SymbolSize.Cue ?
                "Change" : "");
        }
    }

    renderedLine(): number {
        // The TAB glyph is higher than expected.
        if (this.props.spec.sign.toLowerCase() === "tab") {
            return this.props.spec.line - 2;
        }
        return this.props.spec.line;
    }
};

