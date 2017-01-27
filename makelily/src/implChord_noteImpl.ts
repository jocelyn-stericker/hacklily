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

import {Note, Chord, Rest, Dot, Type, TimeModification, Pitch,
    Unpitched, NoteheadText, Accidental, Instrument, Lyric, Notations, Stem, Cue,
    Tie, Play, Grace, Notehead, Beam, NormalBold, NormalItalic, Level, Footnote,
    Articulations, AccidentalMark, Arpeggiate, Dynamics, Fermata, Glissando,
    NonArpeggiate, Ornaments, OtherNotation, Slide, Slur, Technical, Tied, Tuplet,
    MxmlAccidental, serializeNote} from "musicxml-interfaces";
import {forEach, reduce, map, isEqual} from "lodash";
import * as invariant from "invariant";

import {IReadOnlyValidationCursor} from "./private_cursor";
import {accidentalGlyphs, onLedger, InvalidAccidental, lineForClef} from "./private_chordUtil";
import {bboxes as glyphBBoxes} from "./private_smufl";
import {cloneObject} from "./private_util";

import ChordModelImpl from "./implChord_chordImpl";

/**
 * Represents a note in a ChordImpl.
 * 
 * Gotchas:
 *  - You need to set a a noteType, not a noteType.duration. Setting noteType.duration
 *    has no effect.
 */
class NoteImpl implements Note {
    _class = "Note";
    _parent: ChordModelImpl;
    _idx: number;

    constructor(parent: ChordModelImpl, idx: number, note: Note,
            updateParent: boolean = true) {
        let self: {[key: string]: any} = this as any;

        /* Link to parent */
        Object.defineProperty(this, "_parent", {
            enumerable: false,
            value: parent
        });
        this._idx = idx;

        /* Properties owned by NoteImpl */
        let properties = [
            "pitch", "unpitched", "noteheadText", "accidental", "instrument",
            "attack", "endDynamics", "lyrics", "notations", "stem", "cue",
            "ties", "dynamics", "duration", "play", "staff", "grace", "notehead",
            "release", "pizzicato", "beams", "voice", "footnote", "level",
            "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight",
            "fontStyle", "fontSize", "color", "printDot", "printLyric", "printObject",
            "printSpacing", "timeOnly", "dots", "noteType", "timeModificiation",
            "rest",
        ];

        forEach(properties, setIfDefined);

        function setIfDefined(property: string) {
            if (note.hasOwnProperty(property) && (<any>note)[property] !== null) {
                self[property] = <any> (<any>note)[property];
            }
        }
    }

    /*---- Note -----------------------------------------------------------------------------*/

    /*---- Note > Core ----------------------------------------------------------------------*/

    chord: Chord;
    rest: Rest;
    dots: Dot[];

    noteType: Type;
    timeModification: TimeModification;

    pitch: Pitch;

    /*---- Extended -------------------------------------------------------------------------*/

    unpitched: Unpitched;
    noteheadText: NoteheadText;
    accidental: Accidental;
    instrument: Instrument;
    attack: number;
    endDynamics: number;
    lyrics: Lyric[];
    /**
     * Do not modify notations. Instead use notationObj and articulationObj
     */
    notations: Notations[];
    get stem(): Stem {
        return this._parent.stem;
    }
    set stem(stem: Stem) {
        this._parent.stem = stem;
    }
    cue: Cue;
    duration: number;
    /**
     * This applies to the sound only.
     * s.a. notationObj.tieds
     */
    ties: Tie[];
    dynamics: number;
    play: Play;
    staff: number;                 // See prototype.
    grace: Grace;
    notehead: Notehead;
    release: number;
    pizzicato: boolean;
    beams: Beam[];

    /*---- PrintStyle -----------------------------------------------------------------------*/

    /*---- PrintStyle > EditorialVoice ------------------------------------------------------*/

    voice: number;
    footnote: Footnote;
    level: Level;

    /*---- PrintStyle > Position ------------------------------------------------------------*/

    defaultX: number; // ignored for now
    relativeY: number;
    defaultY: number;
    relativeX: number;

    /*---- PrintStyle > Font ----------------------------------------------------------------*/

    fontFamily: string;
    fontWeight: NormalBold;
    fontStyle: NormalItalic;
    fontSize: string;

    /*---- PrintStyle > Color ---------------------------------------------------------------*/

    color: string;

    /*---- Printout -------------------------------------------------------------------------*/

    printDot: boolean;
    printLyric: boolean;

    /*---- Printout > PrintObject -----------------------------------------------------------*/

    printObject: boolean;

    /*---- Printout > PrintSpacing ----------------------------------------------------------*/

    printSpacing: boolean;

    /*---- TimeOnly -------------------------------------------------------------------------*/

    timeOnly: string;

    /*---- Implementation -------------------------------------------------------------------*/

    toXML() {
        return serializeNote(this);
    }

