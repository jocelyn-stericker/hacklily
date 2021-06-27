/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var _a, _b;
import { Count, NoteheadType, StemType, serializeNote, } from "musicxml-interfaces";
import { forEach, times, reduce, map, max, some } from "lodash";
import invariant from "invariant";
import { Type } from "./document";
import { getBeamingPattern } from "./private_metre_checkBeaming";
import { ledgerLines, notationObj, countToIsBeamable, countToFlag, startingLine, averageLine, highestLine, lowestLine, heightDeterminingLine, countToHasStem, getNoteheadGlyph, divisions as calcDivisions, FractionalDivisionsException, barDivisions, } from "./private_chordUtil";
import { getWidth as getGlyphWidth } from "./private_smufl";
import NoteImpl from "./implChord_noteImpl";
import { getChordLyricWidth } from "./implChord_lyrics";
import { getBoundingRects } from "./implChord_notation";
var IDEAL_STEM_HEIGHT = 35;
var MIN_STEM_HEIGHT = 30;
var BASE_GRACE_WIDTH = 11.4;
var BASE_STD_WIDTH = 30;
var GRACE_FLATTEN_FACTOR = 0.1;
var ACCIDENTAL_WIDTH = 0.73;
var LOG_STRETCH = 28;
var countToNotehead = (_a = {},
    _a[Count.Maxima] = "noteheadDoubleWhole",
    _a[Count.Long] = "noteheadDoubleWhole",
    _a[Count.Breve] = "noteheadDoubleWhole",
    _a[Count.Whole] = "noteheadWhole",
    _a[-1] = "noteheadWhole",
    _a[Count.Half] = "noteheadHalf",
    _a[Count.Quarter] = "noteheadBlack",
    _a[Count.Eighth] = "noteheadBlack",
    _a[Count._16th] = "noteheadBlack",
    _a[Count._32nd] = "noteheadBlack",
    _a[Count._64th] = "noteheadBlack",
    _a[Count._128th] = "noteheadBlack",
    _a[Count._256th] = "noteheadBlack",
    _a[Count._512th] = "noteheadBlack",
    _a[Count._1024th] = "noteheadBlack",
    _a);
var countToRest = (_b = {},
    _b[Count.Maxima] = "restLonga",
    _b[Count.Long] = "restLonga",
    _b[Count.Breve] = "restDoubleWhole",
    _b[Count.Whole] = "restWhole",
    _b[-1] = "restWhole",
    _b[Count.Half] = "restHalf",
    _b[Count.Quarter] = "restQuarter",
    _b[Count.Eighth] = "rest8th",
    _b[Count._16th] = "rest16th",
    _b[Count._32nd] = "rest32nd",
    _b[Count._64th] = "rest64th",
    _b[Count._128th] = "rest128th",
    _b[Count._256th] = "rest256th",
    _b[Count._512th] = "rest512th",
    _b[Count._1024th] = "rest1024th",
    _b);
