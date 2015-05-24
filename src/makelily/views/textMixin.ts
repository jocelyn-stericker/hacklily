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

import MusicXML         = require("musicxml-interfaces");

import Engine           = require("../models/engine");

const DEF_SPACING       = 4;
const V_SPACING         = 4;

export interface ITextMixin {
    getTextAnchor(words: MusicXML.CreditWords | MusicXML.Words): string;
    getTextDecoration(words: MusicXML.CreditWords | MusicXML.Words): string;
    getTransform(words: MusicXML.CreditWords | MusicXML.Words): string;
    getDirection(words: MusicXML.CreditWords | MusicXML.Words): string;
    getX(lineNum: number): number;
    getDX(words: MusicXML.CreditWords | MusicXML.Words, initX: number, lineNum: number): number;
    getDY(words: MusicXML.CreditWords | MusicXML.Words, initY: number, lineNum: number): number;
}

export let Prototype: ITextMixin = {
    getTextAnchor: function(words: MusicXML.CreditWords | MusicXML.Words) {
        switch(words.halign || words.justify) {
            case MusicXML.LeftCenterRight.Right:
                return "end";
            case MusicXML.LeftCenterRight.Center:
                return "middle";
            case MusicXML.LeftCenterRight.Left:
                return "start";
            default:
                return "inherit";
        }
    },
    getTextDecoration: function(words: MusicXML.CreditWords | MusicXML.Words) {
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
    getTransform: function(words: MusicXML.CreditWords | MusicXML.Words) {
        if (words.rotation) {
            return `rotate(${words.rotation})`;
        }
        return undefined;
    },
    getDirection: function(words: MusicXML.CreditWords | MusicXML.Words) {
        switch(words.dir) {
            case MusicXML.DirectionMode.Lro:    // TODO: bidi
            case MusicXML.DirectionMode.Ltr:
                return "ltr";

            case MusicXML.DirectionMode.Rlo:    // TODO: bidi
            case MusicXML.DirectionMode.Rtl:
                return "rtl";

            default:
                return "inherit";
        }
    },
    getX: function(lineNum: number) {
        if (lineNum > 0) {
            return 10;
        }
    },
    getDX: function(words: MusicXML.CreditWords, initX: number, lineNum: number) {
        if (lineNum > 0) {
            return undefined;
        }
        let x = this.props.layout ? this.props.layout.barX : words.defaultX;
        if (x) {
            return (x + (words.relativeX || 0)) - initX;
        }
        return DEF_SPACING;
    },
    getDY: function(words: MusicXML.CreditWords, initY: number, lineNum: number) {
        if (lineNum > 0) {
            return V_SPACING +
                Engine.RenderUtil.cssSizeToTenths(this.context.scale40, words.fontSize);
        }
        if (words.defaultY || words.relativeY) {
            return this.context.originY - (words.defaultY + (words.relativeY || 0)) - initY;
        }
        return 0;
    }
};

