/**
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

"use strict";

import {CreditWords, Words, DirectionMode, LeftCenterRight} from "musicxml-interfaces";

import {RenderUtil} from "../engine";

const DEF_SPACING = 4;
const V_SPACING = 4;

export interface ITextMixin {
    getTextAnchor(words: CreditWords | Words): string;
    getTextDecoration(words: CreditWords | Words): string;
    getTransform(words: CreditWords | Words): string;
    getDirection(words: CreditWords | Words): string;
    getX(lineNum: number): number;
    getDX(words: CreditWords | Words, initX: number, lineNum: number): number;
    getDY(words: CreditWords | Words, initY: number, lineNum: number): number;
}

export let Prototype: ITextMixin = {
    getDX: function(words: CreditWords, initX: number, lineNum: number) {
        if (lineNum > 0) {
            return undefined;
        }
        let x = words.defaultX;
        if (!isNaN(x)) {
            return (x + (words.relativeX || 0)) - initX;
        }
        return DEF_SPACING;
    },
    getDY: function(words: CreditWords, initY: number, lineNum: number) {
        if (lineNum > 0) {
            return V_SPACING +
                RenderUtil.cssSizeToTenths(this.context.scale40, words.fontSize);
        }
        if (words.defaultY || words.relativeY) {
            return this.context.originY - (words.defaultY + (words.relativeY || 0)) - initY;
        }
        return 0;
    },
    getDirection: function(words: CreditWords | Words) {
        switch (words.dir) {
            case DirectionMode.Lro: // TODO: bidi
            case DirectionMode.Ltr:
                return "ltr";

            case DirectionMode.Rlo: // TODO: bidi
            case DirectionMode.Rtl:
                return "rtl";

            default:
                return "inherit";
        }
    },
    getTextAnchor: function(words: CreditWords | Words) {
        switch (words.halign || words.justify) {
            case LeftCenterRight.Right:
                return "end";
            case LeftCenterRight.Center:
                return "middle";
            case LeftCenterRight.Left:
                return "start";
            default:
                return "inherit";
        }
    },
    getTextDecoration: function(words: CreditWords | Words) {
        if (words.underline) {
            return "underline";
        }
        if (words.overline) {
            return "overline";
        }
        if (words.lineThrough) {
            return "line-through";
        }
        return "none";
    },
    getTransform: function(words: CreditWords | Words) {
        if (words.rotation) {
            return `rotate(${words.rotation})`;
        }
        return undefined;
    },
    getX: function(lineNum: number) {
        if (lineNum > 0) {
            return 10;
        }
    }
};

