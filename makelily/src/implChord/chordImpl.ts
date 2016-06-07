/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
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

import {Clef, Count, MultipleRest, Note, NoteheadType, Stem, StemType, Tremolo,
    Tied, TimeModification, serializeNote} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {forEach, times, filter, reduce, map, max, some, extend} from "lodash";
import * as invariant from "invariant";

import Type from "../document/types";
import FrozenLevel from "../document/frozenLevels";
import ExpandPolicy from "../document/expandPolicies";

import IBoundingRect from "../private/boundingRect";
import {calcDivisions, getBeamingPattern} from "../private/metre";
import IChord, {ledgerLines, notationObj, countToIsBeamable, countToFlag,
    InvalidAccidental, startingLine, averageLine, highestLine, lowestLine,
    heightDeterminingLine, countToHasStem, getNoteheadGlyph,
    lineForClef} from "../private/chord";
import IList from "../private/list";
import ICursor from "../private/cursor";

import ChordModel from "./chordModel";
import IBeamLayout from "./beamLayout";
import NoteImpl from "./noteImpl";
import {getWidth as getGlyphWidth} from "../private/smufl";
import {getChordLyricWidth} from "./lyrics";
import {getBoundingRects} from "./notation";

const IDEAL_STEM_HEIGHT: number = 35;
const MIN_STEM_HEIGHT: number = 30;

let countToNotehead: { [key: number]: string } = {
    [Count.Maxima]: "noteheadDoubleWhole",
    [Count.Long]: "noteheadDoubleWhole",
    [Count.Breve]: "noteheadDoubleWhole",
    [Count.Whole]: "noteheadWhole",
    [-1]: "noteheadWhole",
    [Count.Half]: "noteheadHalf",
    [Count.Quarter]: "noteheadBlack",
    [Count.Eighth]: "noteheadBlack",
    [Count._16th]: "noteheadBlack",
    [Count._32nd]: "noteheadBlack",
    [Count._64th]: "noteheadBlack",
    [Count._128th]: "noteheadBlack",
    [Count._256th]: "noteheadBlack",
    [Count._512th]: "noteheadBlack",
    [Count._1024th]: "noteheadBlack"
};

let countToRest: { [key: number]: string } = {
    [Count.Maxima]: "restLonga",
    [Count.Long]: "restLonga",
    [Count.Breve]: "restDoubleWhole",
    [Count.Whole]: "restWhole",
    [-1]: "restWhole",
    [Count.Half]: "restHalf",
    [Count.Quarter]: "restQuarter",
    [Count.Eighth]: "rest8th",
    [Count._16th]: "rest16th",
    [Count._32nd]: "rest32nd",
    [Count._64th]: "rest64th",
    [Count._128th]: "rest128th",
    [Count._256th]: "rest256th",
    [Count._512th]: "rest512th",
    [Count._1024th]: "rest1024th"
};

/**
 * A model that represents 1 or more notes in the same voice, starting on the same beat, and each
 * with the same duration. Any number of these notes may be rests.
 */
class ChordModelImpl implements ChordModel.IChordModel, IList<NoteImpl> {
    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** set in validate$ */
    divCount: number;

    divisions: number;

    get staffIdx(): number {
        return this[0].staff;
    }

    set staffIdx(n: number) {
        if (n !== this[0].staff) {
            invariant(false, "cannot call set staffIdx on chord model");
        }
    }

    /** @prototype */
    frozenness: FrozenLevel;

    /*---- I.2 IChord ---------------------------------------------------------------------------*/

    [key: number]: NoteImpl;
    length: number = 0;

    /*---- II. Ext ------------------------------------------------------------------------------*/

    wholebar$: boolean;

    satieStem: {
        direction: number;
        stemHeight: number;
        stemStart: number;
        tremolo?: Tremolo;
    };

    satieFlag: string;
    satieDirection: StemType;
    satieMultipleRest: MultipleRest;
    noteheadGlyph: string[];
    satieUnbeamedTuplet: IBeamLayout;
    _clef: Clef;
    key: string;

