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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b;
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var document_1 = require("./document");
var private_metre_checkBeaming_1 = require("./private_metre_checkBeaming");
var private_chordUtil_1 = require("./private_chordUtil");
var private_smufl_1 = require("./private_smufl");
var implChord_noteImpl_1 = __importDefault(require("./implChord_noteImpl"));
var implChord_lyrics_1 = require("./implChord_lyrics");
var implChord_notation_1 = require("./implChord_notation");
var IDEAL_STEM_HEIGHT = 35;
var MIN_STEM_HEIGHT = 30;
var BASE_GRACE_WIDTH = 11.4;
var BASE_STD_WIDTH = 30;
var GRACE_FLATTEN_FACTOR = 0.1;
var ACCIDENTAL_WIDTH = 0.73;
var LOG_STRETCH = 28;
var countToNotehead = (_a = {},
    _a[musicxml_interfaces_1.Count.Maxima] = "noteheadDoubleWhole",
    _a[musicxml_interfaces_1.Count.Long] = "noteheadDoubleWhole",
    _a[musicxml_interfaces_1.Count.Breve] = "noteheadDoubleWhole",
    _a[musicxml_interfaces_1.Count.Whole] = "noteheadWhole",
    _a[-1] = "noteheadWhole",
    _a[musicxml_interfaces_1.Count.Half] = "noteheadHalf",
    _a[musicxml_interfaces_1.Count.Quarter] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count.Eighth] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._16th] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._32nd] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._64th] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._128th] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._256th] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._512th] = "noteheadBlack",
    _a[musicxml_interfaces_1.Count._1024th] = "noteheadBlack",
    _a);
var countToRest = (_b = {},
    _b[musicxml_interfaces_1.Count.Maxima] = "restLonga",
    _b[musicxml_interfaces_1.Count.Long] = "restLonga",
    _b[musicxml_interfaces_1.Count.Breve] = "restDoubleWhole",
    _b[musicxml_interfaces_1.Count.Whole] = "restWhole",
    _b[-1] = "restWhole",
    _b[musicxml_interfaces_1.Count.Half] = "restHalf",
    _b[musicxml_interfaces_1.Count.Quarter] = "restQuarter",
    _b[musicxml_interfaces_1.Count.Eighth] = "rest8th",
    _b[musicxml_interfaces_1.Count._16th] = "rest16th",
    _b[musicxml_interfaces_1.Count._32nd] = "rest32nd",
    _b[musicxml_interfaces_1.Count._64th] = "rest64th",
    _b[musicxml_interfaces_1.Count._128th] = "rest128th",
    _b[musicxml_interfaces_1.Count._256th] = "rest256th",
    _b[musicxml_interfaces_1.Count._512th] = "rest512th",
    _b[musicxml_interfaces_1.Count._1024th] = "rest1024th",
    _b);
/**
 * A model that represents 1 or more notes in the same voice, starting on the same beat, and each
 * with the same duration. Any number of these notes may be rests.
 */
