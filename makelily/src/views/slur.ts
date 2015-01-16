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

import React                = require("react");
import TypedReact           = require("typed-react");
import assert               = require("assert");

import Note                 = require("./_note");
import PureModelViewMixin   = require("./pureModelViewMixin");
import SlurGroupModel       = require("../stores/slur");

var getExtremeLine = Note.getExtremeLine;

/**
 * Renders a slur or tie
 */
class Slur extends TypedReact.Component<Slur.IProps, {}> {
    render() {
        var x2: number      = this.getX2();
        var x1: number      = this.getX1();
        var y2: number      = this.getY2(0);
        var y1: number      = this.getY1(0);
        var dir: number     = this.direction();

        var x2mx1: number   = x2 - x1;
        var x1mx2: number   = -x2mx1;
        var relw: number    = 3.2; // How "curved" it is
        var y1my2: number   = y1 - y2;
        var absw: number    = -dir*8.321228/Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1)*dir === 1) {
            absw            = absw * 2;
        }

        assert(!isNaN(x2));
        assert(!isNaN(x1));
        assert(!isNaN(y2));
        assert(!isNaN(y1));
        assert(!isNaN(dir));
        assert(!isNaN(x2mx1));
        assert(!isNaN(x1mx2));
        assert(!isNaN(relw));
        assert(!isNaN(y1my2));
        assert(!isNaN(absw));

        return React.DOM.g(null, {
            x1: x2,
            y1: y2,

            x2: 0.28278198 / 1.23897534 * x1mx2 + x2,
            y2: ((dir === -1 ? y1my2 : 0) + absw) + y2,

            x3: 0.9561935 / 1.23897534 * x1mx2 + x2,
            y3: ((dir === -1 ? y1my2 : 0) + absw) + y2,

            x4: x1,
            y4: y1,

            x5: 0.28278198 / 1.23897534 * x2mx1 + x1,
            y5: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1,

            x6: 0.95619358 / 1.23897534 * x2mx1 + x1,
            y6: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1,

            fill: "#000000",
            strokeWidth: 1.2,
            stroke: "#000000"
        });
    }

    getYOffset() {
        if (this.direction() === -1) {
            return -10;
        }
        return 10;
    }
    direction() {
        return this.props.spec.direction;
    }
    getX1() {
        return this.props.spec.x;
    }
    getX2() {
        return this.props.spec.x + this.props.spec.slurW;
    }
    getY1(idx: number) {
        return this.props.spec.y -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.lines1, -this.direction) - 3)*10;
    }
    getY2(idx: number) {
        return this.props.spec.y -
            this.getYOffset() -
            (getExtremeLine(this.props.spec.lines2, -this.direction) - 3)*10;
    }
}

module Slur {
    export var Component = TypedReact.createClass(Slur, <any> [PureModelViewMixin]);

    export interface IProps {
        spec: SlurGroupModel;
    }
}

export = Slur;