    stem: Stem;

    /** @prototype */
    dots: number;

    private _count: Count;
    private _timeModification: TimeModification;
    private _recentLayout: ChordModelImpl.Layout;

    get satieLedger(): number[] {
        return ledgerLines(this, this._clef);
    }

    get rest() {
        return some(this, note => note.rest);
    }
    set rest(r: boolean) {
        if (!!r) {
            times(this.length, idx => {
                if (idx === 0) {
                    this[idx].pitch = null;
                } else {
                    delete this[idx];
                }
            });
            this.setTieds([null]);
        } else {
            invariant(!this.rest, "Instead, set the exact pitch or chord...");
        }
    }

    get timeModification() {
        return this._timeModification;
    }

    set timeModification(t: TimeModification) {
        this._timeModification = t;
    }

    get notes(): NoteImpl[] {
        return times(this.length, i => this[i]);
    }

    set notes(c: NoteImpl[]) {
        times(this.length, i => delete this[i]);

        forEach(c, (n, i) => {
            invariant(n instanceof NoteImpl, "Notes must be NoteImpls in Chords");
            this[i] = n;
        });
        this.length = c.length;
    }

    setTieds(v: Tied[]) {
        forEach(this.notes, (n, i) => {
            if (v[i]) {
                n.ensureNotationsWrittable();
                notationObj(n).tieds = [v[i]];
            } else {
                delete notationObj(n).tieds;
            }
        });
        // TODO: Also update sound (ties)
    }

    get count() {
        return this._count;
    }

    set count(n: Count) {
        invariant(!isNaN(n), "Invalid count %s", n);
        this._count = n;
        this.divCount = null; // Kill optimizer.
        forEach(this, note => {
            delete note.duration; // Kill playback data.
        });
    }

    push(...notes: Note[]) {
        forEach(notes, note => {
            this[this.length] = new NoteImpl(this, this.length, note);
            ++this.length;
        });

        return this.length;
    }

    splice(start: number, deleteCount: number, ...replacements: NoteImpl[]) {
        let notes = this.notes;
        notes.splice(start, deleteCount, ...replacements);
        this.notes = notes;
    }

    /*---- Implementation -----------------------------------------------------------------------*/

    /**
     * We accept either a Note from musicxml-interfaces, or an IChord, which
     * is an array-like element of Notes. In either case, we create a deep copy.
     */
    constructor(spec?: IChord | Note) {
        if (!!spec) {
            if (spec._class === "Note") {
                this[0] = new NoteImpl(this, 0, spec);
                this.length = 1;
            } else if ((<IChord>spec).length) {
                forEach((<IChord>spec), (note, idx) => {
                    this[idx] = new NoteImpl(this, idx, note);
                });
                this.length = (<IChord>spec).length;
            }
        }
    }

    checkSemantics(cursor: ICursor): IAny[] {
        return [];
    }