var ChordModelImpl = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    /**
     * We accept either a Note from musicxml-interfaces, or an IChord, which
     * is an array-like element of Notes. In either case, we create a deep copy.
     */
    function ChordModelImpl(spec) {
        var _this = this;
        this.length = 0;
        this._init = false;
        if (!!spec) {
            if (spec._class === "Note") {
                this[0] = new implChord_noteImpl_1.default(this, 0, spec);
                this.length = 1;
            }
            else if (spec.length) {
                lodash_1.forEach(spec, function (note, idx) {
                    _this[idx] = new implChord_noteImpl_1.default(_this, idx, note);
                });
                this.length = spec.length;
            }
        }
    }
    Object.defineProperty(ChordModelImpl.prototype, "staffIdx", {
        get: function () {
            return this[0].staff || 1;
        },
        set: function (n) {
            // Ignore.
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "satieLedger", {
        get: function () {
            return private_chordUtil_1.ledgerLines(this, this._clef);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "rest", {
        get: function () {
            // TODO: typing
            return lodash_1.some(this, function (note) { return note.rest; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "timeModification", {
        get: function () {
            return this[0].timeModification;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "notes", {
        get: function () {
            var _this = this;
            return lodash_1.times(this.length, function (i) { return _this[i]; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "count", {
        get: function () {
            var noteType = this[0].noteType;
            if (!noteType) {
                return null;
            }
            return noteType.duration;
        },
        enumerable: true,
        configurable: true
    });
    ChordModelImpl.prototype.push = function () {
        var _this = this;
        var notes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            notes[_i] = arguments[_i];
        }
        lodash_1.forEach(notes, function (note) {
            _this[_this.length] = new implChord_noteImpl_1.default(_this, _this.length, note);
            ++_this.length;
        });
        return this.length;
    };
    ChordModelImpl.prototype.splice = function (start, deleteCount) {
        var _this = this;
        var replacements = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            replacements[_i - 2] = arguments[_i];
        }
        var notes = this.notes;
        notes.splice.apply(notes, [start, deleteCount].concat(replacements));
        lodash_1.times(this.length, function (i) { return delete _this[i]; });
        lodash_1.forEach(notes, function (n, i) {
            invariant_1.default(n instanceof implChord_noteImpl_1.default, "Notes must be NoteImpls in Chords");
            _this[i] = n;
        });
        this.length = notes.length;
    };
    ChordModelImpl.prototype.refresh = function (cursor) {
        var _this = this;
        if (!this[0].noteType || !this[0].noteType.duration) {
            var count_1 = this._implyCountFromPerformanceData(cursor);
            cursor.dangerouslyPatchWithoutValidation(function (voice) {
                return lodash_1.reduce(_this, function (builder, note, idx) {
                    return builder.note(idx, function (j) { return j.noteType({ duration: count_1 }); });
                }, voice);
            });
        }
        try {
            var divCount = private_chordUtil_1.divisions(this, cursor.staffAttributes);
            if (divCount !== this.divCount) {
                cursor.fixup([
                    {
                        p: [
                            cursor.measureInstance.uuid,
                            "parts",
                            cursor.segmentInstance.part,
                            "voices",
                            cursor.segmentInstance.owner,
                            cursor.segmentPosition,
                            "divCount",
                        ],
                        oi: divCount,
                        od: this.divCount,
                    },
                ]);
            }
        }
        catch (err) {
            if (err instanceof private_chordUtil_1.FractionalDivisionsException) {
                cursor.fixup([
                    {
                        p: ["divisions"],
                        oi: err.requiredDivisions,
                        od: cursor.staffAttributes.divisions,
                    },
                ]);
            }
        }
        invariant_1.default(isFinite(this.divCount), "The beat count must be numeric");
        invariant_1.default(this.divCount >= 0, "The beat count must be non-negative.");
        var direction = this._pickDirection(cursor);
        var clef = cursor.staffAttributes.clef;
        this._clef = clef;
        lodash_1.forEach(this, function (note, idx) {
            if (!note.grace && note.duration !== _this.divCount) {
                cursor.patch(function (partBuilder) {
                    return partBuilder.note(idx, function (note) { return note.duration(_this.divCount); });
                });
            }
            if (idx > 0 && !note.chord) {
                cursor.patch(function (partBuilder) {
                    return partBuilder.note(idx, function (note) { return note.chord({}); });
                });
            }
            else if (idx === 0 && note.chord) {
                cursor.patch(function (partBuilder) {
                    return partBuilder.note(idx, function (note) { return note.chord(null); });
                });
            }
            note.refresh(cursor);
            note.updateAccidental(cursor);
        });
        // Check for second intervals:
        var notesSortedByY = this.notes.sort(function (a, b) { return a.defaultY - b.defaultY; });
        var _loop_1 = function (i) {
            if (i + 1 < notesSortedByY.length &&
                notesSortedByY[i + 1].defaultY - notesSortedByY[i].defaultY === 5) {
                if (direction > 0) {
                    if (notesSortedByY[i].relativeX !== 0 ||
                        notesSortedByY[i + 1].relativeX !== 13) {
                        cursor.patch(function (voice) {
                            return voice
                                .note(notesSortedByY[i]._idx, function (note) { return note.relativeX(0); })
                                .note(notesSortedByY[i + 1]._idx, function (note) { return note.relativeX(13); });
                        });
                    }
                }
                else {
                    if (notesSortedByY[i].relativeX !== -13 ||
                        notesSortedByY[i + 1].relativeX !== 0) {
                        cursor.patch(function (voice) {
                            return voice
                                .note(notesSortedByY[i]._idx, function (note) { return note.relativeX(-13); })
                                .note(notesSortedByY[i + 1]._idx, function (note) { return note.relativeX(0); });
                        });
                    }
                }
                ++i;
            }
            else {
                if (notesSortedByY[i].relativeX !== 0) {
                    cursor.patch(function (voice) {
                        return voice.note(notesSortedByY[i]._idx, function (note) { return note.relativeX(0); });
                    });
                }
            }
            out_i_1 = i;
        };
        var out_i_1;
        for (var i = 0; i < notesSortedByY.length; ++i) {
            _loop_1(i);
            i = out_i_1;
        }
        this.wholebar =
            this.divCount === private_chordUtil_1.barDivisions(cursor.staffAttributes) ||
                this.divCount === -1;
        var count = this.count;
        invariant_1.default(isFinite(count) && count !== null, "%s is not a valid count", count);
        for (var i = 0; i < this.length; ++i) {
            invariant_1.default(this[i].noteType.duration === count, "Inconsistent count (%s != %s)", this[i].noteType.duration, count);
        }
        this._checkMulitpleRest(cursor);
        this._implyNoteheads(cursor);
        if (!this._init) {
            if (private_chordUtil_1.countToIsBeamable[count]) {
                this.satieFlag = private_chordUtil_1.countToFlag[count];
            }
            else {
                this.satieFlag = null;
            }
            if (this._hasStem()) {
                this.satieStem = {
                    direction: direction,
                    stemHeight: this._getStemHeight(direction, clef),
                    stemStart: private_chordUtil_1.startingLine(this, direction, clef),
                };
                this.satieDirection = direction === 1 ? musicxml_interfaces_1.StemType.Up : musicxml_interfaces_1.StemType.Down;
            }
            else {
                this.satieStem = null;
                this.satieDirection = NaN;
            }
        }
    };
    ChordModelImpl.prototype.getLayout = function (cursor) {
        this._init = true;
        if (!this._layout) {
            this._layout = new ChordModelImpl.Layout();
        }
        this._layout.refresh(this, cursor);
        return this._layout;
    };
    ChordModelImpl.prototype.toJSON = function () {
        var data = lodash_1.map(this, function (note) { return note; });
        return data;
    };
    ChordModelImpl.prototype.toXML = function () {
        var xml = "";
        for (var i = 0; i < this.length; ++i) {
            xml += musicxml_interfaces_1.serializeNote(this[i]) + "\n";
        }
        return xml;
    };
    ChordModelImpl.prototype.inspect = function () {
        return this.toXML();
    };
    ChordModelImpl.prototype.calcWidth = function (shortest) {
        var accidentalWidth = this.calcAccidentalWidth();
        // TODO: Each note's width has a linear component proportional to log of its duration
        // with respect to the shortest length
        var extraWidth = this.divCount
            ? (Math.log(this.divCount) - Math.log(shortest)) * LOG_STRETCH
            : 0;
        var grace = this[0].grace;
        if (grace) {
            // TODO: Put grace notes in own segment
            extraWidth *= GRACE_FLATTEN_FACTOR;
        }
        var baseWidth = grace ? BASE_GRACE_WIDTH : BASE_STD_WIDTH;
        invariant_1.default(extraWidth >= 0, "Invalid extraWidth %s. shortest is %s, got %s", extraWidth, shortest, this.divCount);
        var totalWidth = baseWidth + extraWidth + accidentalWidth + this.calcDotWidth();
        return totalWidth;
    };
    ChordModelImpl.prototype.calcAccidentalWidth = function () {
        return (lodash_1.reduce(this, function (maxWidth, note) {
            var w = Math.max(maxWidth, note.accidental ? -note.accidental.defaultX : 0);
            return w;
        }, 0) * ACCIDENTAL_WIDTH);
    };
    ChordModelImpl.prototype.calcDotWidth = function () {
        if (this.wholebar || this.satieMultipleRest) {
            return 0;
        }
        return lodash_1.max(lodash_1.map(this, function (m) { return (m.dots || []).length; })) * 6;
    };
    ChordModelImpl.prototype._implyCountFromPerformanceData = function (cursor) {
        var _this = this;
        var count;
        var _a = cursor.staffAttributes, time = _a.time, divisions = _a.divisions;
        var ts = {
            beatType: time.beatTypes[0],
            beats: lodash_1.reduce(time.beats, function (sum, beat) { return sum + parseInt(beat, 10); }, 0),
        };
        var factor = ts.beatType / 4;
        var beats = factor * (this[0].duration / divisions);
        count = 4 / (this[0].duration / divisions);
        // Try dots
        var dotFactor = 1;
        var dots = 0;
        while (!isPO2(1 / (beats / dotFactor / 4))) {
            if (dots === 5) {
                dots = 0;
                break;
            }
            ++dots;
            dotFactor += Math.pow(1 / 2, dots);
        }
        if (dots > 0) {
            count = 1 / (beats / dotFactor / 4 / factor);
            cursor.patch(function (voiceA) {
                return lodash_1.reduce(lodash_1.times(_this.length), function (voice, idx) {
                    return voice.note(idx, function (note) { return note.dots(lodash_1.times(dots, function (dot) { return ({}); })); });
                }, voiceA);
            });
        }
        // Try tuplets
        // TODO
        // Try ties
        if (!isPO2(count)) {
            // Whole bar rests can still exist even when there's no single NOTE duration
            // that spans a bar.
            if (beats === ts.beats && !!this[0].rest) {
                count = musicxml_interfaces_1.Count.Whole;
            }
            else {
                var nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count) / Math.log(2)));
                count = nextPO2;
                // TODO: Add 1+ tie.
            }
        }
        // TODO: Find the best match for performance data
        function isPO2(n) {
            if (Math.abs(Math.round(n) - n) > 0.00001) {
                return false;
            }
            n = Math.round(n);
            /* tslint:disable */
            return !!n && !(n & (n - 1));
            /* tslint:enable */
        }
        return count;
    };
    ChordModelImpl.prototype._getStemHeight = function (direction, clef) {
        var heightFromOtherNotes = (private_chordUtil_1.highestLine(this, clef) - private_chordUtil_1.lowestLine(this, clef)) * 10;
        var start = private_chordUtil_1.heightDeterminingLine(this, direction, clef) * 10;
        var idealExtreme = start + direction * IDEAL_STEM_HEIGHT;
        var result;
        if (idealExtreme >= 65) {
            result = Math.max(MIN_STEM_HEIGHT, IDEAL_STEM_HEIGHT - (idealExtreme - 65));
        }
        else if (idealExtreme <= -15) {
            result = Math.max(MIN_STEM_HEIGHT, IDEAL_STEM_HEIGHT - (-15 - idealExtreme));
        }
        else {
            result = 35;
        }
        // All stems in the main voice should touch the center line.
        if (start > 30 && direction === -1 && start - result > 30) {
            result = start - 30;
        }
        else if (start < 30 && direction === 1 && start + result < 30) {
            result = 30 - start;
        }
        // Grace note stems are short (though still proportionally pretty tall)
        if (this[0].grace) {
            result *= 0.75;
        }
        result += heightFromOtherNotes;
        return result;
    };
    ChordModelImpl.prototype._pickDirection = function (cursor) {
        var clef = cursor.staffAttributes.clef;
        var avgLine = private_chordUtil_1.averageLine(this, clef);
        if (avgLine > 3) {
            return -1;
        }
        else if (avgLine < 3) {
            return 1;
        }
        else {
            // There's no "right answer" here. We'll follow what "Behind Bars" recommends.
            // TODO: Consider notes outside current bar
            // TODO: Consider notes outside current stave
            // TODO: Handle clef changes correctly
            var notes = cursor.segmentInstance.filter(function (el) {
                return cursor.factory.modelHasType(el, document_1.Type.Chord);
            });
            var nIdx = notes.indexOf(this);
            // 1. Continue the stem direction of surrounding stems that are in one
            //    direction only
            var linePrev = nIdx > 0 ? private_chordUtil_1.averageLine(notes[nIdx - 1], clef) : 3;
            if (linePrev === 3 && nIdx > 0) {
                // Note, the solution obtained may not be ideal, because we greedily resolve
                // ties in a forward direction.
                linePrev = notes[nIdx - 1].satieDirection === 1 ? 2.99 : 3.01;
            }
            var lineNext = nIdx + 1 < notes.length ? private_chordUtil_1.averageLine(notes[nIdx + 1], clef) : 3;
            if (linePrev > 3 && lineNext > 3) {
                return -1;
            }
            if (linePrev < 3 && lineNext < 3) {
                return 1;
            }
            // 2. When the stem direction varies within a bar, maintain the stem direction
            //    of the notes that are part of the same beat or half-bar.
            //    (Note: we use the more general beaming pattern instead of half-bar to
            //     decide boundries)
            var time = cursor.staffAttributes.time;
            var beamingPattern = private_metre_checkBeaming_1.getBeamingPattern(time);
            var bpDivisions = lodash_1.map(beamingPattern, function (seg) {
                return private_chordUtil_1.divisions(seg, cursor.staffAttributes);
            });
            var currDivision = cursor.segmentDivision;
            var prevDivisionStart = 0;
            var i = 0;
            for (; i < bpDivisions.length; ++i) {
                if (prevDivisionStart + bpDivisions[i] >= currDivision) {
                    break;
                }
                prevDivisionStart += bpDivisions[i];
            }
            var nextDivisionStart = prevDivisionStart + bpDivisions[i] || NaN;
            var prevExists = prevDivisionStart < currDivision;
            var nextExists = nextDivisionStart > currDivision + this.divCount;
            var considerPrev = prevExists ? notes[nIdx - 1] : null;
            var considerNext = nextExists ? notes[nIdx + 1] : null;
            if (considerPrev && !considerNext && linePrev !== 3) {
                return linePrev > 3 ? -1 : 1;
            }
            else if (considerNext && !considerPrev && lineNext !== 3) {
                return lineNext > 3 ? -1 : 1;
            }
            // 2b. Check beat when considerPrev && considerNext
            // TODO: Implement me
            // 3. When there is no clear-cut case for either direction, the convention
            //    is to use down-stem
            return -1;
        }
    };
    ChordModelImpl.prototype._checkMulitpleRest = function (cursor) {
        var measureStyle = cursor.staffAttributes.measureStyle;
        var multipleRest = measureStyle && measureStyle.multipleRest;
        if (multipleRest && multipleRest.count > 1) {
            this.satieMultipleRest = measureStyle.multipleRest;
        }
    };
    ChordModelImpl.prototype._implyNoteheads = function (cursor) {
        var _this = this;
        var measureStyle = cursor.staffAttributes.measureStyle;
        if (measureStyle) {
            lodash_1.forEach(this, function (note) {
                if (measureStyle.slash) {
                    note.notehead = note.notehead || { type: null };
                    note.notehead.type = musicxml_interfaces_1.NoteheadType.Slash;
                    if (!measureStyle.slash.useStems) {
                        note.stem = {
                            type: musicxml_interfaces_1.StemType.None,
                        };
                    }
                }
            });
        }
        if (this.rest) {
            if (this.satieMultipleRest) {
                this.noteheadGlyph = ["restHBar"];
            }
            else {
                this.noteheadGlyph = [countToRest[this.count]];
            }
        }
        else {
            this.noteheadGlyph = lodash_1.times(this.length, function () { return countToNotehead[_this.count]; });
        }
        this.noteheadGlyph = this.noteheadGlyph.map(function (stdGlyph, idx) {
            return private_chordUtil_1.getNoteheadGlyph(_this[idx].notehead, stdGlyph);
        });
    };
    ChordModelImpl.prototype._hasStem = function () {
        if (this[0] && this[0].stem && this[0].stem.type === musicxml_interfaces_1.StemType.None) {
            return false;
        }
        return private_chordUtil_1.countToHasStem[this.count];
    };
    return ChordModelImpl;
}());
(function (ChordModelImpl) {
    var Layout = /** @class */ (function () {
        function Layout() {
        }
        /*---- Implementation ----------------------------------------------------*/
        Layout.prototype.refresh = function (baseModel, cursor) {
            // ** this function should not modify baseModel **
            this.division = cursor.segmentDivision;
            var measureStyle = cursor.staffAttributes.measureStyle;
            if (measureStyle.multipleRest &&
                !measureStyle.multipleRestInitiatedHere) {
                // This is not displayed because it is part of a multirest.
                this.x = 0;
                this.expandPolicy = "none";
                return;
            }
            this.model = this._detachModelWithContext(cursor, baseModel);
            this.satieStem = baseModel.satieStem;
            this.satieFlag = baseModel.satieFlag;
            this.boundingBoxes = this._captureBoundingBoxes();
            var isWholeBar = baseModel.wholebar || baseModel.count === musicxml_interfaces_1.Count.Whole;
            this.expandPolicy =
                baseModel.satieMultipleRest || (baseModel.rest && isWholeBar)
                    ? "centered"
                    : "after";
            lodash_1.forEach(this.model, function (note) {
                var staff = note.staff || 1;
                invariant_1.default(!!staff, "Expected the staff to be a non-zero number, got %s", staff);
                var paddingTop = cursor.lineMaxPaddingTopByStaff[staff] || 0;
                var paddingBottom = cursor.lineMaxPaddingBottomByStaff[staff] || 0;
                cursor.lineMaxPaddingTopByStaff[staff] = Math.max(paddingTop, note.defaultY - 50);
                cursor.lineMaxPaddingBottomByStaff[staff] = Math.max(paddingBottom, -note.defaultY - 25);
            });
            var accidentalWidth = baseModel.calcAccidentalWidth();
            var totalWidth = baseModel.calcWidth(cursor.lineShortest);
            invariant_1.default(isFinite(totalWidth), "Invalid width %s", totalWidth);
            var noteheads = baseModel.noteheadGlyph;
            var widths = lodash_1.map(noteheads, private_smufl_1.getWidth);
            this.renderedWidth = lodash_1.max(widths);
            if (baseModel.satieMultipleRest || baseModel.count === musicxml_interfaces_1.Count.Whole) {
                lodash_1.forEach(this.model, function (note) { return (note.dots = []); });
            }
            this.x = cursor.segmentX + accidentalWidth;
            this.minSpaceAfter = this._getMinWidthAfter(cursor);
            this.minSpaceBefore = this._getMinWidthBefore(cursor);
            cursor.segmentX += totalWidth;
        };
        Layout.prototype._captureBoundingBoxes = function () {
            var _this = this;
            var bboxes = [];
            lodash_1.forEach(this.model, function (note) {
                var notations = private_chordUtil_1.notationObj(note); // TODO: detach this
                var bbn = implChord_notation_1.getBoundingRects(notations, note, _this);
                bboxes = bboxes.concat(bbn.bb);
                note.notations = [bbn.n];
            });
            return bboxes;
        };
        Layout.prototype._getMinWidthBefore = function (cursor) {
            return this._getLyricWidth(cursor) / 2;
        };
        Layout.prototype._getMinWidthAfter = function (cursor) {
            return this._getLyricWidth(cursor) / 2;
        };
        Layout.prototype._getLyricWidth = function (cursor) {
            var factor = (40 * 25.4) / 96; // 40 tenths in staff * pixelFactor
            return implChord_lyrics_1.getChordLyricWidth(this.model, factor);
        };
        Layout.prototype._detachModelWithContext = function (cursor, baseModel) {
            var _this = this;
            var model = lodash_1.map(baseModel, function (note, idx) {
                /* Here, we're extending each note to have the correct
                           * default position.  To do so, we use prototypical
                           * inheritance. See Object.create. */
                return Object.create(note, {
                    defaultX: {
                        get: function () {
                            return ((note.relativeX || 0) + (_this.overrideX || _this.x));
                        },
                    },
                    stem: {
                        get: function () {
                            return (baseModel.stem || {
                                type: baseModel.satieDirection,
                            });
                        },
                    },
                });
            });
            model.stemX = function () { return _this.overrideX || _this.x; };
            model.staffIdx = baseModel.staffIdx;
            model.divCount = baseModel.divCount;
            model.satieLedger = baseModel.satieLedger;
            model.noteheadGlyph = baseModel.noteheadGlyph;
            model.satieMultipleRest = baseModel.satieMultipleRest;
            model.satieUnbeamedTuplet = baseModel.satieUnbeamedTuplet;
            return model;
        };
        return Layout;
    }());
    ChordModelImpl.Layout = Layout;
    Layout.prototype.expandPolicy = "after";
    Layout.prototype.renderClass = document_1.Type.Chord;
    Layout.prototype.boundingBoxes = [];
})(ChordModelImpl || (ChordModelImpl = {}));
exports.default = ChordModelImpl;
//# sourceMappingURL=implChord_chordImpl.js.map