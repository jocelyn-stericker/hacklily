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
import _                    = require("lodash");

import _Accidental          = require("./_accidental");
import C                    = require("../stores/contracts");
import PureModelViewMixin   = require("./pureModelViewMixin");
import KeySignatureModel    = require("../stores/keySignature");

var    Accidental           = React.createFactory(_Accidental.Component);

/**
 * Renders a key signature. Not responsible for calculating the width.
 */
class KeySignature extends TypedReact.Component<KeySignature.IProps, {}> {
    render() {
        var spec = this.props.spec;
        return React.DOM.g(null,
            _.map(this.getAccidentals(), (a, idx) => Accidental({
                key: idx /* for React */,
                x: spec.x + idx*10,
                y: spec.y,
                line: a.line,
                stroke: spec.color,
                opacity: this.props.opacity,
                accidental: a.accidental
            /* Accidental */}))
        /* React.DOM.g */);
    }

    /**
     * Returns an array representing the position and glyphName of each accidental.
     */
    getAccidentals(): {accidental: string; line: number}[] {
        var spec = this.props.spec;
        var idxes = _.times(Math.min(7, Math.abs(spec.fifths)), i => (i + Math.max(0, Math.abs(spec.fifths) - 7))%7);
        if (spec.fifths >= 0) {
            return _.map(idxes, i => Object({
                line: sharps[standardClef(spec.clef)][i],
                accidental: (7 + i < spec.fifths) ? "accidentalDoubleSharp" : "accidentalSharp"
            }));
        } else if (spec.fifths < 0) {
            return _.map(idxes, i => Object({
                line: flats[standardClef(spec.clef)][i],
                accidental: (7 + i < -spec.fifths) ? "accidentalDoubleFlat": "accidentalFlat"
            }));
        }
    }
};

function standardClef(clef: C.MusicXML.Clef) {
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

// TODO: this almost looks like logic -- move to keySignature.ts
var sharps: { [key: string]: Array<number> } = {
    // "FCGDAEB"
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5]
};

var flats: { [key: string]: Array<number> } = {
    // "BEADGCF"
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2]
};

module KeySignature {
    export var Component = TypedReact.createClass(KeySignature, <any> [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: KeySignatureModel;
        opacity?: number;
    }
}

export = KeySignature;
