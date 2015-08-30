/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {Note, Chord, Rest, Dot, Type, Count, SymbolSize, TimeModification, Pitch,
    Unpitched, NoteheadText, Accidental, Instrument, Lyric, Notations, Stem, Cue,
    Tie, Play, Grace, Notehead, Beam, NormalBold, NormalItalic, Level, Footnote,
    Articulations, AccidentalMark, Arpeggiate, Dynamics, Fermata, Glissando,
    NonArpeggiate, Ornaments, OtherNotation, Slide, Slur, Technical, Tied, Tuplet,
    MxmlAccidental, serialize as serializeToXML} from "musicxml-interfaces";
import {times, forEach, reduce, map} from "lodash";
import invariant = require("invariant");

import ChordModelImpl from "./chordImpl"; // @cyclic
import {ICursor, IChord} from "../../engine";
import {bboxes as glyphBBoxes} from "../smufl";

/**
 * Represents a note in a ChordImpl.
 * 
 * Gotchas:
 *  - You need to set a a noteType, not a noteType.duration. Setting noteType.duration
 *    has no effect.
 */
class NoteImpl implements Note {
    _parent: ChordModelImpl;
    _idx: number;

    constructor(parent: ChordModelImpl, idx: number, note: Note,
            updateParent: boolean = true) {
        let self : {[key:string]: any} = <any> this;

        /* Link to parent */
        Object.defineProperty(this, "_parent", {
            enumerable: false,
            value: parent
        });
        this._idx = idx;

        if (note.pitch) {
            note.pitch.step = note.pitch.step.toUpperCase();
        }

        /* Properties owned by parent */
        if (updateParent) {
            parent.dots = (note.dots || []).length;
            if (note.rest) {
                this.rest = note.rest; // Assigns parent
            }
            let count = note.noteType ? note.noteType.duration : parent.count;
            if (count) {
                parent.count = count;
            }

            parent.timeModification = note.timeModification || parent.timeModification;
        }

        /* Properties owned by NoteImpl */
        let properties = [
            "pitch", "unpitched", "noteheadText", "accidental", "instrument",
            "attack", "endDynamics", "lyrics", "notations", "stem", "cue",
            "ties", "dynamics", "duration", "play", "staff", "grace", "notehead",
            "release", "pizzicato", "beams", "voice", "footnote", "level",
            "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight",
            "fontStyle", "fontSize", "color", "printDot", "printLyric", "printObject",
            "printSpacing", "timeOnly"
        ];

        forEach(properties, setIfDefined);

        this.cleanNotations();

        if (!this.staff) {
            this.staff = 1;
        }

        function setIfDefined(property: string) {
            if (note.hasOwnProperty(property) && (<any>note)[property] !== null) {
                self[property] = <any> (<any>note)[property];
            }
        }
    }

    /*---- NoteImpl -------------------------------------------------------------------------*/

    toXML() {
        return serializeToXML.note(this);
    }

    inspect() {
        return this.toXML();
    }

    validate$() {
        this.cleanNotations();
        if (this.grace && this.cue) {
            delete this.cue;
        }
        if (this.unpitched && (this.rest || this.pitch)) {
            delete this.unpitched;
        }
        if (this.pitch && this.rest) {
            delete this.pitch;
        }
    }

    /*---- Note -----------------------------------------------------------------------------*/

    /*---- Note > Core ----------------------------------------------------------------------*/

    get chord(): Chord {
        return this._idx + 1 !== this._parent.length;
    }

    get rest(): Rest {
        return this._parent.rest ? {
            displayOctave: this._restDisplayOctave,
            displayStep: this._restDisplayStep,
            measure: this._parent.wholebar$
        } : null;
    }
    set rest(rest: Rest) {
        this._parent.rest = !!rest;
        if (rest) {
            this._restDisplayStep = rest.displayStep;
            this._restDisplayOctave = rest.displayOctave;
        } else {
            if (this._restDisplayStep || this._restDisplayOctave) {
                this._restDisplayStep = undefined;
                this._restDisplayOctave = undefined;
            }
        }
    }
    _restDisplayStep: string;
    _restDisplayOctave: string;

