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

import {Clef, Count, MultipleRest, Note, NoteheadType, Stem, StemType, Tremolo,
    TimeModification, serializeNote} from "musicxml-interfaces";
import {forEach, times, reduce, map, max, some} from "lodash";
import * as invariant from "invariant";

import {Type} from "./document";

import {IBoundingRect} from "./private_boundingRect";
import {getBeamingPattern} from "./private_metre_checkBeaming";
import {IChord, ledgerLines, notationObj, countToIsBeamable, countToFlag,
    startingLine, averageLine, highestLine, lowestLine,
    heightDeterminingLine, countToHasStem, getNoteheadGlyph,
    divisions as calcDivisions, FractionalDivisionsException,
    barDivisions} from "./private_chordUtil";
import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";
import {VoiceBuilder} from "./engine_createPatch";
import {getWidth as getGlyphWidth} from "./private_smufl";

import ChordModel from "./implChord_chordModel";
import {IBeamLayout} from "./implChord_beamLayout";
import NoteImpl from "./implChord_noteImpl";
import {getChordLyricWidth} from "./implChord_lyrics";
import {getBoundingRects} from "./implChord_notation";

const IDEAL_STEM_HEIGHT = 35;
const MIN_STEM_HEIGHT = 30;
const BASE_GRACE_WIDTH = 11.4;
const BASE_STD_WIDTH = 30;
const GRACE_FLATTEN_FACTOR = 0.1;
const ACCIDENTAL_WIDTH = 0.73;
const LOG_STRETCH = 28;

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
class ChordModelImpl implements ChordModel.IChordModel, ArrayLike<NoteImpl> {
    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** set in validate */
    divCount: number;

    divisions: number;

    get staffIdx(): number {
        return this[0].staff || 1;
    }

    set staffIdx(n: number) {
        // Ignore.
    }

    /*---- I.2 IChord ---------------------------------------------------------------------------*/

    [key: number]: NoteImpl;
    length: number = 0;

    /*---- II. Ext ------------------------------------------------------------------------------*/

    wholebar: boolean;

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

    private _layout: ChordModelImpl.Layout;

    get satieLedger(): number[] {
        return ledgerLines(this, this._clef);
    }

    get rest() {
        return some(this, note => note.rest);
    }

    get timeModification(): TimeModification {
        return this[0].timeModification;
    }

    get notes(): NoteImpl[] {
        return times(this.length, i => this[i]);
    }

