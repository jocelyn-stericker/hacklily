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
var $                       = React.createFactory;

import Articulation         = require("./notations/articulation");
import Chord                = require("../models/chord");
import Glyph                = require("./primitives/glyph");

/**
 * Notations are things that are attached to notes.
 */
class Notation extends React.Component<{spec: MusicXML.Notations, layout: Chord.IChordLayout}, void> {
    render() {
        const model = this.props.spec;
        const originX = this.context.originX + this.props.layout.model[0].defaultX;
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
            console.log("Want to render ", tied);
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