    _init: boolean = false;
    __validate(cursor$: ICursor): void {
        if (!isFinite(this._count)) {
            this._implyCountFromPerformanceData(cursor$);
        }
        this.divCount = calcDivisions(this, cursor$);

        invariant(isFinite(this.divCount), "The beat count must be numeric");
        invariant(this.divCount >= 0, "The beat count must be non-negative.");

        const direction = this._pickDirection(cursor$);
        const clef = cursor$.staff.attributes.clef;

        this._clef = clef;
        forEach(this, note => {
            if (!note.duration && !note.grace) {
                note.duration = this.divCount;
            }
            note.validate$(cursor$);
            note.updateAccidental$(cursor$);
            if (note.pitch) {
                // Update the accidental status.
                const pitch = note.pitch;
                if (pitch.alter === 0) {
                    cursor$.staff.accidentals$[pitch.step] = undefined;
                }
                cursor$.staff.accidentals$[pitch.step + pitch.octave] = pitch.alter;
                if ((cursor$.staff.accidentals$[pitch.step]) !== pitch.alter) {
                    cursor$.staff.accidentals$[pitch.step] = InvalidAccidental;
                }
            }
        });

        this.wholebar$ = this.divCount === cursor$.staff.totalDivisions || this.divCount === -1;
        // TODO: overfill
        // TODO: rhythmic spelling
        // TODO: the document must end with a marker

        invariant(isFinite(this._count) && this._count !== null,
            "%s is not a valid count", this._count);

        this._checkMulitpleRest$(cursor$);
        this._implyNoteheads$(cursor$);

        if (!cursor$.approximate || !this._init) {
            if (countToIsBeamable[this._count]) {
                this.satieFlag = countToFlag[this._count];
            } else {
                this.satieFlag = null;
            }

            if (this._hasStem()) {
                this.satieStem = {
                    direction,
                    stemHeight: this._getStemHeight(direction, clef),
                    stemStart: startingLine(this, direction, clef)
                };
                this.satieDirection = direction === 1 ? StemType.Up : StemType.Down;
            } else {
                this.satieStem = null;
                this.satieDirection = NaN;
            }

            if (this._recentLayout) {
                this._recentLayout.sync$(this, cursor$);
            }
        }
    }

    __layout(cursor$: ICursor): ChordModel.IChordLayout {
        this._init = true;
        this._recentLayout = new ChordModelImpl.Layout(this, cursor$);
        return this._recentLayout;
    }

    toJSON() {
        let data: any = {
            group: {
                satieStem: this.satieStem,
                satieFlag: this.satieFlag,
                satieDirection: this.satieDirection,
                satieMultipleRest: this.satieMultipleRest,
                satieUnbeamedTuplet: this.satieUnbeamedTuplet,
                frozenness: this.frozenness,
                wholebar$: this.wholebar$,
                divCount: this.divCount,
                dots: this.dots
            },
            notes: map(this, (note) => note)
        };
        return data;
    }

    toXML(): string {
        let xml = "";
        for (let i = 0; i < this.length; ++i) {
            xml += serializeNote(this[i]) + "\n";
        }
        return xml;
    }

    inspect() {
        return this.toXML();
    }