var Layout = /** @class */ (function () {
    function Layout() {
        /*---- IChordLayout ------------------------------------------------------*/
        // Prototype:
        this.boundingBoxes = [];
        this.renderClass = Type.Chord;
        this.expandPolicy = "after";
    }
    /*---- Implementation ----------------------------------------------------*/
    Layout.prototype.refresh = function (baseModel, cursor) {
        // ** this function should not modify baseModel **
        this.division = cursor.segmentDivision;
        var measureStyle = cursor.staffAttributes.measureStyle;
        if (measureStyle.multipleRest && !measureStyle.multipleRestInitiatedHere) {
            // This is not displayed because it is part of a multirest.
            this.x = 0;
            this.expandPolicy = "none";
            return;
        }
        this.model = this._detachModelWithContext(cursor, baseModel);
        this.satieStem = baseModel.satieStem;
        this.satieFlag = baseModel.satieFlag;
        this.boundingBoxes = this._captureBoundingBoxes();
        var isWholeBar = baseModel.wholebar || baseModel.count === Count.Whole;
        this.expandPolicy =
            baseModel.satieMultipleRest || (baseModel.rest && isWholeBar)
                ? "centered"
                : "after";
        forEach(this.model, function (note) {
            var staff = note.staff || 1;
            invariant(!!staff, "Expected the staff to be a non-zero number, got %s", staff);
            var paddingTop = cursor.lineMaxPaddingTopByStaff[staff] || 0;
            var paddingBottom = cursor.lineMaxPaddingBottomByStaff[staff] || 0;
            cursor.lineMaxPaddingTopByStaff[staff] = Math.max(paddingTop, note.defaultY - 50);
            cursor.lineMaxPaddingBottomByStaff[staff] = Math.max(paddingBottom, -note.defaultY - 25);
        });
        var accidentalWidth = baseModel.calcAccidentalWidth();
        var totalWidth = baseModel.calcWidth(cursor.lineShortest);
        invariant(isFinite(totalWidth), "Invalid width %s", totalWidth);
        var noteheads = baseModel.noteheadGlyph;
        var widths = map(noteheads, getGlyphWidth);
        this.renderedWidth = max(widths);
        if (baseModel.satieMultipleRest || baseModel.count === Count.Whole) {
            forEach(this.model, function (note) { return (note.dots = []); });
        }
        this.x = cursor.segmentX + accidentalWidth;
        this.minSpaceAfter = this._getMinWidthAfter(cursor);
        this.minSpaceBefore = this._getMinWidthBefore(cursor);
        cursor.segmentX += totalWidth;
    };
    Layout.prototype._captureBoundingBoxes = function () {
        var _this = this;
        var bboxes = [];
        forEach(this.model, function (note) {
            var notations = notationObj(note); // TODO: detach this
            var bbn = getBoundingRects(notations, note, _this);
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
    Layout.prototype._getLyricWidth = function (_cursor) {
        var factor = (40 * 25.4) / 96; // 40 tenths in staff * pixelFactor
        return getChordLyricWidth(this.model, factor);
    };
    Layout.prototype._detachModelWithContext = function (_cursor, baseModel) {
        var _this = this;
        var model = map(baseModel, function (note, _idx) {
            /* Here, we're extending each note to have the correct
             * default position.  To do so, we use prototypical
             * inheritance. See Object.create. */
            return Object.create(note, {
                defaultX: {
                    get: function () {
                        return (note.relativeX || 0) + (_this.overrideX || _this.x);
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
export { Layout };
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
        if (spec) {
            if (spec._class === "Note") {
                this[0] = new NoteImpl(this, 0, spec);
                this.length = 1;
            }
            else if (spec.length) {
                forEach(spec, function (note, idx) {
                    _this[idx] = new NoteImpl(_this, idx, note);
                });
                this.length = spec.length;
            }
        }
    }
    Object.defineProperty(ChordModelImpl.prototype, "staffIdx", {
        get: function () {
            return this[0].staff || 1;
        },
        set: function (_n) {
            // Ignore.
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "satieLedger", {
        get: function () {
            return ledgerLines(this, this._clef);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ChordModelImpl.prototype, "rest", {
        get: function () {
            // TODO: typing
            return some(this, function (note) { return note.rest; });
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
            return times(this.length, function (i) { return _this[i]; });
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
        forEach(notes, function (note) {
            _this[_this.length] = new NoteImpl(_this, _this.length, note);
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
        notes.splice.apply(notes, __spreadArrays([start, deleteCount], replacements));
        times(this.length, function (i) { return delete _this[i]; });
        forEach(notes, function (n, i) {
            invariant(n instanceof NoteImpl, "Notes must be NoteImpls in Chords");
            _this[i] = n;
        });
        this.length = notes.length;
    };
    ChordModelImpl.prototype.refresh = function (cursor) {
        var _this = this;
        if (!this[0].noteType || !this[0].noteType.duration) {
            var count_1 = this._implyCountFromPerformanceData(cursor);
            cursor.dangerouslyPatchWithoutValidation(function (voice) {
                return reduce(_this, function (builder, _note, idx) {
                    return builder.note(idx, function (j) { return j.noteType({ duration: count_1 }); });
                }, voice);
            });
        }
        try {
            var divCount = calcDivisions(this, cursor.staffAttributes);
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
            if (err instanceof FractionalDivisionsException) {
                cursor.fixup([
                    {
                        p: ["divisions"],
                        oi: err.requiredDivisions,
                        od: cursor.staffAttributes.divisions,
                    },
                ]);
            }
        }
        invariant(isFinite(this.divCount), "The beat count must be numeric");
        invariant(this.divCount >= 0, "The beat count must be non-negative.");
        var direction = this._pickDirection(cursor);
        var clef = cursor.staffAttributes.clef;
        this._clef = clef;
        forEach(this, function (note, idx) {
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
            this.divCount === barDivisions(cursor.staffAttributes) ||
                this.divCount === -1;
        var count = this.count;
        invariant(isFinite(count) && count !== null, "%s is not a valid count", count);
        for (var i = 0; i < this.length; ++i) {
            invariant(this[i].noteType.duration === count, "Inconsistent count (%s != %s)", this[i].noteType.duration, count);
        }
        this._checkMulitpleRest(cursor);
        this._implyNoteheads(cursor);
        if (!this._init) {
            if (countToIsBeamable[count]) {
                this.satieFlag = countToFlag[count];
            }
            else {
                this.satieFlag = null;
            }
            if (this._hasStem()) {
                this.satieStem = {
                    direction: direction,
                    stemHeight: this._getStemHeight(direction, clef),
                    stemStart: startingLine(this, direction, clef),
                };
                this.satieDirection = direction === 1 ? StemType.Up : StemType.Down;
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
        var data = map(this, function (note) { return note; });
        return data;
    };
    ChordModelImpl.prototype.toXML = function () {
        var xml = "";
        for (var i = 0; i < this.length; ++i) {
            xml += serializeNote(this[i]) + "\n";
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
        invariant(extraWidth >= 0, "Invalid extraWidth %s. shortest is %s, got %s", extraWidth, shortest, this.divCount);
        var totalWidth = baseWidth + extraWidth + accidentalWidth + this.calcDotWidth();
        return totalWidth;
    };
    ChordModelImpl.prototype.calcAccidentalWidth = function () {
        return (reduce(this, function (maxWidth, note) {
            var w = Math.max(maxWidth, note.accidental ? -note.accidental.defaultX : 0);
            return w;
        }, 0) * ACCIDENTAL_WIDTH);
    };
    ChordModelImpl.prototype.calcDotWidth = function () {
        if (this.wholebar || this.satieMultipleRest) {
            return 0;
        }
        return max(map(this, function (m) { return (m.dots || []).length; })) * 6;
    };
    ChordModelImpl.prototype._implyCountFromPerformanceData = function (cursor) {
        var _this = this;
        var count;
        var _a = cursor.staffAttributes, time = _a.time, divisions = _a.divisions;
        var ts = {
            beatType: time.beatTypes[0],
            beats: reduce(time.beats, function (sum, beat) { return sum + parseInt(beat, 10); }, 0),
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
                return reduce(times(_this.length), function (voice, idx) {
                    return voice.note(idx, function (note) { return note.dots(times(dots, function (_dot) { return ({}); })); });
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
                count = Count.Whole;
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
        var heightFromOtherNotes = (highestLine(this, clef) - lowestLine(this, clef)) * 10;
        var start = heightDeterminingLine(this, direction, clef) * 10;
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
        var avgLine = averageLine(this, clef);
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
                return cursor.factory.modelHasType(el, Type.Chord);
            });
            var nIdx = notes.indexOf(this);
            // 1. Continue the stem direction of surrounding stems that are in one
            //    direction only
            var linePrev = nIdx > 0 ? averageLine(notes[nIdx - 1], clef) : 3;
            if (linePrev === 3 && nIdx > 0) {
                // Note, the solution obtained may not be ideal, because we greedily resolve
                // ties in a forward direction.
                linePrev = notes[nIdx - 1].satieDirection === 1 ? 2.99 : 3.01;
            }
            var lineNext = nIdx + 1 < notes.length ? averageLine(notes[nIdx + 1], clef) : 3;
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
            var beamingPattern = getBeamingPattern(time);
            var bpDivisions = map(beamingPattern, function (seg) {
                return calcDivisions(seg, cursor.staffAttributes);
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
            forEach(this, function (note) {
                if (measureStyle.slash) {
                    note.notehead = note.notehead || { type: null };
                    note.notehead.type = NoteheadType.Slash;
                    if (!measureStyle.slash.useStems) {
                        note.stem = {
                            type: StemType.None,
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
            this.noteheadGlyph = times(this.length, function () { return countToNotehead[_this.count]; });
        }
        this.noteheadGlyph = this.noteheadGlyph.map(function (stdGlyph, idx) {
            return getNoteheadGlyph(_this[idx].notehead, stdGlyph);
        });
    };
    ChordModelImpl.prototype._hasStem = function () {
        if (this[0] && this[0].stem && this[0].stem.type === StemType.None) {
            return false;
        }
        return countToHasStem[this.count];
    };
    ChordModelImpl.Layout = Layout;
    return ChordModelImpl;
}());
export default ChordModelImpl;
//# sourceMappingURL=implChord_chordImpl.js.map