    get count(): Count {
        let noteType = this[0].noteType;
        if (!noteType) {
            return null;
        }
        return noteType.duration;
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

        times(this.length, i => delete this[i]);

        forEach(notes, (n, i) => {
            invariant(n instanceof NoteImpl, "Notes must be NoteImpls in Chords");
            this[i] = n;
        });
        this.length = notes.length;
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

    _init: boolean = false;
    refresh(cursor: IReadOnlyValidationCursor): void {
        if (!isFinite(this.count)) {
            let count = this._implyCountFromPerformanceData(cursor);
            cursor.patch(voice => reduce(this, (builder, note, idx) => builder
                .note(idx, j => j.noteType({duration: count})) as any, voice));
        }
        try {
            const divCount = calcDivisions(this, cursor.staffAttributes);
            if (divCount !== this.divCount) {
                cursor.fixup([
                    {
                        p: [cursor.measureInstance.uuid, "parts", cursor.segmentInstance.part, "voices",
                            cursor.segmentInstance.owner, cursor.segmentPosition, "divCount"],
                        oi: divCount,
                        od: this.divCount,
                    },
                ]);
            }
        } catch (err) {
            if (err instanceof FractionalDivisionsException) {
                cursor.fixup([
                    {
                        p: ["divisions"],
                        oi: (err as FractionalDivisionsException).requiredDivisions,
                        od: cursor.staffAttributes.divisions,
                    }
                ]);
            }
        }

        invariant(isFinite(this.divCount), "The beat count must be numeric");
        invariant(this.divCount >= 0, "The beat count must be non-negative.");

        const direction = this._pickDirection(cursor);
        const clef = cursor.staffAttributes.clef;

        this._clef = clef;

        forEach(this, (note, idx) => {
            if (!note.grace && note.duration !== this.divCount) {
                cursor.patch(partBuilder => partBuilder
                    .note(idx, note => note
                        .duration(this.divCount),
                    )
                );
            }
            if (idx > 0 && !note.chord) {
                cursor.patch(partBuilder => partBuilder
                    .note(idx, note => note
                        .chord({}),
                    )
                );
            } else if (idx === 0 && note.chord) {
                cursor.patch(partBuilder => partBuilder
                    .note(idx, note => note
                        .chord(null),
                    )
                );
            }
            note.refresh(cursor);
            note.updateAccidental(cursor);
        });

        this.wholebar = this.divCount === barDivisions(cursor.staffAttributes) || this.divCount === -1;

        let count = this.count;
        invariant(isFinite(count) && count !== null,
            "%s is not a valid count", count);
        for (let i = 0; i < this.length; ++i) {
            invariant(this[i].noteType.duration === count, "Inconsistent count (%s != %s)",
                this[i].noteType.duration, count);
        }

        this._checkMulitpleRest(cursor);
        this._implyNoteheads(cursor);

        if (!this._init) {
            if (countToIsBeamable[count]) {
                this.satieFlag = countToFlag[count];
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
        }
    }

    getLayout(cursor: LayoutCursor): ChordModel.IChordLayout {
        this._init = true;
        if (!this._layout) {
            this._layout = new ChordModelImpl.Layout();
        }
        this._layout._refresh(this, cursor);
        return this._layout;
    }

    toJSON() {
        let data: any = map(this, note => note);
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

    calcWidth(shortest: number) {
        let accidentalWidth = this.calcAccidentalWidth();

        // TODO: Each note's width has a linear component proportional to log of its duration
        // with respect to the shortest length
        let extraWidth = this.divCount ?
            (Math.log(this.divCount) - Math.log(shortest)) * LOG_STRETCH : 0;
        const grace = this[0].grace;
        if (grace) {
            // TODO: Put grace notes in own segment
            extraWidth *= GRACE_FLATTEN_FACTOR;
        }
        const baseWidth = grace ? BASE_GRACE_WIDTH : BASE_STD_WIDTH;
        invariant(extraWidth >= 0, "Invalid extraWidth %s. shortest is %s, got %s", extraWidth,
                shortest, this.divCount);

        const totalWidth = baseWidth + extraWidth +
            accidentalWidth + this.calcDotWidth();
        return totalWidth;
    }

    calcAccidentalWidth() {
        return reduce(this, (maxWidth, note) => {
            return Math.max(maxWidth, note.accidental ? -note.accidental.defaultX : 0);
        }, 0) * ACCIDENTAL_WIDTH;
    }

    calcDotWidth(): number {
        if (this.wholebar || this.satieMultipleRest) {
            return 0;
        }
        return max(map(this, m => (m.dots || []).length)) * 6;
    }

    private _implyCountFromPerformanceData(cursor: IReadOnlyValidationCursor) {
        let count: Count;
        const {time, divisions} = cursor.staffAttributes;
        const ts = {
            beatType: time.beatTypes[0], // FIXME
            beats: reduce(time.beats, (sum, beat) => sum + parseInt(beat, 10), 0)
        };

        let factor = ts.beatType / 4;
        let beats = factor * (this[0].duration / divisions);
        count = 4 / (this[0].duration / divisions);

        // Try dots
        let dotFactor = 1;
        let dots = 0;
        while (!isPO2(1 / (beats / dotFactor / 4))) {
            if (dots === 5) {
                dots = 0;
                break;
            }
            ++dots;
            dotFactor += Math.pow(1 / 2, dots);
        }
        if (dots > 0) {
            count = (1 / (beats / dotFactor / 4 / factor));
            cursor.patch(voiceA => reduce(times(this.length), (voice, idx) =>
                    voice.note(idx, note => note.dots(times(dots, dot => ({})))),
                voiceA as VoiceBuilder));
        }

        // Try tuplets
        // TODO

        // Try ties
        if (!isPO2(this.count)) {
            // Whole bar rests can still exist even when there's no single NOTE duration
            // that spans a bar.
            if (beats === ts.beats && !!this[0].rest) {
                count = Count.Whole;
            } else {
                let nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count) / Math.log(2)));
                count = nextPO2;
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

        return count;
    }

    private _getStemHeight(direction: number, clef: Clef): number {
        let heightFromOtherNotes = (highestLine(this, clef) -
            lowestLine(this, clef)) * 10;
        let start = heightDeterminingLine(this, direction, clef) * 10;
        let idealExtreme = start + direction * IDEAL_STEM_HEIGHT;

        let result: number;
        if (idealExtreme >= 65) {
            result = Math.max(MIN_STEM_HEIGHT, IDEAL_STEM_HEIGHT - (idealExtreme - 65));
        } else if (idealExtreme <= -15) {
            result = Math.max(MIN_STEM_HEIGHT, IDEAL_STEM_HEIGHT - (-15 - idealExtreme));
        } else {
            result = 35;
        }

        // All stems in the main voice should touch the center line.
        if (start > 30 && direction === -1 && start - result > 30) {
            result = start - 30;
        } else if (start < 30 && direction === 1 && start + result < 30) {
            result = 30 - start;
        }

        // Grace note stems are short (though still proportionally pretty tall)
        if (this[0].grace) {
            result *= 0.75;
        }

        result += heightFromOtherNotes;

        return result;
    }

    private _pickDirection(cursor: IReadOnlyValidationCursor) {
        const {clef} = cursor.staffAttributes;
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

            let notes: ChordModelImpl[] =
                cursor.segmentInstance.filter(el => cursor.factory.modelHasType(el, Type.Chord)) as any;
            let nIdx = notes.indexOf(this);

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
            let {time} = cursor.staffAttributes;
            let beamingPattern = getBeamingPattern(time);
            let bpDivisions = map(beamingPattern, seg => calcDivisions(seg, cursor.staffAttributes));
            let currDivision = cursor.segmentDivision;
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

    private _checkMulitpleRest(cursor: IReadOnlyValidationCursor) {
        let {measureStyle} = cursor.staffAttributes;
        let multipleRest = measureStyle && measureStyle.multipleRest;
        if (multipleRest && multipleRest.count > 1) {
            this.satieMultipleRest = measureStyle.multipleRest;
        }
    }

    private _implyNoteheads(cursor: IReadOnlyValidationCursor) {
        let {measureStyle} = cursor.staffAttributes;
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

module ChordModelImpl {
    export class Layout implements ChordModel.IChordLayout {
        /*---- IChordLayout ------------------------------------------------------*/

        // Constructed:

        model: ChordModel.IDetachedChordModel;
        x: number;
        division: number;
        renderedWidth: number;
        notehead: string;

        minSpaceBefore: number;
        minSpaceAfter: number;

        // Prototype:

        boundingBoxes: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none" | "centered" | "after";

        satieBeam: IBeamLayout;
        satieStem: {
            direction: number;
            stemHeight: number;
            stemStart: number;
            tremolo?: Tremolo;
        };
        satieFlag: string;

        /*---- Implementation ----------------------------------------------------*/

        _refresh(baseModel: ChordModelImpl, cursor: LayoutCursor) {
            // ** this function should not modify baseModel **

            this.division = cursor.segmentDivision;
            let {measureStyle} = cursor.staffAttributes;
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

            let isWholeBar = baseModel.wholebar || baseModel.count === Count.Whole;

            this.expandPolicy = baseModel.satieMultipleRest || baseModel.rest &&
                isWholeBar ? "centered" : "after";

            forEach(this.model, note => {
                let staff = note.staff || 1;

                invariant(!!staff,
                    "Expected the staff to be a non-zero number, got %s", staff);
                let paddingTop = cursor.lineMaxPaddingTopByStaff[staff] || 0;
                let paddingBottom = cursor.lineMaxPaddingBottomByStaff[staff] || 0;
                cursor.lineMaxPaddingTopByStaff[staff] = Math.max(paddingTop, note.defaultY - 50);
                cursor.lineMaxPaddingBottomByStaff[staff] = Math.max(paddingBottom, -note.defaultY - 25);
            });

            let accidentalWidth = baseModel.calcAccidentalWidth();
            let totalWidth = baseModel.calcWidth(cursor.lineShortest);
            invariant(isFinite(totalWidth), "Invalid width %s", totalWidth);

            let noteheads = baseModel.noteheadGlyph;
            let widths = map(noteheads, getGlyphWidth);
            this.renderedWidth = max(widths);

            if (baseModel.satieMultipleRest || baseModel.count === Count.Whole) {
                forEach(this.model, note => note.dots = []);
            }

            this.x = cursor.segmentX + accidentalWidth;
            this.minSpaceAfter = this._getMinWidthAfter(cursor);
            this.minSpaceBefore = this._getMinWidthBefore(cursor);
            cursor.segmentX += totalWidth;
        }

        private _captureBoundingBoxes(): IBoundingRect[] {
            let bboxes: IBoundingRect[] = [];
            forEach(this.model, note => {
                let notations = notationObj(note); // TODO: detach this
                bboxes = bboxes.concat(getBoundingRects(notations, note, this));
            });
            return bboxes;
        }

        private _getMinWidthBefore(cursor: LayoutCursor) {
            return this._getLyricWidth(cursor) / 2;
        }

        private _getMinWidthAfter(cursor: LayoutCursor) {
            return this._getLyricWidth(cursor) / 2;
        }

        private _getLyricWidth(cursor: LayoutCursor) {
            let factor = 40 * 25.4 / 96; // 40 tenths in staff * pixelFactor
            return getChordLyricWidth(this.model, factor);
        }

        private _detachModelWithContext(cursor: LayoutCursor,
                baseModel: ChordModelImpl): ChordModel.IDetachedChordModel {
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
                                    this.x;
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

            model.staffIdx = baseModel.staffIdx;
            model.divCount = baseModel.divCount;
            model.satieLedger = baseModel.satieLedger;
            model.noteheadGlyph = baseModel.noteheadGlyph;
            model.satieMultipleRest = baseModel.satieMultipleRest;
            model.satieUnbeamedTuplet = baseModel.satieUnbeamedTuplet;
            return model;
        }
    }

    Layout.prototype.expandPolicy = "after";
    Layout.prototype.renderClass = Type.Chord;
    Layout.prototype.boundingBoxes = [];
}

export default ChordModelImpl;