    private _implyCountFromPerformanceData(cursor$: ICursor) {
        const {time, divisions} = cursor$.staff.attributes;
        const ts = {
            beatType: time.beatTypes[0], // FIXME
            beats: reduce(time.beats, (sum, beat) => sum + parseInt(beat, 10), 0)
        };

        let factor = ts.beatType / 4;
        let beats = factor * (this[0].duration / divisions);
        this._count = 4 / (this[0].duration / divisions);

        // Try dots
        let dotFactor = 1;
        let dots = 0;
        while (!isPO2(1 / (beats / dotFactor / 4)) && dots < 5) {
            ++dots;
            dotFactor += Math.pow(1 / 2, dots);
        }
        if (dots === 5) {
            dots = 0;
        } else if (dots !== 0) {
            this._count = (1 / (beats / dotFactor / 4 / factor));
            this.dots = dots;
        }

        // Try tuplets
        // TODO

        // Try ties
        if (!isPO2(this.count)) {
            // Whole bar rests can still exist even when there's no single NOTE duration
            // that spans a bar.
            if (beats === ts.beats && !!this[0].rest) {
                this._count = Count.Whole;
            } else {
                let nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count) / Math.log(2)));
                this._count = nextPO2;
                // TODO: Add 1+ tie.
            }
        }

        // TODO: Find the best match for performance data

        function isPO2(n: number) {
            if (Math.abs(Math.round(n) - n) > 0.00001) {
                return false;
            }
            n = Math.round(n);

            /* tslint:disable */
            return !!n && !(n & (n - 1));
            /* tslint:enable */
        }
    }

    private _getStemHeight(direction: number, clef: Clef): number {
        let heightFromOtherNotes = (highestLine(this, clef) -
            lowestLine(this, clef)) * 10;
        let idealStemHeight = IDEAL_STEM_HEIGHT + heightFromOtherNotes;
        let minStemHeight = MIN_STEM_HEIGHT + heightFromOtherNotes;

        let start = heightDeterminingLine(this, direction, clef) * 10;
        let idealExtreme = start + direction * idealStemHeight;

        let result: number;
        if (idealExtreme >= 65) {
            result = Math.max(minStemHeight, idealStemHeight - (idealExtreme - 65));
        } else if (idealExtreme <= -15) {
            result = Math.max(minStemHeight, idealStemHeight - (-15 - idealExtreme));
        } else {
            result = 35;
        }

        // All stems should in the main voice should touch the center line.
        if (start > 30 && direction === -1 && start - result > 30) {
            result = start - 30;
        } else if (start < 30 && direction === 1 && start + result < 30) {
            result = 30 - start;
        }

        // Grace note stems are short (though still proportionally pretty tall)
        if (this[0].grace) {
            result *= 0.75;
        }

        if (Math.abs(Math.abs(result - start) % 10 - 5) >= 4) {
            result += 3;
        }

        return result;
    }

    private _pickDirection(cursor$: ICursor) {
        const {clef} = cursor$.staff.attributes;
        let avgLine = averageLine(this, clef);
        if (avgLine > 3) {
            return -1;
        } else if (avgLine < 3) {
            return 1;
        } else {
            // There's no "right answer" here. We'll follow what "Behind Bars" recommends.
            // TODO: Consider notes outside current bar
            // TODO: Consider notes outside current stave
            // TODO: Handle clef changes correctly

            let nIdx = NaN; // index of current note in 'notes'
            let nLength = 0; // temporary variable eventually indicating length of 'notes'
            let notes = <ChordModelImpl[]> <any> filter(cursor$.segment, (el, idx) => {
                if (idx === cursor$.idx$) {
                    nIdx = nLength;
                }
                let ret = cursor$.factory.modelHasType(el, Type.Chord);
                if (ret) {
                    ++nLength;
                }
                return nLength;
            });
            invariant(notes.length === nLength, "Invalid filtration");

            // 1. Continue the stem direction of surrounding stems that are in one
            //    direction only
            let linePrev = nIdx > 0 ? averageLine(notes[nIdx - 1], clef) : 3;
            if (linePrev === 3 && nIdx > 0) {
                // Note, the solution obtained may not be ideal, because we greedily resolve
                // ties in a forward direction.
                linePrev = notes[nIdx - 1].satieDirection === 1 ? 2.99 : 3.01;
            }
            let lineNext = nIdx + 1 < notes.length ?
                averageLine(notes[nIdx + 1], clef) : 3;
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
            let {time} = cursor$.staff.attributes;
            let beamingPattern = getBeamingPattern(time);
            let bpDivisions = map(beamingPattern, seg => calcDivisions(seg, cursor$));
            let currDivision = cursor$.division$;
            let prevDivisionStart = 0;
            let i = 0;
            for (; i < bpDivisions.length; ++i) {
                if (prevDivisionStart + bpDivisions[i] >= currDivision) {
                    break;
                }
                prevDivisionStart += bpDivisions[i];
            }
            let nextDivisionStart = prevDivisionStart + bpDivisions[i] || NaN;
            let prevExists = prevDivisionStart < currDivision;
            let nextExists = nextDivisionStart > currDivision + this.divCount;

            let considerPrev = prevExists ? notes[nIdx - 1] : null;
            let considerNext = nextExists ? notes[nIdx + 1] : null;
            if (considerPrev && !considerNext && linePrev !== 3) {
                return linePrev > 3 ? -1 : 1;
            } else if (considerNext && !considerPrev && lineNext !== 3) {
                return lineNext > 3 ? -1 : 1;
            }

            // 2b. Check beat when considerPrev && considerNext
            // TODO: Implement me

            // 3. When there is no clear-cut case for either direction, the convention
            //    is to use down-stem
            return -1;
        }
    }

    private _checkMulitpleRest$(cursor$: ICursor) {
        let {measureStyle} = cursor$.staff.attributes;
        let multipleRest = measureStyle && measureStyle.multipleRest;
        if (multipleRest && multipleRest.count > 1) {
            this.satieMultipleRest = measureStyle.multipleRest;
        }
    }

    private _implyNoteheads$(cursor$: ICursor) {
        let {measureStyle} = cursor$.staff.attributes;
        if (measureStyle) {
            forEach(this, note => {
                if (measureStyle.slash) {
                    note.notehead = note.notehead || {type: null};
                    note.notehead.type = NoteheadType.Slash;
                    if (!measureStyle.slash.useStems) {
                        note.stem = {
                            type: StemType.None
                        };
                    }
                }
            });
        }
        if (this.rest) {
            if (this.satieMultipleRest) {
                this.noteheadGlyph = ["restHBar"];
            } else {
                this.noteheadGlyph = [countToRest[this.count]];
            }
        } else {
            this.noteheadGlyph = times(this.length, () => countToNotehead[this.count]);
        }
        this.noteheadGlyph = this.noteheadGlyph.map((stdGlyph, idx) =>
            getNoteheadGlyph(this[idx].notehead, stdGlyph));
    }

    private _hasStem() {
        if (this[0] && this[0].stem && this[0].stem.type === StemType.None) {
            return false;
        }
        return countToHasStem[this.count];
    }
}