    toJSON() {
        let {
            pitch, unpitched, noteheadText, accidental, instrument,
            attack, endDynamics, lyrics, notations, stem, cue,
            ties, dynamics, duration, play, staff, grace, notehead,
            release, pizzicato, beams, voice, footnote, level,
            relativeY, defaultY, relativeX, fontFamily, fontWeight,
            fontStyle, fontSize, color, printDot, printLyric, printObject,
            printSpacing, timeOnly, dots, noteType, timeModification,
            rest,
        } = this;

        return {
            pitch, unpitched, noteheadText, accidental, instrument,
            attack, endDynamics, lyrics, notations, stem, cue,
            ties, dynamics, duration, play, staff, grace, notehead,
            release, pizzicato, beams, voice, footnote, level,
            relativeY, defaultY, relativeX, fontFamily, fontWeight,
            fontStyle, fontSize, color, printDot, printLyric, printObject,
            printSpacing, timeOnly, noteType, dots, timeModification,
            rest,

            _class: "Note",
        };
    }

    inspect() {
        return this.toXML();
    }

    refresh(cursor: IReadOnlyValidationCursor) {
        this.cleanNotations(cursor);

        if (this.pitch && this.pitch.step !== this.pitch.step.toUpperCase()) {
            cursor.patch(voice => voice.note(this._idx,
                note => note.pitch(
                    pitch => pitch.step(this.pitch.step.toUpperCase())
                )
            ));
        }
        if (this.grace && this.cue) {
            cursor.patch(voice => voice.note(this._idx,
                note => note.cue(null)
            ));
        }
        if (this.unpitched && (this.rest || this.pitch)) {
            cursor.patch(voice => voice.note(this._idx,
                note => note.unpitched(null)
            ));
        }
        if (this.pitch && this.rest) {
            cursor.patch(voice => voice.note(this._idx,
                note => note.pitch(null)
            ));
        }
        invariant(cursor.segmentInstance.ownerType === "voice",
            "Expected to be in voice's context during validation");

        if (this.voice !== cursor.segmentInstance.owner) {
            cursor.patch(partBuilder => partBuilder
                .note(this._idx, note => note
                    .voice(cursor.segmentInstance.owner),
                )
            );
        }
        const defaultY = (lineForClef(this, cursor.staffAttributes.clef) - 3) * 10;
        if (defaultY !== this.defaultY) {
            cursor.patch(voice => voice
                .note(this._idx, note => note.defaultY(defaultY))
            );
        }
        const dotOffset = this.defaultY % 10 === 0 ? 5 : 0;
        if (!this.dots) {
            cursor.patch(voice => voice
                .note(this._idx, note => note.dots([]))
            );
        }
        if (this.dots.some(n => n.defaultY !== dotOffset)) {
            cursor.patch(voice => voice
                .note(this._idx,
                    note =>
                        reduce(this.dots, (note, _dot, idx) =>
                            note.dotsAt(idx, dot => dot.defaultY(dotOffset)), note),
                    )
            );
        }

        if (!this.staff) {
            cursor.patch(partBuilder => partBuilder
                .note(this._idx, note => note
                    .staff(1),
                )
            );
        }
    }

    /*---- Util -----------------------------------------------------------------------------*/

