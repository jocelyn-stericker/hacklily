/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

/**
 * @file Renders a tuplet outside of a beam. Unbeamed tuplets are created
 * by the beam postprocessor, since they share many similaraties.
 */

// Note that we use notehadBlack regardless of the notehead.
// This keeps spacing consistent, even in beam groups with rests.

import {AboveBelow} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";
import {first, last, map, reduce} from "lodash";

import Glyph from "./primitives/glyph";
import {bravura, getFontOffset, bboxes} from "../models/smufl";
import {IBeam} from "../engine";

class UnbeamedTuplet extends Component<UnbeamedTuplet.IProps, void> {
    render(): any {
        let {stroke, layout} = this.props;
        let {tuplet} = layout;
        let {placement} = tuplet;
        let yOffset = placement === AboveBelow.Above ? 8 : -8;
        return DOM.g(null,
            DOM.polygon({
                fill: stroke,
                key: "p1",
                points: this._getX1() + "," + this._getY1(0) + " " +
                    this._getX2() + "," + this._getY2(0) + " " +
                    this._getX2() + "," + this._getY2(1) + " " +
                    this._getX1() + "," + this._getY1(1),
                stroke: stroke,
                strokeWidth: 0
            }),
            DOM.line({
                fill: stroke,
                key: "p2",
                stroke: stroke,
                strokeWidth: bravura.engravingDefaults.tupletBracketThickness*10,
                x1: this._getX1() + 0.5,
                x2: this._getX1() + 0.5,
                y1: this._getY1(placement === AboveBelow.Below ? 1 : 0),
                y2: this._getY1(placement === AboveBelow.Below ? 0 : 1) + yOffset
            }),
            DOM.line({
                fill: this.props.stroke,
                key: "p3",
                stroke: this.props.stroke,
                strokeWidth: bravura.engravingDefaults.tupletBracketThickness*10,
                x1: this._getX2() - 0.5,
                x2: this._getX2() - 0.5,
                y1: this._getY2(placement === AboveBelow.Below ? 1 : 0),
                y2: this._getY2(placement === AboveBelow.Below ? 0 : 1) + yOffset
            }),
            this._tuplet()
        );
    }

    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset() {
        return this.direction() * -this.props.stemWidth / 2;
    }

    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    direction() {
        return this.props.layout.tuplet.placement === AboveBelow.Above ? 1 : -1;
    }

    private _withXOffset(x: number) {
        return x +
            this.context.originX +
            getFontOffset("noteheadBlack", this.direction())[0]*10 +this.getLineXOffset();
    }

    private _getX1() {
        let {x} = this.props.layout;
        return this._withXOffset(first(x)) - 4;
    }

    private _getX2() {
        let {x} = this.props.layout;
        return this._withXOffset(last(x)) + 4;
    }

    private _getY1(incl: number) {
        let {originY} = this.context;
        let {layout} = this.props;
        let {y1} = layout;
        return originY - y1 -
            this.direction()*getFontOffset("noteheadBlack", this.direction())[1]*10 -
            (incl || 0)*(bravura.engravingDefaults.tupletBracketThickness*10);
    }

    private _getY2(incl: number) {
        let {originY} = this.context;
        let {layout} = this.props;
        let {y2} = layout;
        return originY - y2 -
            this.direction()*getFontOffset("noteheadBlack", this.direction())[1]*10 -
            (incl || 0)*(bravura.engravingDefaults.tupletBracketThickness*10);
    }

    /**
     * Returns a component instance showing the tuplet number
     */
    private _tuplet() {
        let {layout} = this.props;
        let {tuplet} = layout;

        let text = (tuplet.tupletActual.tupletNumber.text);
        let symbols = map(text, letter => `tuplet${letter}`);
        let boxes = map(symbols, symbol => bboxes[symbol]);
        let widths = map(boxes, box => (box[0] - box[2])*10);

        let width = reduce(widths, (total, width) => total + width, 0);
        let offset = (this._getX2() + this._getX1())/2;
        let xs = reduce(boxes, (memo, box) => {
            memo.push(box[0] * 10 + last(memo));
            return memo;
        }, [0]);
        let y = (this._getY1(1) + this._getY2(1))/2 + 5.8;

        return DOM.g(null,
            // Mask
            // FIXME: We should instead split up the rectangle into
            // two parts to avoid breaking transparent backgrounds!
            DOM.polygon({
                fill: "white",
                key: `mask`,
                points: (
                    (offset - width/2 - 6) + "," + (y - boxes[0][1]*10) + " " +
                    (offset - width/2 - 6) + "," + (y + boxes[0][3]*10) + " " +
                    (offset + width/2 + 6) + "," + (y + boxes[0][3]*10) + " " +
                    (offset + width/2 + 6) + "," + (y - boxes[0][1]*10)),
                stroke: "white",
                strokeWidth: 0
            }),

            // Glyphs
            map(symbols, (symbol, index) => {
                return $(Glyph)({
                    key: `glyph${index}`,
                    fill: "#000000",
                    glyphName: symbol,
                    x: xs[index] + offset - width/2,
                    y: y
                });
            })
        /* DOM.g */);
    }
};

module UnbeamedTuplet {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
    export interface IProps {
        stroke: string;
        stemWidth: number;
        layout: IBeam.ILayout;
    }
}

export default UnbeamedTuplet;