ChordModelImpl.prototype.frozenness = FrozenLevel.Warm;
ChordModelImpl.prototype.dots = 0;

module ChordModelImpl {
    export class Layout implements ChordModel.IChordLayout {
        /*---- IChordLayout ------------------------------------------------------*/

        // Constructed:

        model: ChordModel.IDetachedChordModel;
        x$: number;
        division: number;
        renderedWidth: number;
        notehead: string;

        minSpaceBefore: number;
        minSpaceAfter: number;

        // Prototype:

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: ExpandPolicy;

        satieBeam: IBeamLayout;

        /*---- Implementation ----------------------------------------------------*/

        constructor(baseModel: ChordModelImpl, cursor$: ICursor) {
            this.division = cursor$.division$;
            let {measureStyle} = cursor$.staff.attributes;
            if (measureStyle.multipleRest && !measureStyle.multipleRestInitiatedHere) {
                // This is not displayed because it is part of a multirest.
                this.expandPolicy = ExpandPolicy.None;
                return;
            }

            this.model = this._detachModelWithContext(cursor$, baseModel);
            this.boundingBoxes$ = this._captureBoundingBoxes();

            let isWholeBar = baseModel.wholebar$ || baseModel.count === Count.Whole;

            if (baseModel.satieMultipleRest || baseModel.rest && isWholeBar) {
                // N.B.: this.model does not have count
                this.expandPolicy = ExpandPolicy.Centered;
            }

            forEach(this.model, note => {
                let staff = note.staff;

                invariant(!!staff,
                    "Expected the staff to be a non-zero number, but its %s", staff);
                let paddingTop = cursor$.maxPaddingTop$[staff] || 0;
                let paddingBottom = cursor$.maxPaddingBottom$[staff] || 0;
                cursor$.maxPaddingTop$[staff] = Math.max(paddingTop, note.defaultY - 50);
                cursor$.maxPaddingBottom$[staff] = Math.max(paddingBottom, -note.defaultY - 25);
            });

            let accidentalWidth = this._calcAccidentalWidth();
            let totalWidth = this._calcTotalWidth(cursor$, baseModel);
            invariant(isFinite(totalWidth), "Invalid width %s", totalWidth);

            let noteheads = baseModel.noteheadGlyph;
            let widths = map(noteheads, getGlyphWidth);
            this.renderedWidth = max(widths);

            if (baseModel.satieMultipleRest || baseModel.count === Count.Whole) {
                forEach(this.model, note => note.dots = []);
            }

            this.x$ = cursor$.x$ + accidentalWidth;
            this.minSpaceAfter = this._getMinWidthAfter(cursor$);
            this.minSpaceBefore = this._getMinWidthBefore(cursor$);
            cursor$.x$ += totalWidth;
        }