    /**
     * Flattens notations.
     * All of the following are valid and equivalent in MusicXML:
     * 
     * 1. <notations>
     *      <articulations>
     *        <staccato placement="above"/>
     *      </articulations>
     *    </notations>
     *    <notations>
     *      <articulations>
     *        <accent placement="above"/>
     *      </articulations>
     *    </notations>
     * 
     * 2. <notations>
     *      <articulations>
     *        <staccato placement="above"/>
     *      </articulations>
     *      <articulations>
     *        <accent placement="above"/>
     *      </articulations>
     *    </notations>
     * 
     * 3. <notations>
     *      <articulations>
     *        <staccato placement="above"/>
     *        <accent placement="above"/>
     *      </articulations>
     *    </notations>
     * 
     * This function makes the structure like the third version. So there's only ever 0 or
     * 1 notations and 0 or 1 articulations. This makes the notationObj and articualtionObj
     * function above fast.
     * 
     * In practice, different groups of notations could have different editorials and print-object
     * attributes. I'm not willing to put up with that, yet.
     */
    cleanNotations(cursor: IReadOnlyValidationCursor) {
        let notations = cloneObject(this.notations);

        if (notations) {
            let notation: Notations = {
                accidentalMarks: combine<AccidentalMark> ("accidentalMarks"),
                arpeggiates: combine<Arpeggiate> ("arpeggiates"),
                articulations: combineArticulations ("articulations"),
                dynamics: combine<Dynamics> ("dynamics"),
                fermatas: combine<Fermata> ("fermatas"),
                footnote: last<Footnote> ("footnote"),
                glissandos: combine<Glissando> ("glissandos"),
                level: last<Level> ("level"),
                nonArpeggiates: combine<NonArpeggiate> ("nonArpeggiates"),
                ornaments: combine<Ornaments> ("ornaments"),
                otherNotations: combine<OtherNotation> ("otherNotations"),
                printObject: last<boolean> ("printObject"),
                slides: combine<Slide> ("slides"),
                slurs: combine<Slur> ("slurs"),
                technicals: combine<Technical> ("technicals"),
                tieds: combine<Tied> ("tieds"),
                tuplets: combine<Tuplet> ("tuplets")
            };

            forEach(notation.tieds, tied => {
                if (!tied.number) {
                    tied.number = 1;
                }
            });

            forEach(notation.tuplets, tuplet => {
                if (!tuplet.tupletActual) {
                    tuplet.tupletActual = {};
                }
                if (!tuplet.tupletNormal) {
                    tuplet.tupletNormal = {};
                }
                if (!tuplet.tupletActual.tupletNumber) {
                    tuplet.tupletActual.tupletNumber = {
                        text: String(this.timeModification.actualNotes)
                    };
                }
                if (!tuplet.tupletNormal.tupletNumber) {
                    tuplet.tupletNormal.tupletNumber = {
                        text: String(this.timeModification.normalNotes)
                    };
                }
                if (!tuplet.tupletNormal.tupletDots) {
                    tuplet.tupletNormal.tupletDots =
                        map(this.timeModification.normalDots, () => ({}));
                }
            });

            cursor.patch(voice => voice.note(this._idx,
                note => note.notations([notation])
            ));
        }

        function combine<T>(key: string): T[] {
            return reduce(notations, (memo: any, n: any) =>
                n[key] ? (memo || <T[]>[]).concat(n[key]) : memo, null);
        }

        function combineArticulations(key: string): Articulations[] {
            let array = combine<Articulations>(key);
            if (!array) {
                return null;
            }
            let articulations: Articulations = <any> {};
            for (let i = 0; i < array.length; ++i) {
                for (let akey in array[i]) {
                    if (array[i].hasOwnProperty(akey)) {
                        (<any>articulations)[akey] = (<any>array[i])[akey];
                    }
                }
            }
            return [articulations];
        }

        function last<T>(key: string): T {
            return reduce(notations, (memo: any, n: any) =>
                n[key] ? n[key] : memo, []);
        }
    }

    updateAccidental(cursor: IReadOnlyValidationCursor) {
        let pitch = this.pitch;
        if (!pitch) {
            return;
        }
        let actual = pitch.alter || 0;
        let accidentals = cursor.staffAccidentals;
        invariant(!!accidentals,
            "Accidentals must already have been setup. Is there an Attributes element?");

        // TODO: this is no longer sufficient if multiple voices share a staff.
        let generalTarget = accidentals[pitch.step] || null;
        let target = accidentals[pitch.step + pitch.octave] || generalTarget;

        if (!target && generalTarget !== InvalidAccidental) {
            target = generalTarget;
        }

        let acc = cloneObject(this.accidental);

        if (!acc && (actual || 0) !== (target || 0)) {
            let accType: MxmlAccidental = null;
            switch (actual) {
                case 2:
                    accType = MxmlAccidental.DoubleSharp;
                    break;
                case 1.5:
                    accType = MxmlAccidental.ThreeQuartersSharp;
                    break;
                case 1:
                    accType = MxmlAccidental.Sharp;
                    break;
                case 0.5:
                    accType = MxmlAccidental.QuarterSharp;
                    break;
                case 0:
                    accType = MxmlAccidental.Natural;
                    break;
                case -0.5:
                    accType = MxmlAccidental.QuarterFlat;
                    break;
                case -1:
                    accType = MxmlAccidental.Flat;
                    break;
                case -1.5:
                    accType = MxmlAccidental.ThreeQuartersFlat;
                    break;
                case -2:
                    accType = MxmlAccidental.DoubleFlat;
                    break;
                default:
                    invariant(false, "Not implemented: unknown accidental for offset %s", actual);
            }

            acc = {
                accidental: accType
            };
        }

        if (acc) {
            let glyphName = accidentalGlyphs[acc.accidental];
            invariant(glyphName in glyphBBoxes, "Expected a known glyph, got %s", glyphName);
            let width = glyphBBoxes[glyphName][0] * 10;
            let {clef} = cursor.staffAttributes;
            // TODO: `let clef = cursor.part.attributes.clefs[cursor.staffIdx]`

            if (onLedger(this, clef)) {
                acc.defaultX = -4.1;
            } else {
                acc.defaultX = -2.04;
            }

            acc.defaultX -= width;

            acc.defaultY = 0;

            if (acc.editorial && !acc.parentheses || acc.bracket) {
                // We don't allow an accidental to be editorial but not have parentheses.
                acc.parentheses = true; // XXX: do not mutate
            }

            if (acc.parentheses) {
                acc.defaultX -= 10;
            }
        }

        if (!isEqual(cloneObject(this.accidental), acc) && cursor.patch) {
            cursor.patch(part => part.note(0, note => note.accidental(acc)));
        }
    }
}

export default NoteImpl;