    get dots(): Dot[] {
        let offset = this.defaultY % 10 === 0 ? 5 : 0;
        return times(this._parent.dots, () => <Dot> {
            defaultY: offset
            // TODO: save/restore dot formatting
            // TODO: display dot formatting
        });
    }
    set dots(dots: Dot[]) {
        this._parent.dots = dots.length;
    }

    get noteType(): Type {
        return {
            duration: this._parent.satieMultipleRest ? Count.Whole : this._parent.count,
            size: SymbolSize.Full // TODO: grace, cue
        };
    }

    set noteType(type: Type) {
        // TODO: grace, cue
        this._parent.count = type.duration;
    }

    get timeModification(): TimeModification {
        return this._parent.timeModification;
    }

    set timeModification(tm: TimeModification) {
        this._parent.timeModification = tm;
    }

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

    get color(): string {
        let hex = this._color.toString(16);
        return "#" + "000000".substr(0, 6 - hex.length) + hex;
    }
    set color(a: string) {
        switch(true) {
            case !a:
                this._color = 0;
                break;
            case a[0] === "#":
                a = a.slice(1);
                this._color = parseInt(a, 16);
                break;
            default:
                this._color = parseInt(a, 16);
                break;
        }
    }

    private _color: number = 0x000000;

    /*---- Printout -------------------------------------------------------------------------*/

    printDot: boolean;
    printLyric: boolean;

    /*---- Printout > PrintObject -----------------------------------------------------------*/

    printObject: boolean;

    /*---- Printout > PrintSpacing ----------------------------------------------------------*/

    printSpacing: boolean;

    /*---- TimeOnly -------------------------------------------------------------------------*/

    timeOnly: string;

    /*---- Util -----------------------------------------------------------------------------*/

    ensureNotationsWrittable() {
        this.notations = this.notations || [{}];
    }
    get notationObj(): Notations {
        return this.notations ? this.notations[0] : Object.freeze({});
    }

    ensureArticulationsWrittable() {
        this.ensureNotationsWrittable();
        this.notationObj.articulations = this.notationObj.articulations || [{}];
    }
    get articulationObj(): Articulations {
        return this.notationObj.articulations ?
            this.notationObj.articulations[0] : Object.freeze({});
    }

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
    cleanNotations() {
        let notations = this.notations;

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

            this.notations = [notation];
        }

        function combine<T>(key: string): T[] {
            return reduce(notations, (memo: any, n:any) =>
                n[key] ? (memo||<T[]>[]).concat(n[key]) : memo, null);
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
            return reduce(notations, (memo: any, n:any) =>
                n[key] ? n[key] : memo, []);
        }
    }

    updateAccidental$(cursor: ICursor) {
        let pitch = this.pitch;
        if (!pitch) {
            return;
        }
        let actual = pitch.alter || 0;
        let accidentals = cursor.staff.accidentals$;
        invariant(!!accidentals,
            "Accidentals must already have been setup. Is there an Attributes element?");

        // TODO: this is no longer sufficient if multiple voices share a staff.
        let generalTarget = accidentals[pitch.step] || null;
        let target = accidentals[pitch.step + pitch.octave] || generalTarget;

        if (!target && generalTarget !== IChord.InvalidAccidental) {
            target = generalTarget;
        }

        let acc = this.accidental;

        if (!acc && (actual||0) !== (target||0)) {
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
            let glyphName = IChord.accidentalGlyphs[acc.accidental];
            invariant(glyphName in glyphBBoxes, "Expected a known glyph, got %s", glyphName);
            let width = glyphBBoxes[glyphName][0]*10;
            let {clef} = cursor.staff.attributes;
            // TODO: `let clef = cursor.part.attributes.clefs[cursor.staff.idx]`

            if (IChord.onLedger(this, clef)) {
                acc.defaultX = -4.1;
            } else {
                acc.defaultX = -2.04;
            }

            acc.defaultX -= width;

            acc.defaultY = 0;

            if (acc.editorial && !acc.parentheses || acc.bracket) {
                // We don't allow an accidental to be editorial but not have parentheses.
                acc.parentheses = true;
            }

            if (acc.parentheses) {
                acc.defaultX -= 10;
            }
        }

        this.accidental = acc;
    }
}

export default NoteImpl;
