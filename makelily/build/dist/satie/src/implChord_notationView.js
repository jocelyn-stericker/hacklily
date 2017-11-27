"use strict";
/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var DOM = require("react-dom-factories");
var PropTypes = require("prop-types");
var lodash_1 = require("lodash");
var invariant = require("invariant");
var private_views_bezier_1 = require("./private_views_bezier");
var private_views_glyph_1 = require("./private_views_glyph");
var private_smufl_1 = require("./private_smufl");
var implChord_articulationView_1 = require("./implChord_articulationView");
var $Bezier = react_1.createFactory(private_views_bezier_1.default);
var $Glyph = react_1.createFactory(private_views_glyph_1.default);
var $Articulation = react_1.createFactory(implChord_articulationView_1.default);
var implChord_notation_1 = require("./implChord_notation");
/**
 * Notations are things that are attached to notes.
 */
var NotationView = /** @class */ (function (_super) {
    __extends(NotationView, _super);
    function NotationView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NotationView.prototype.render = function () {
        var _this = this;
        var model = this.props.spec;
        var nlayout = this.props.layout;
        var notehead = nlayout ? nlayout.model.noteheadGlyph[0] : "noteheadBlack";
        var bbox = private_smufl_1.bboxes[notehead];
        var noteheadCenter = 10 * (bbox[0] - bbox[2]) / 2;
        var originX = nlayout ? nlayout.model[0].defaultX + noteheadCenter : 0;
        var children = [];
        lodash_1.forEach(model.accidentalMarks, function (accidentalMark) {
            // TODO
        });
        lodash_1.forEach(model.arpeggiates, function (arpeggiate) {
            // TODO
        });
        lodash_1.forEach(model.articulations, function (articulation, idx) {
            children.push($Articulation({
                articulation: articulation,
                key: "art" + idx,
                defaultX: nlayout ? nlayout.model[0].defaultX : 0,
            }));
        });
        lodash_1.forEach(model.dynamics, function (dynamic) {
            // TODO
        });
        lodash_1.forEach(model.fermatas, function (fermata, idx) {
            var direction = (fermata.type === musicxml_interfaces_1.UprightInverted.Inverted) ? "Below" : "Above";
            var shape;
            switch (fermata.shape) {
                case musicxml_interfaces_1.NormalAngledSquare.Angled:
                    shape = "fermataShort";
                    break;
                case musicxml_interfaces_1.NormalAngledSquare.Square:
                    shape = "fermataLong";
                    break;
                case musicxml_interfaces_1.NormalAngledSquare.Normal:
                default:
                    shape = "fermata";
                    break;
            }
            children.push($Glyph({
                fill: "black",
                glyphName: "" + shape + direction,
                key: "fer" + idx,
                x: originX + fermata.defaultX + (fermata.relativeX || 0),
                y: (_this.context.originY || 0) - fermata.defaultY - (fermata.relativeY || 0)
            }));
        });
        lodash_1.forEach(model.glissandos, function (glissando) {
            // TODO
        });
        lodash_1.forEach(model.nonArpeggiates, function (nonArpeggiate) {
            // TODO
        });
        lodash_1.forEach(model.ornaments, function (ornament) {
            // TODO
        });
        lodash_1.forEach(model.slides, function (slide) {
            // TODO
        });
        lodash_1.forEach(model.slurs, function (slur) {
            // TODO
        });
        lodash_1.forEach(model.technicals, function (technical, idx) {
            var t = technical.arrow ||
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
            children.push($Glyph({
                fill: t.color || "black",
                glyphName: implChord_notation_1.technicalGlyph(technical, t.placement === musicxml_interfaces_1.AboveBelow.Below ? "Below" : "Above"),
                key: "tech" + idx,
                x: originX + t.defaultX + (t.relativeX || 0),
                y: (_this.context.originY || 0) - t.defaultY - (t.relativeY || 0),
            }));
        });
        lodash_1.forEach(model.tieds, function (tied) {
            var tieTo = tied.satieTieTo;
            if (!tieTo) {
                return;
            }
            var bbox2 = private_smufl_1.bboxes[notehead];
            var noteheadCenter2 = 10 * (bbox2[0] - bbox2[2]) / 2;
            var offset2 = noteheadCenter2 - noteheadCenter - 4;
            var defaultY = (_this.context.originY || 0) - (_this.props.defaultY || 0);
            var stem1 = _this.props.layout.satieStem;
            var stem2 = tieTo.satieStem;
            var dir = -1;
            if (stem1 && stem2 && stem1.direction === stem2.direction) {
                dir = -stem1.direction;
            }
            else if (stem1) {
                dir = -stem1.direction;
            }
            else if (stem2) {
                dir = -stem2.direction;
            }
            // This is the correct style only if space permits. See B.B. page 62.
            var x2 = originX - _this.props.layout.overrideX + tieTo.x + offset2;
            var x1 = originX;
            var y2 = defaultY - (dir === -1 ? -10 : 10);
            var y1 = defaultY - (dir === -1 ? -10 : 10);
            var x2mx1 = x2 - x1;
            var x1mx2 = -x2mx1;
            var relw = 3.2; // How "curved" it is
            var y1my2 = y1 - y2;
            var absw = -dir * 8.321228 / Math.max(1, (Math.abs(y1my2)));
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
            children.push($Bezier({
                fill: "#000000",
                stroke: "#000000",
                strokeWidth: 1.2,
                x1: x2,
                x2: 0.28278198 / 1.23897534 * x1mx2 + x2,
                x3: 0.9561935 / 1.23897534 * x1mx2 + x2,
                x4: x1,
                x5: 0.28278198 / 1.23897534 * x2mx1 + x1,
                x6: 0.95619358 / 1.23897534 * x2mx1 + x1,
                y1: y2,
                y2: ((dir === -1 ? y1my2 : 0) + absw) + y2,
                y3: ((dir === -1 ? y1my2 : 0) + absw) + y2,
                y4: y1,
                y5: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1,
                y6: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1
            }));
        });
        lodash_1.forEach(model.tuplets, function (tuplet) {
            // TODO
        });
        switch (children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return DOM.g(null, children);
        }
    };
    NotationView.contextTypes = {
        originY: PropTypes.number,
    };
    return NotationView;
}(react_1.Component));
exports.default = NotationView;
//# sourceMappingURL=implChord_notationView.js.map