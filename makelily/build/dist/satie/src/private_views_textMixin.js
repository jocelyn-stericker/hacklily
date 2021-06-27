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
import { DirectionMode, LeftCenterRight, } from "musicxml-interfaces";
import { cssSizeToTenths } from "./private_renderUtil";
var DEF_SPACING = 4;
var V_SPACING = 4;
export var Prototype = {
    getDX: function (words, initX, lineNum) {
        if (lineNum > 0) {
            return undefined;
        }
        var x = words.defaultX;
        if (!isNaN(x)) {
            return x + (words.relativeX || 0) - initX;
        }
        return DEF_SPACING;
    },
    getDY: function (words, initY, lineNum) {
        if (lineNum > 0) {
            return (V_SPACING +
                cssSizeToTenths(this.context.scale40, words.fontSize));
        }
        if (words.defaultY || words.relativeY) {
            return (this.context.originY -
                (words.defaultY + (words.relativeY || 0)) -
                initY);
        }
        return 0;
    },
    getDirection: function (words) {
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
    getTextAnchor: function (words) {
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
    getTextDecoration: function (words) {
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
    getTransform: function (words) {
        if (words.rotation) {
            return "rotate(" + words.rotation + ")";
        }
        return undefined;
    },
    getX: function (lineNum) {
        if (lineNum > 0) {
            return 10;
        }
        return undefined;
    },
};
//# sourceMappingURL=private_views_textMixin.js.map