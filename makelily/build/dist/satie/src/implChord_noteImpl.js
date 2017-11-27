"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var invariant = require("invariant");
var private_chordUtil_1 = require("./private_chordUtil");
var private_smufl_1 = require("./private_smufl");
var private_util_1 = require("./private_util");
/**
 * Represents a note in a ChordImpl.
 *
 * Gotchas:
 *  - You need to set a a noteType, not a noteType.duration. Setting noteType.duration
 *    has no effect.
 */
var NoteImpl = /** @class */ (function () {
    function NoteImpl(parent, idx, note, updateParent) {
        if (updateParent === void 0) { updateParent = true; }
        this._class = "Note";
        var self = this;
        /* Link to parent */
        Object.defineProperty(this, "_parent", {
            enumerable: false,
            value: parent
        });
        this._idx = idx;
        /* Properties owned by NoteImpl */
        var properties = [
            "pitch", "unpitched", "noteheadText", "accidental", "instrument",
            "attack", "endDynamics", "lyrics", "notations", "stem", "cue",
            "ties", "dynamics", "duration", "play", "staff", "grace", "notehead",
            "release", "pizzicato", "beams", "voice", "footnote", "level",
            "relativeY", "defaultY", "relativeX", "fontFamily", "fontWeight",
            "fontStyle", "fontSize", "color", "printDot", "printLyric", "printObject",
            "printSpacing", "timeOnly", "dots", "noteType", "timeModificiation",
            "rest",
        ];
        lodash_1.forEach(properties, setIfDefined);
        function setIfDefined(property) {
            if (note.hasOwnProperty(property) && note[property] !== undefined) {
                self[property] = note[property];
            }
        }
    }
    Object.defineProperty(NoteImpl.prototype, "stem", {
        get: function () {
            return this._parent.stem;
        },
        set: function (stem) {
            this._parent.stem = stem;
        },
        enumerable: true,
        configurable: true
    });
    /*---- Implementation -------------------------------------------------------------------*/
    NoteImpl.prototype.toXML = function () {
        return musicxml_interfaces_1.serializeNote(this);
    };
    NoteImpl.prototype.toJSON = function () {
        var _a = this, pitch = _a.pitch, unpitched = _a.unpitched, noteheadText = _a.noteheadText, accidental = _a.accidental, instrument = _a.instrument, attack = _a.attack, endDynamics = _a.endDynamics, lyrics = _a.lyrics, notations = _a.notations, stem = _a.stem, cue = _a.cue, ties = _a.ties, dynamics = _a.dynamics, duration = _a.duration, play = _a.play, staff = _a.staff, grace = _a.grace, notehead = _a.notehead, release = _a.release, pizzicato = _a.pizzicato, beams = _a.beams, voice = _a.voice, footnote = _a.footnote, level = _a.level, relativeY = _a.relativeY, defaultY = _a.defaultY, relativeX = _a.relativeX, fontFamily = _a.fontFamily, fontWeight = _a.fontWeight, fontStyle = _a.fontStyle, fontSize = _a.fontSize, color = _a.color, printDot = _a.printDot, printLyric = _a.printLyric, printObject = _a.printObject, printSpacing = _a.printSpacing, timeOnly = _a.timeOnly, dots = _a.dots, noteType = _a.noteType, timeModification = _a.timeModification, rest = _a.rest;
        return {
            pitch: pitch, unpitched: unpitched, noteheadText: noteheadText, accidental: accidental, instrument: instrument,
            attack: attack, endDynamics: endDynamics, lyrics: lyrics, notations: notations, stem: stem, cue: cue,
            ties: ties, dynamics: dynamics, duration: duration, play: play, staff: staff, grace: grace, notehead: notehead,
            release: release, pizzicato: pizzicato, beams: beams, voice: voice, footnote: footnote, level: level,
            relativeY: relativeY, defaultY: defaultY, relativeX: relativeX, fontFamily: fontFamily, fontWeight: fontWeight,
            fontStyle: fontStyle, fontSize: fontSize, color: color, printDot: printDot, printLyric: printLyric, printObject: printObject,
            printSpacing: printSpacing, timeOnly: timeOnly, noteType: noteType, dots: dots, timeModification: timeModification,
            rest: rest,
            _class: "Note",
        };
    };
    NoteImpl.prototype.inspect = function () {
        return this.toXML();
    };
    NoteImpl.prototype.refresh = function (cursor) {
        var _this = this;
        this.cleanNotations(cursor);
        if (this.pitch && this.pitch.step !== this.pitch.step.toUpperCase()) {
            cursor.patch(function (voice) { return voice.note(_this._idx, function (note) { return note.pitch(function (pitch) { return pitch.step(_this.pitch.step.toUpperCase()); }); }); });
        }
        if (this.grace && this.cue) {
            cursor.patch(function (voice) { return voice.note(_this._idx, function (note) { return note.cue(null); }); });
        }
        if (this.unpitched && (this.rest || this.pitch)) {
            cursor.patch(function (voice) { return voice.note(_this._idx, function (note) { return note.unpitched(null); }); });
        }
        if (this.pitch && this.rest) {
            cursor.patch(function (voice) { return voice.note(_this._idx, function (note) { return note.pitch(null); }); });
        }
        invariant(cursor.segmentInstance.ownerType === "voice", "Expected to be in voice's context during validation");
        if (this.voice !== cursor.segmentInstance.owner) {
            cursor.patch(function (partBuilder) { return partBuilder
                .note(_this._idx, function (note) { return note
                .voice(cursor.segmentInstance.owner); }); });
        }
        var defaultY = (private_chordUtil_1.lineForClef(this, cursor.staffAttributes.clef) - 3) * 10;
        if (defaultY !== this.defaultY) {
            cursor.patch(function (voice) { return voice
                .note(_this._idx, function (note) { return note.defaultY(defaultY); }); });
        }
        var dotOffset = this.defaultY % 10 === 0 ? 5 : 0;
        if (!this.dots) {
            cursor.patch(function (voice) { return voice
                .note(_this._idx, function (note) { return note.dots([]); }); });
        }
        if (this.dots.some(function (n) { return n.defaultY !== dotOffset; })) {
            cursor.patch(function (voice) { return voice
                .note(_this._idx, function (note) {
                return lodash_1.reduce(_this.dots, function (note, _dot, idx) {
                    return note.dotsAt(idx, function (dot) { return dot.defaultY(dotOffset); });
                }, note);
            }); });
        }
        if (!this.staff) {
            cursor.patch(function (partBuilder) { return partBuilder
                .note(_this._idx, function (note) { return note
                .staff(1); }); });
        }
        this.updateAccidental(cursor);
    };
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
    NoteImpl.prototype.cleanNotations = function (cursor) {
        var _this = this;
        var notations = private_util_1.cloneObject(this.notations);
        if (notations) {
            var notation_1 = {
                accidentalMarks: combine("accidentalMarks"),
                arpeggiates: combine("arpeggiates"),
                articulations: combineArticulations("articulations"),
                dynamics: combine("dynamics"),
                fermatas: combine("fermatas"),
                footnote: last("footnote"),
                glissandos: combine("glissandos"),
                level: last("level"),
                nonArpeggiates: combine("nonArpeggiates"),
                ornaments: combine("ornaments"),
                otherNotations: combine("otherNotations"),
                printObject: last("printObject"),
                slides: combine("slides"),
                slurs: combine("slurs"),
                technicals: combine("technicals"),
                tieds: combine("tieds"),
                tuplets: combine("tuplets")
            };
            lodash_1.forEach(notation_1.tieds, function (tied) {
                if (!tied.number) {
                    tied.number = 1;
                }
            });
            lodash_1.forEach(notation_1.tuplets, function (tuplet) {
                if (!tuplet.tupletActual) {
                    tuplet.tupletActual = {};
                }
                if (!tuplet.tupletNormal) {
                    tuplet.tupletNormal = {};
                }
                if (!tuplet.tupletActual.tupletNumber) {
                    tuplet.tupletActual.tupletNumber = {
                        text: String(_this.timeModification.actualNotes)
                    };
                }
                if (!tuplet.tupletNormal.tupletNumber) {
                    tuplet.tupletNormal.tupletNumber = {
                        text: String(_this.timeModification.normalNotes)
                    };
                }
                if (!tuplet.tupletNormal.tupletDots) {
                    tuplet.tupletNormal.tupletDots =
                        lodash_1.map(_this.timeModification.normalDots, function () { return ({}); });
                }
            });
            cursor.patch(function (voice) { return voice.note(_this._idx, function (note) { return note.notations([notation_1]); }); });
        }
        function combine(key) {
            return lodash_1.reduce(notations, function (memo, n) {
                return n[key] ? (memo || []).concat(n[key]) : memo;
            }, null);
        }
        function combineArticulations(key) {
            var array = combine(key);
            if (!array) {
                return null;
            }
            var articulations = {};
            for (var i = 0; i < array.length; ++i) {
                for (var akey in array[i]) {
                    if (array[i].hasOwnProperty(akey)) {
                        articulations[akey] = array[i][akey];
                    }
                }
            }
            return [articulations];
        }
        function last(key) {
            return lodash_1.reduce(notations, function (memo, n) {
                return n[key] ? n[key] : memo;
            }, []);
        }
    };
    NoteImpl.prototype.updateAccidental = function (cursor) {
        var _this = this;
        var pitch = this.pitch;
        if (!pitch) {
            return;
        }
        var actual = pitch.alter || 0;
        var accidentals = cursor.staffAccidentals;
        invariant(!!accidentals, "Accidentals must already have been setup. Is there an Attributes element?");
        // TODO: this is no longer sufficient if multiple voices share a staff.
        var generalTarget = accidentals[pitch.step] || null;
        var target = accidentals[pitch.step + pitch.octave];
        if (isNaN(target) && generalTarget !== private_chordUtil_1.InvalidAccidental) {
            target = generalTarget;
        }
        var acc = private_util_1.cloneObject(this.accidental);
        if (!acc && (actual || 0) !== (target || 0)) {
            var accType = null;
            switch (actual) {
                case 2:
                    accType = musicxml_interfaces_1.MxmlAccidental.DoubleSharp;
                    break;
                case 1.5:
                    accType = musicxml_interfaces_1.MxmlAccidental.ThreeQuartersSharp;
                    break;
                case 1:
                    accType = musicxml_interfaces_1.MxmlAccidental.Sharp;
                    break;
                case 0.5:
                    accType = musicxml_interfaces_1.MxmlAccidental.QuarterSharp;
                    break;
                case 0:
                    accType = musicxml_interfaces_1.MxmlAccidental.Natural;
                    break;
                case -0.5:
                    accType = musicxml_interfaces_1.MxmlAccidental.QuarterFlat;
                    break;
                case -1:
                    accType = musicxml_interfaces_1.MxmlAccidental.Flat;
                    break;
                case -1.5:
                    accType = musicxml_interfaces_1.MxmlAccidental.ThreeQuartersFlat;
                    break;
                case -2:
                    accType = musicxml_interfaces_1.MxmlAccidental.DoubleFlat;
                    break;
                default:
                    throw new Error("Not implemented: unknown accidental for offset " + actual);
            }
            acc = {
                accidental: accType
            };
        }
        if (acc) {
            var glyphName = private_chordUtil_1.accidentalGlyphs[acc.accidental];
            invariant(glyphName in private_smufl_1.bboxes, "Expected a known glyph, got %s", glyphName);
            var width = private_smufl_1.bboxes[glyphName][0] * 10;
            var clef = cursor.staffAttributes.clef;
            // TODO: `let clef = cursor.part.attributes.clefs[cursor.staffIdx]`
            if (private_chordUtil_1.onLedger(this, clef)) {
                acc.defaultX = -4.1;
            }
            else {
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
        if (!lodash_1.isEqual(private_util_1.cloneObject(this.accidental), acc) && cursor.patch) {
            cursor.patch(function (part) { return part.note(_this._idx, function (note) { return note.accidental(acc); }); });
        }
    };
    return NoteImpl;
}());
exports.default = NoteImpl;
//# sourceMappingURL=implChord_noteImpl.js.map