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
let $                       = React.createFactory;

import Accidental           = require("./accidental");

// TODO: this almost looks like logic -- move.
const sharps: { [key: string]: Array<number> } = {
    // "FCGDAEB"
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5]
};

const flats: { [key: string]: Array<number> } = {
    // "BEADGCF"
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2]
};


/**
 * Renders a key signature.
 */
class KeySignature extends React.Component<{spec: MusicXML.Key; clef: MusicXML.Clef}, void> {
    render() {
        return React.DOM.g(null,
            _.map(this.getAccidentals(), (accidental, idx) => $(Accidental)({spec: accidental, key: idx}))
        /* React.DOM.g */);
    }

    /**
     * Returns an array representing the position and glyphName of each accidental.
     */
    getAccidentals(): MusicXML.Accidental[] {
        const {spec, clef} = this.props;
        const idxes = _.times(Math.min(7, Math.abs(spec.fifths)), i => (i + Math.max(0, Math.abs(spec.fifths) - 7))%7);

        return _.map(idxes, i => makeAccidental(i, spec.fifths >= 0));

        function makeAccidental(i: number, sharp: boolean): MusicXML.Accidental {
            let accidental: MusicXML.MxmlAccidental;
            switch(true) {
                case (sharp && 7 + i < spec.fifths):
                    accidental = MusicXML.MxmlAccidental.DoubleSharp;
                    break;
                case (sharp && 7 + i >= spec.fifths):
                    accidental = MusicXML.MxmlAccidental.Sharp;
                    break;
                case (!sharp && (7 + i < -spec.fifths)):
                    accidental = MusicXML.MxmlAccidental.DoubleFlat;
                    break;
                case (!sharp && (7 + i >= -spec.fifths)):
                    accidental = MusicXML.MxmlAccidental.Flat;
                    break;
            }

            let line = (sharp ? sharps : flats)[standardClef(clef)][i];

            return {
                accidental: accidental,
                color:      spec.color,
                defaultX:   spec.defaultX + i*10,
                relativeX:  spec.relativeX,
                defaultY:   spec.defaultY + (line - 3)*10,
                relativeY:  (spec.relativeY || 0)
            };
        }
    }
};

function standardClef(clef: MusicXML.Clef) {
    switch (true) {
        case (clef.sign === "G"):
            return "treble";
        case (clef.sign === "F"):
            return "bass";
        case (clef.sign === "C" && clef.line === 3):
            return "alto";
        case (clef.sign === "C" && clef.line === 4):
            return "tenor";
        default:
            console.warn("Invalid clef?");
            return "treble";
    }
};

export = KeySignature;
