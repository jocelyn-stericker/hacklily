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

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import ChordModelImpl   = require("./chordImpl"); // @cyclic
import Engine           = require("../engine");
import SMuFL            = require("../smufl");

/**
 * Represents a note in a ChordImpl.
 * 
 * Gotchas:
 *  - You need to set a a noteType, not a noteType.duration. Setting noteType.duration
 *    has no effect.
 */
class NoteImpl implements MusicXML.Note {
    _parent: ChordModelImpl;
    _idx: number;

    constructor(parent: ChordModelImpl, idx: number, note: MusicXML.Note,
            updateParent: boolean = true) {
        let self : {[key:string]: any} = <any> this;

        /* Link to parent */
        this._parent                    = parent;
        this._idx                       = idx;

        if (note.pitch) {
            note.pitch.step             = note.pitch.step.toUpperCase();
        }

        /* Properties owned by parent */
        if (updateParent) {
            parent.dots                 = (note.dots || []).length;
            if (note.rest) {
                this.rest               = note.rest; // Assigns parent
            }
            let count                   = note.noteType ? note.noteType.duration : parent.count;
            if (count) {
                parent.count            = count;
            }

            parent.timeModification     = note.timeModification || parent.timeModification;
        }

        /* Properties owned by NoteImpl */
        let properties                  = [
            "pitch", "unpitched", "noteheadText", "accidental", "instrument",
            "attack", "endDynamics", "lyrics", "notations", "stem", "cue", "ties", "dynamics", "duration",
            "play", "staff", "grace", "notehead", "release", "pizzicato", "beams", "voice", "footnote", "level",
            "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle", "fontSize",
            "color", "printDot", "printLyric", "printObject", "printSpacing", "timeOnly" ];

        _.forEach(properties, setIfDefined);

        this.cleanNotations();

        if (!this.staff) {
            this.staff = 1;
        }

        function setIfDefined(property: string) {
            if (note.hasOwnProperty(property) && (<any>note)[property] !== null) {
                self[property]          = <any> (<any>note)[property];
            }
        }
    }

    /*---- NoteImpl -------------------------------------------------------------------------*/

