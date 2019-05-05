"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file Renders a tuplet outside of a beam. Unbeamed tuplets are created
 * by the beam postprocessor, since they share many similaraties.
 */
// Note that we use notehadBlack regardless of the notehead.
// This keeps spacing consistent, even in beam groups with rests.
var React = __importStar(require("react"));
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var PropTypes = __importStar(require("prop-types"));
var lodash_1 = require("lodash");
var private_smufl_1 = require("./private_smufl");
var implChord_tupletNumberView_1 = __importDefault(require("./implChord_tupletNumberView"));
var UnbeamedTuplet = /** @class */ (function (_super) {
    __extends(UnbeamedTuplet, _super);
    function UnbeamedTuplet() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UnbeamedTuplet.prototype.render = function () {
        var _a = this.props, stroke = _a.stroke, layout = _a.layout;
        var tuplet = layout.tuplet, x = layout.x;
        var placement = tuplet.placement;
        var yOffset = placement === musicxml_interfaces_1.AboveBelow.Above ? 8 : -8;
        var isSingleNote = x.length === 1;
        var x1 = this._getX1();
        var x2 = this._getX2();
        var y1 = this._getY1(1);
        var y2 = this._getY2(1);
        var y1Low = this._getY1(0);
        var y2Low = this._getY2(0);
        var y1Near = placement === musicxml_interfaces_1.AboveBelow.Below ? y1 : y1Low;
        var y1Far = placement === musicxml_interfaces_1.AboveBelow.Below ? y1Low : y1;
        var y2Near = placement === musicxml_interfaces_1.AboveBelow.Below ? y2 : y2Low;
        var y2Far = placement === musicxml_interfaces_1.AboveBelow.Below ? y2Low : y2;
        return (React.createElement("g", null,
            !isSingleNote && (React.createElement("polygon", { fill: stroke, key: "p1", points: x1 +
                    "," +
                    y1Low +
                    " " +
                    x2 +
                    "," +
                    y2Low +
                    " " +
                    x2 +
                    "," +
                    y2 +
                    " " +
                    x1 +
                    "," +
                    y1, stroke: stroke, strokeWidth: 0 })),
            !isSingleNote && (React.createElement("line", { fill: stroke, key: "p2", stroke: stroke, strokeWidth: private_smufl_1.bravura.engravingDefaults.tupletBracketThickness * 10, x1: x1 + 0.5, x2: x1 + 0.5, y1: y1Near, y2: y1Far + yOffset })),
            !isSingleNote && (React.createElement("line", { fill: this.props.stroke, key: "p3", stroke: stroke, strokeWidth: private_smufl_1.bravura.engravingDefaults.tupletBracketThickness * 10, x1: x2 - 0.5, x2: x2 - 0.5, y1: y2Near, y2: y2Far + yOffset })),
            React.createElement(implChord_tupletNumberView_1.default, { tuplet: tuplet, x1: x1, x2: x2, y1: y1, y2: y2 })));
    };
    /**
     * Offset because the note-head has a non-zero width.
     */
    UnbeamedTuplet.prototype.getLineXOffset = function () {
        return (this.direction() * -this.props.stemWidth) / 2;
    };
    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    UnbeamedTuplet.prototype.direction = function () {
        return this.props.layout.tuplet.placement === musicxml_interfaces_1.AboveBelow.Above ? 1 : -1;
    };
    UnbeamedTuplet.prototype._withXOffset = function (x) {
        return (x +
            private_smufl_1.getFontOffset("noteheadBlack", this.direction())[0] * 10 +
            this.getLineXOffset());
    };
    UnbeamedTuplet.prototype._getX1 = function () {
        var x = this.props.layout.x;
        return this._withXOffset(lodash_1.first(x)) - 4;
    };
    UnbeamedTuplet.prototype._getX2 = function () {
        var x = this.props.layout.x;
        return this._withXOffset(lodash_1.last(x)) + 4;
    };
    UnbeamedTuplet.prototype._getY1 = function (incl) {
        var originY = this.context.originY;
        var layout = this.props.layout;
        var y1 = layout.y1;
        return (originY -
            y1 -
            this.direction() *
                private_smufl_1.getFontOffset("noteheadBlack", this.direction())[1] *
                10 -
            (incl || 0) * (private_smufl_1.bravura.engravingDefaults.tupletBracketThickness * 10));
    };
    UnbeamedTuplet.prototype._getY2 = function (incl) {
        var originY = this.context.originY;
        var layout = this.props.layout;
        var y2 = layout.y2;
        return (originY -
            y2 -
            this.direction() *
                private_smufl_1.getFontOffset("noteheadBlack", this.direction())[1] *
                10 -
            (incl || 0) * (private_smufl_1.bravura.engravingDefaults.tupletBracketThickness * 10));
    };
    UnbeamedTuplet.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return UnbeamedTuplet;
}(react_1.Component));
exports.default = UnbeamedTuplet;
//# sourceMappingURL=implChord_unbeamedTupletView.js.map