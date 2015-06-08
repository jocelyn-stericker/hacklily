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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");
var $                       = React.createFactory;

import Articulation         = require("./notations/articulation");
import Bezier               = require("./primitives/bezier");
import Chord                = require("../models/chord");
import Glyph                = require("./primitives/glyph");
import SMuFL                = require("../models/smufl");

/**
 * Notations are things that are attached to notes.
 */
class Notation extends React.Component<{spec: MusicXML.Notations, layout: Chord.IChordLayout, note: MusicXML.Note}, void> {
    render() {
        const model = this.props.spec;
        const notehead = this.props.layout.model.satieNotehead[0];
        const bbox = SMuFL.bboxes[notehead];
        const noteheadCenter = 10*(bbox[0] - bbox[2])/2;
        const originX = this.context.originX + this.props.layout.model[0].defaultX + noteheadCenter;
        let children: React.ReactElement<any>[] = [];

        _.forEach(model.accidentalMarks, accidentalMark => {
            // TODO
        });

        _.forEach(model.arpeggiates, arpeggiate => {
            // TODO
        });

        _.forEach(model.articulations, (articulation, idx) => {
            children.push($(Articulation)({
                key: `art${idx}`,
                articulation: articulation
            }));
        });

        _.forEach(model.dynamics, dynamic => {
            // TODO
        });

        _.forEach(model.fermatas, (fermata, idx) => {
            let direction = (fermata.type === MusicXML.UprightInverted.Inverted) ? "Below" : "Above";
            children.push($(Glyph)({
                key: `fer${idx}`,
                glyphName: `fermata${direction}`,
                fill: "black",
                x: originX + fermata.defaultX + (fermata.relativeX||0),
                y: this.context.originY - fermata.defaultY - (fermata.relativeY||0)
            }));
        });

        _.forEach(model.glissandos, glissando => {
            // TODO
        });

        _.forEach(model.nonArpeggiates, nonArpeggiate => {
            // TODO
        });

        _.forEach(model.ornaments, ornament => {
            // TODO
        });

        _.forEach(model.slides, slide => {
            // TODO
        });

        _.forEach(model.slurs, slur => {
            // TODO
        });

        _.forEach(model.technicals, technical => {
            // TODO
        });

        _.forEach(model.tieds, tied => {
            let tieTo: Chord.IChordLayout = (<any>tied).satieTieTo;
            if (!tieTo) {
                return;
            }

            let bbox2           = SMuFL.bboxes[notehead];
            let noteheadCenter2 = 10*(bbox2[0] - bbox2[2])/2;
            let offset2         = noteheadCenter2 - noteheadCenter - 4;
            let defaultY        = this.context.originY - this.props.note.defaultY;

            let stem1           = this.props.layout.model.satieStem;
            let stem2           = tieTo.model.satieStem;
            let dir             = -1;
            if (stem1 && stem2 && stem1.direction === stem2.direction) {
                dir             = -stem1.direction;
            } else if (stem1) {
                dir             = -stem1.direction;
            } else if (stem2) {
                dir             = -stem2.direction;
            }

            // This is the correct style only if space permits. See B.B. page 62.
            var x2: number      = originX - this.props.layout.overrideX + tieTo.x$ + offset2;
            var x1: number      = originX;
            var y2: number      = defaultY - (dir === -1 ? -10 : 10);
            var y1: number      = defaultY - (dir === -1 ? -10 : 10);

            var x2mx1: number   = x2 - x1;
            var x1mx2: number   = -x2mx1;
            var relw: number    = 3.2; // How "curved" it is
            var y1my2: number   = y1 - y2;
            var absw: number    = -dir*8.321228/Math.max(1, (Math.abs(y1my2)));
            if ((y1my2 > 0 ? -1 : 1)*dir === 1) {
                absw            = absw * 2;
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

            children.push($(Bezier)({
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
            }));
        });

        _.forEach(model.tuplets, tuplet => {
            // TODO
        });

        switch(children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return React.DOM.g(null,
                    children
                );
        }
    }
    getChildContext() {
        return {
            originX:        this.context.originX + this.props.layout.model[0].defaultX
        };
    }
};

module Notation {
    export var childContextTypes = <any> {
        originX:            React.PropTypes.number.isRequired
    };
    export var contextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
}

export = Notation;
