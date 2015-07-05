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

import {UprightInverted, Notations, Note} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, ReactElement, PropTypes} from "react";
import {forEach} from "lodash";
import invariant = require("react/lib/invariant");

import Articulation from "./notations/articulation";
import Bezier from "./primitives/bezier";
import Chord from "../models/chord";
import Glyph from "./primitives/glyph";
import {bboxes} from "../models/smufl";

/**
 * Notations are things that are attached to notes.
 */
class NotationModel extends Component<NotationModel.IProps, void> {
    render() {
        const model = this.props.spec;
        const notehead = this.props.layout.model.noteheadGlyph[0];
        const bbox = bboxes[notehead];
        const noteheadCenter = 10*(bbox[0] - bbox[2])/2;
        const originX = this.context.originX + this.props.layout.model[0].defaultX + noteheadCenter;
        let children: ReactElement<any>[] = [];

        forEach(model.accidentalMarks, accidentalMark => {
            // TODO
        });

        forEach(model.arpeggiates, arpeggiate => {
            // TODO
        });

        forEach(model.articulations, (articulation, idx) => {
            children.push($(Articulation)({
                articulation: articulation,
                key: `art${idx}`
            }));
        });

        forEach(model.dynamics, dynamic => {
            // TODO
        });

        forEach(model.fermatas, (fermata, idx) => {
            let direction = (fermata.type === UprightInverted.Inverted) ? "Below" : "Above";
            children.push($(Glyph)({
                fill: "black",
                glyphName: `fermata${direction}`,
                key: `fer${idx}`,
                x: originX + fermata.defaultX + (fermata.relativeX||0),
                y: this.context.originY - fermata.defaultY - (fermata.relativeY||0)
            }));
        });

        forEach(model.glissandos, glissando => {
            // TODO
        });

        forEach(model.nonArpeggiates, nonArpeggiate => {
            // TODO
        });

        forEach(model.ornaments, ornament => {
            // TODO
        });

        forEach(model.slides, slide => {
            // TODO
        });

        forEach(model.slurs, slur => {
            // TODO
        });

        forEach(model.technicals, technical => {
            // TODO
        });

        forEach(model.tieds, tied => {
            let tieTo: Chord.IChordLayout = (<any>tied).satieTieTo;
            if (!tieTo) {
                return;
            }

            let bbox2 = bboxes[notehead];
            let noteheadCenter2 = 10*(bbox2[0] - bbox2[2])/2;
            let offset2 = noteheadCenter2 - noteheadCenter - 4;
            let defaultY = this.context.originY - this.props.note.defaultY;

            let stem1 = this.props.layout.model.satieStem;
            let stem2 = tieTo.model.satieStem;
            let dir = -1;
            if (stem1 && stem2 && stem1.direction === stem2.direction) {
                dir = -stem1.direction;
            } else if (stem1) {
                dir = -stem1.direction;
            } else if (stem2) {
                dir = -stem2.direction;
            }

            // This is the correct style only if space permits. See B.B. page 62.
            let x2: number = originX - this.props.layout.overrideX + tieTo.x$ + offset2;
            let x1: number = originX;
            let y2: number = defaultY - (dir === -1 ? -10 : 10);
            let y1: number = defaultY - (dir === -1 ? -10 : 10);

            let x2mx1: number = x2 - x1;
            let x1mx2: number = -x2mx1;
            let relw: number = 3.2; // How "curved" it is
            let y1my2: number = y1 - y2;
            let absw: number = -dir*8.321228/Math.max(1, (Math.abs(y1my2)));
            if ((y1my2 > 0 ? -1 : 1)*dir === 1) {
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

            children.push($(Bezier)({
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

        forEach(model.tuplets, tuplet => {
            // TODO
        });

        switch(children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return DOM.g(null,
                    children
                );
        }
    }
    getChildContext() {
        return {
            originX: this.context.originX + this.props.layout.model[0].defaultX
        };
    }
};

module NotationModel {
    export interface IProps {
        spec: Notations;
        layout: Chord.IChordLayout;
        note: Note;
    }
    export let childContextTypes = <any> {
        originX: PropTypes.number.isRequired
    };
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default NotationModel;
