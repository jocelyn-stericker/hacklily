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

import ChordModelImpl   = require("./chordImpl"); // @cyclic

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
        var self : {[key:string]: any} = <any> this;

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
            var count                   = note.noteType ? note.noteType.duration : parent.count;
            if (count) {
                parent.count            = count;
            }

            parent.timeModification     = note.timeModification || parent.timeModification;
        }

        /* Properties owned by NoteImpl */
        var properties                  = [
            "pitch", "unpitched", "noteheadText", "accidental", "instrument",
            "attack", "endDynamics", "lyrics", "notations", "stem", "cue", "ties", "dynamics", "duration",
            "play", "staff", "grace", "notehead", "release", "pizzicato", "beams", "voice", "footnote", "level",
            "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight", "fontStyle", "fontSize",
            "color", "printDot", "printLyric", "printObject", "printSpacing", "timeOnly" ];

        _.forEach(properties, setIfDefined);

        this.flattenNotations();

        function setIfDefined(property: string) {
            if (note.hasOwnProperty(property) && (<any>note)[property] !== null) {
                self[property]          = <any> (<any>note)[property];
            }
        }
    }

    /*---- NoteImpl -------------------------------------------------------------------------*/

    toJSON(): {} {
        var clone: {[key: string]: any} = {};

        /* Properties owned by parent */
        if (this.pitch) {
            clone["pitch"]              = this.pitch;
        }
        if (this.rest) {
            clone["rest"]               = this.rest;
        }
        if (this.chord) {
            clone["chord"]              = this.chord;
        }
        if (this.color) {
            clone["color"]              = this.color;
        }
        if (this.noteType) {
            clone["noteType"]           = this.noteType;
        }
        if (this.timeModification) {
            clone["timeModification"]   = this.timeModification;
        }

        /* Properties owned by MNote */
        for (var key in this) {
            if (this.hasOwnProperty(key) && key[0] !== "_" && !!(<any>this)[key]) {
                clone[key] = (<any>this)[key];
            }
        }
        return clone;
    }

    toXML() {
        return MusicXML.serialize.note(this);
    }

    inspect() {
        return this.toXML();
    }

    validate$() {
        this.flattenNotations();
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
        return _.times(this._parent.dots, () => <MusicXML.Dot> {
            // TODO: save/restore dot formatting
            // TODO: display dot formatting
        });
    }
    set dots(dots: MusicXML.Dot[]) {
        this._parent.dots = dots.length;
    }

    get noteType(): MusicXML.Type {
        return {
            duration: this._parent.count,
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
        var hex = this._color.toString(16);
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
    flattenNotations() {
        if (this.notations) {
            var notations = this.notations;
            var notation: MusicXML.Notations = {
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
            this.notations = [notation];
        }

        function combine<T>(key: string): T[] {
            return _.reduce(notations, (memo: any, n:any) =>
                n[key] ? (memo||<T[]>[]).concat(n[key]) : memo, null);
        }

        function combineArticulations(key: string): MusicXML.Articulations[] {
            var array = combine<MusicXML.Articulations>(key);
            if (!array) {
                return null;
            }
            var articulations: MusicXML.Articulations = <any> {};
            for (var i = 0; i < array.length; ++i) {
                for (var akey in array[i]) {
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
}

export = NoteImpl;
