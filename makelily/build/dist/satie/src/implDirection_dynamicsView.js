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
import React, { Component } from "react";
import * as PropTypes from "prop-types";
import { filter } from "lodash";
import invariant from "invariant";
import Glyph from "./private_views_glyph";
var DynamicsView = /** @class */ (function (_super) {
    __extends(DynamicsView, _super);
    function DynamicsView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DynamicsView.prototype.render = function () {
        var layout = this.props.layout;
        var model = layout.model;
        var dynamicsContainer = filter(model.directionTypes, function (dt) { return dt.dynamics; })[0];
        invariant(!!dynamicsContainer, "No dynamics found!");
        var dynamics = typeof dynamicsContainer !== "number" &&
            typeof dynamicsContainer !== "function" &&
            dynamicsContainer.dynamics;
        var initX = this.props.layout.overrideX +
            dynamics.defaultX +
            (dynamics.relativeX || 0);
        var initY = (this.context.originY || 0) -
            dynamics.defaultY -
            (dynamics.relativeY || 0);
        var glyphName = this.getGlyphName(dynamics);
        if (!glyphName) {
            return null;
        }
        return (React.createElement(Glyph, { fill: dynamics.color || "black", glyphName: glyphName, x: initX, y: initY }));
    };
    DynamicsView.prototype.getGlyphName = function (dynamics) {
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
    };
    DynamicsView.contextTypes = {
        originY: PropTypes.number,
    };
    return DynamicsView;
}(Component));
export default DynamicsView;
//# sourceMappingURL=implDirection_dynamicsView.js.map