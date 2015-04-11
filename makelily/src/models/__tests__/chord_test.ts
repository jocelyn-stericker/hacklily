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

/**
 * @file part of Satie test suite
 */

"use strict";

import MusicXML     = require("musicxml-interfaces");
import chai         = require("chai");

import Attributes   = require("../attributes");
import Chord        = require("../chord");
import Engine       = require("../engine");
import Factory      = require("../factory");

let expect          = chai.expect;

function getAttributes(): MusicXML.Attributes {
    return {
        divisions: 6,
        times: [{
            beats: ["4"],
            beatTypes: [4],
            senzaMisura: null
        }],
        clefs: [{
            clefOctaveChange: null,
            sign: "G",
            line: 2
        }]
    };
}

function getCursor(factory: Engine.IModel.IFactory, model: Engine.IModel): Engine.ICursor {
    let attributes = getAttributes();
    return {
        segment:            <any> [model],
        idx$:               0,
        print$:             null,
        header:             null,

        voice:              {},
        staff: {
            previous:       null,
            attributes:     attributes,
            totalDivisions: 12,
            accidentals$:   {},
            idx:            0
        },
        measure: {
            idx:            0,
            number:         "1",
            implicit:       false,
            nonControlling: false,
            x:              100,
            attributes$:    attributes,
            uuid:           1,
            parent:         null
        },
        line: {
            shortestCount:  3,
            barOnLine$:     0,
            barsOnLine:     1,
            line:           0,
            lines:          1
        },

        prev$:              null,
        division$:          0,
        x$:                 100,
        minXBySmallest$:    {},
        maxPaddingTop$:     0,
        maxPaddingBottom$:  0,

        page$:              NaN,

        approximate:        true,
        detached:           false,
        factory:            factory
    };
}

describe("[chord.ts]", function() {
    describe("ChordModel", function() {
        let factory = new Factory([Attributes, Chord]);
        let chord: Engine.IModel;
        it("can be created from scratch", function() {
            chord = factory.create(Engine.IModel.Type.Chord);
            expect(!!chord).to.be.true;
            expect((<any>chord).length).to.eq(0);
        });
        it("can be correctly created from a simple spec", function() {
            chord = factory.fromSpec( <MusicXML.Note> {
                _class: "Note",
                timeModification: {
                    actualNotes: 3,
                    normalNotes: 2
                },
                duration: 600, // Playback duration. Should be ignored in these tests.
                noteType: {
                    duration: MusicXML.Count.Eighth
                },
                pitch: {
                    step: "C",
                    octave: 4,
                    alter: 1
                }
            });
            let cursor$ = getCursor(factory, chord);
            chord.validate$(cursor$);

            cursor$ = getCursor(factory, chord);
            expect(cursor$.division$).to.eq(0);
            chord.layout(cursor$);
            expect(cursor$.division$).to.eq(0, "layout must not affect cursor division");
            let xml = (<any>chord).inspect();
            expect(xml).to.contain("<step>C</step>");
            expect(xml).to.contain("<alter>1</alter>");
            expect(xml).to.contain("<octave>4</octave>");
            expect(xml).to.not.contain("<chord");
            expect(xml).to.contain("<duration>600</duration>", "Maintains playback data");
        });
        it("can be a chord generated from specs", function() {
            chord = factory.fromSpec( <MusicXML.Note> {
                _class: "Note",
                timeModification: {
                    actualNotes: 3,
                    normalNotes: 2
                },
                noteType: {
                    duration: MusicXML.Count.Eighth
                },
                pitch: {
                    step: "C",
                    octave: 4,
                    alter: 1
                }
            });
            Engine.IChord.fromModel(chord).push(<MusicXML.Note> {
                _class: "Note",
                timeModification: {
                    actualNotes: 3,
                    normalNotes: 2
                },
                noteType: {
                    duration: MusicXML.Count.Eighth
                },
                pitch: {
                    step: "E",
                    octave: 4
                }
            });
            let cursor$ = getCursor(factory, chord);
            chord.validate$(cursor$);
            cursor$ = getCursor(factory, chord);
            chord.layout(cursor$);
            expect(Engine.IChord.fromModel(chord)[0].duration).to.eq(2, "Duration wasn't specified so should be set here.");
        });
    });
});