    toXML() {
        return MusicXML.serialize.note(this);
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

    /*---- MusicXML.Note --------------------------------------------------------------------*/

    /*---- MusicXML.Note > Core -------------------------------------------------------------*/

    get chord(): MusicXML.Chord {
        return this._idx + 1 !== this._parent.length;
    }

    get rest(): MusicXML.Rest {
        return this._parent.rest ? {
            measure: this._parent.wholebar$,
            displayStep: this._restDisplayStep,
            displayOctave: this._restDisplayOctave
        } : null;
    }
    set rest(rest: MusicXML.Rest) {
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

    get dots(): MusicXML.Dot[] {
        let offset = this.defaultY % 10 === 0 ? 5 : 0;
        return _.times(this._parent.dots, () => <MusicXML.Dot> {
            defaultY: offset
            // TODO: save/restore dot formatting
            // TODO: display dot formatting
        });
    }
    set dots(dots: MusicXML.Dot[]) {
        this._parent.dots = dots.length;
    }

    get noteType(): MusicXML.Type {
        return {
            duration: this._parent.satieMultipleRest ? MusicXML.Count.Whole : this._parent.count,
            size: MusicXML.SymbolSize.Full // TODO: grace, cue
        };
    }

    set noteType(type: MusicXML.Type) {
        // TODO: grace, cue
        this._parent.count = type.duration;
    }

    get timeModification(): MusicXML.TimeModification {
        return this._parent.timeModification;
    }

    set timeModification(tm: MusicXML.TimeModification) {
        this._parent.timeModification = tm;
    }

    pitch:              MusicXML.Pitch;

    /*---- MusicXML.Note > Extended ---------------------------------------------------------*/

    unpitched:          MusicXML.Unpitched;
    noteheadText:       MusicXML.NoteheadText;
    accidental:         MusicXML.Accidental;
    instrument:         MusicXML.Instrument;
    attack:             number;
    endDynamics:        number;
    lyrics:             MusicXML.Lyric[];
    /**
     * Do not modify notations. Instead use notationObj and articulationObj
     */
    notations:          MusicXML.Notations[];
    get stem(): MusicXML.Stem {
        return this._parent.stem;
    }
    set stem(stem: MusicXML.Stem) {
        this._parent.stem = stem;
    }
    cue:                MusicXML.Cue;
    duration:           number;
    /**
     * This applies to the sound only.
     * s.a. notationObj.tieds
     */
    ties:               MusicXML.Tie[];
    dynamics:           number;
    play:               MusicXML.Play;
    staff:              number;                 // See prototype.
    grace:              MusicXML.Grace;
    notehead:           MusicXML.Notehead;
    release:            number;
    pizzicato:          boolean;
    beams:              MusicXML.Beam[];

    /*---- MusicXML.PrintStyle --------------------------------------------------------------*/

    /*---- MusicXML.PrintStyle >> EditorialVoice --------------------------------------------*/

    voice:              number;
    footnote:           MusicXML.Footnote;
    level:              MusicXML.Level;

    /*---- MusicXML.PrintStyle >> Position --------------------------------------------------*/

    defaultX:           number; // ignored for now
    relativeY:          number;
    defaultY:           number;
    relativeX:          number;

    /*---- MusicXML.PrintStyle >> Font ------------------------------------------------------*/

    fontFamily:         string;
    fontWeight:         MusicXML.NormalBold;
    fontStyle:          MusicXML.NormalItalic;
    fontSize:           string;

    /*---- MusicXML.PrintStyle >> Color -----------------------------------------------------*/

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

    private _color:     number = 0x000000;

    /*---- MusicXML.Printout ----------------------------------------------------------------*/

    printDot:           boolean;
    printLyric:         boolean;

    /*---- MusicXML.Printout >> PrintObject -------------------------------------------------*/

    printObject:        boolean;

    /*---- MusicXML.Printout >> PrintSpacing ------------------------------------------------*/

    printSpacing:       boolean;

    /*---- MusicXML.TimeOnly ----------------------------------------------------------------*/

    timeOnly:           string;

    /*---- Util -----------------------------------------------------------------------------*/

    ensureNotationsWrittable() {
        this.notations = this.notations || [{}];
    }
    get notationObj(): MusicXML.Notations {
        return this.notations ? this.notations[0] : Object.freeze({});
    }

    ensureArticulationsWrittable() {
        this.ensureNotationsWrittable();
        this.notationObj.articulations = this.notationObj.articulations || [{}];
    }
    get articulationObj(): MusicXML.Articulations {
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
            let notation: MusicXML.Notations = {
                articulations:          combineArticulations                ("articulations"),
                accidentalMarks:        combine<MusicXML.AccidentalMark>    ("accidentalMarks"),
                arpeggiates:            combine<MusicXML.Arpeggiate>        ("arpeggiates"),
                dynamics:               combine<MusicXML.Dynamics>          ("dynamics"),
                fermatas:               combine<MusicXML.Fermata>           ("fermatas"),
                glissandos:             combine<MusicXML.Glissando>         ("glissandos"),
                nonArpeggiates:         combine<MusicXML.NonArpeggiate>     ("nonArpeggiates"),
                ornaments:              combine<MusicXML.Ornaments>         ("ornaments"),
                otherNotations:         combine<MusicXML.OtherNotation>     ("otherNotations"),
                slides:                 combine<MusicXML.Slide>             ("slides"),
                slurs:                  combine<MusicXML.Slur>              ("slurs"),
                technicals:             combine<MusicXML.Technical>         ("technicals"),
                tieds:                  combine<MusicXML.Tied>              ("tieds"),
                tuplets:                combine<MusicXML.Tuplet>            ("tuplets"),
                footnote:                  last<MusicXML.Footnote>          ("footnote"),
                level:                     last<MusicXML.Level>             ("level"),
                printObject:               last<boolean>                    ("printObject")
            };

            _.forEach(notation.tieds, tied => {
                if (!tied.number) {
                    tied.number = 1;
                }
            });
            this.notations = [notation];
        }

        function combine<T>(key: string): T[] {
            return _.reduce(notations, (memo: any, n:any) =>
                n[key] ? (memo||<T[]>[]).concat(n[key]) : memo, null);
        }

        function combineArticulations(key: string): MusicXML.Articulations[] {
            let array = combine<MusicXML.Articulations>(key);
            if (!array) {
                return null;
            }
            let articulations: MusicXML.Articulations = <any> {};
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
            return _.reduce(notations, (memo: any, n:any) =>
                n[key] ? n[key] : memo, []);
        }
    }

    updateAccidental$(cursor: Engine.ICursor) {
        let pitch = this.pitch;
        if (!pitch) {
            return;
        }
        let actual = pitch.alter || 0;
        let accidentals = cursor.staff.accidentals$;
        invariant(!!accidentals, "Accidentals must already have been setup. Is there an Attributes element?");

        let generalTarget = accidentals[pitch.step] || null; // TODO: this is no longer sufficient due to `onion`.
        let target = accidentals[pitch.step + pitch.octave] || generalTarget;

        if (!target && generalTarget !== Engine.IChord.InvalidAccidental) {
            target = generalTarget;
        }

        let acc = this.accidental;

        if (!acc && (actual||0) !== (target||0)) {
            let accType: MusicXML.MxmlAccidental = null;
            switch (actual) {
                case 2:
                    accType = MusicXML.MxmlAccidental.DoubleSharp;
                    break;
                case 1.5:
                    accType = MusicXML.MxmlAccidental.ThreeQuartersSharp;
                    break;
                case 1:
                    accType = MusicXML.MxmlAccidental.Sharp;
                    break;
                case 0.5:
                    accType = MusicXML.MxmlAccidental.QuarterSharp;
                    break;
                case 0:
                    accType = MusicXML.MxmlAccidental.Natural;
                    break;
                case -0.5:
                    accType = MusicXML.MxmlAccidental.QuarterFlat;
                    break;
                case -1:
                    accType = MusicXML.MxmlAccidental.Flat;
                    break;
                case -1.5:
                    accType = MusicXML.MxmlAccidental.ThreeQuartersFlat;
                    break;
                case -2:
                    accType = MusicXML.MxmlAccidental.DoubleFlat;
                    break;
                default:
                    invariant(false, "Not implemented: unknown accidental for offset %s", actual);
            }

            acc = {
                accidental: accType
            };
        }

        // If the encoding software tells us what kind of accidental we have, we trust it. Otherwise...
        // TODO: Check cursor.header.identification.encoding.supports to see if we can actually trust it.
        // TODO: Re-enable this logic.
        if (!acc && actual === target) {
            // We don't need to show an accidental if all of these conditions are met:

            // 1. The note has the same accidental on other octave (if the note is on other octaves)
            // let noConflicts = target === generalTarget || generalTarget === Engine.IChord.InvalidAccidental;

            // 2. The note has the same accidental on all other voice (in the same bar, in the past)
            // for (let j = 0; j < ctx.accidentalsByStaff.length && noConflicts; ++j) {
            //     if (ctx.accidentalsByStaff[j] && target !== or3(ctx.accidentalsByStaff[j][pitch.step + pitch.octave],
            //             ctx.accidentalsByStaff[j][pitch.step], target)) {
            //         noConflicts = false;
            //     }
            // }

            // // 3. The note has the same accidental on other voices with the same note (right now!)
            // let concurrentNotes = ctx.findVertical(c => c.isNote);
            // for (let j = 0; j < concurrentNotes.length && noConflicts; ++j) {
            //     let otherChord = concurrentNotes[j].note.chord;
            //     noConflicts = noConflicts && !_hasConflict(otherChord, pitch.step, target);
            // }

            // // 4. There isn't ambiguity because or a barline and this is the first beat.
            // if (ctx.division === 0) {
            //     let prevBarOrNote = ctx.prev(c => c.isNote && !c.isRest || c.type === Engine.IModel.Type.Barline);
            //     if (prevBarOrNote && prevBarOrNote.type === C.Type.Barline) {
            //         let prevNote = ctx.prev(
            //             c => c.isNote && _.any(c.note.chord, c => c.step === pitch.step) ||
            //             c.type === C.Type.Barline, 2);
            //         if (prevNote && prevNote.type !== C.Type.Barline) {
            //             noConflicts = noConflicts && !_hasConflict(prevNote.note.chord, pitch.step, target);
            //         }
            //     }
            // }

            // if (noConflicts) {
            //     result[i] = NaN; // no accidental
            //     continue;
            // } else {
            //     paren = true;
            // }
        }

        // assert(actual !== Engine.IChord.InvalidAccidental, "Accidental is invalid");
        // actual is the result
        // paren is if there is a ( ).

        if (acc) {
            let glyphName = Engine.IChord.accidentalGlyphs[acc.accidental];
            invariant(glyphName in SMuFL.bboxes, "Expected a known glyph, got %s", glyphName);
            let width = SMuFL.bboxes[glyphName][0]*10;

            if (Engine.IChord.onLedger(this, cursor.staff.attributes[cursor.segment.part].clefs[cursor.staff.idx])) {
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

export = NoteImpl;