        sync$(baseModel: ChordModelImpl, cursor$: ICursor) {
            extend(this.model, this._detachModelWithContext(cursor$, baseModel));
            this.model.length = baseModel.length;
        }

        freshest(): ChordModelImpl.Layout {
            return (this.model.baseModel as any)._recentLayout;
        }

        private _captureBoundingBoxes(): IBoundingRect[] {
            let bboxes: IBoundingRect[] = [];
            forEach(this.model, note => {
                let notations = notationObj(note); // TODO: detach this
                bboxes = bboxes.concat(getBoundingRects(notations, note, this.model));
            });
            return bboxes;
        }

        private _calcAccidentalWidth(): number {
            // We allow accidentals to be slightly squished.

            return reduce(this.model, (maxWidth, note) => {
                return Math.max(maxWidth, note.accidental ? -note.accidental.defaultX : 0);
            }, 0) * 0.73;
        }

        private _calcTotalWidth(cursor: ICursor, baseModel: ChordModelImpl): number {
            let accidentalWidth = this._calcAccidentalWidth();

            // TODO: Each note's width has a linear component proportional to log of its duration
            // with respect to the shortest length
            let extraWidth = baseModel.divCount ?
                (Math.log(baseModel.divCount) - Math.log(cursor.line.shortestCount)) * 20 : 0;
            const grace = baseModel[0].grace; // TODO: What if only some notes are grace?
            if (grace) {
                extraWidth /= 10; // TODO: Put grace notes in own segment
            }
            const baseWidth = grace ? 11.4 : 22.8;
            invariant(extraWidth >= 0, "Invalid extraWidth %s. shortest is %s, got %s", extraWidth,
                    cursor.line.shortestCount, baseModel.divCount);

            const totalWidth = baseWidth + extraWidth +
                accidentalWidth + this._calcDotWidth(cursor, baseModel);
            return totalWidth;
        }

        private _calcDotWidth(cursor: ICursor, baseModel: ChordModelImpl): number {
            if (baseModel.wholebar$ || baseModel.satieMultipleRest) {
                return 0;
            }
            return max(map(baseModel, m => m.dots.length)) * 6;
        }

        private _getMinWidthBefore(cursor: ICursor) {
            return this._getLyricWidth(cursor) / 2;
        }

        private _getMinWidthAfter(cursor: ICursor) {
            return this._getLyricWidth(cursor) / 2;
        }

        private _getLyricWidth(cursor: ICursor) {
            let factor = 40 * 25.4 / 96; // 40 tenths in staff * pixelFactor
            return getChordLyricWidth(this.model, factor);
        }

        private _detachModelWithContext(cursor: ICursor,
                baseModel: ChordModelImpl): ChordModel.IDetachedChordModel {
            let {clef} = cursor.staff.attributes;

            let model: ChordModel.IDetachedChordModel =
                map(baseModel, (note, idx) => {
                    /* Here, we're extending each note to have the correct
                     * default position.  To do so, we use prototypical
                     * inheritance. See Object.create. */
                    return Object.create(note, {

                        defaultX: {
                            get: () => {
                                return note.defaultX ||
                                    (this as any).overrideX ||
                                    this.x$;
                            }
                        },
                        defaultY: {
                            get: () => {
                                if (baseModel[idx].defaultY) {
                                    return baseModel[idx].defaultY;
                                }
                                let line = lineForClef(baseModel[idx], clef);
                                return (line - 3) * 10;
                            }
                        },
                        stem: {
                            get: () => {
                                return baseModel.stem || {
                                    type: baseModel.satieDirection
                                };
                            }
                        }
                    });
                }) as any;

            model.baseModel = baseModel;
            model.staffIdx = baseModel.staffIdx;
            model.divCount = baseModel.divCount;
            return model;
        }
    }

    Layout.prototype.expandPolicy = ExpandPolicy.After;
    Layout.prototype.renderClass = Type.Chord;
    Layout.prototype.boundingBoxes$ = [];
}

export default ChordModelImpl;
