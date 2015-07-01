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

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import ChordModel from "../chord";
import {IBeam, IChord, ICursor, IModel, ISegment} from "../../engine";
import {getChordLyricWidth} from "./lyrics";
import {calcDivisions, getBeamingPattern} from "./metre";
import {getBoundingRects} from "./notation";
import NoteImpl from "./noteImpl";
import {getWidth as getGlyphWidth} from "../smufl";

const IDEAL_STEM_HEIGHT: number = 35;
const MIN_STEM_HEIGHT: number = 30;

let countToNotehead: { [key: number]: string } = {
    [MusicXML.Count.Maxima]: "noteheadDoubleWhole",
    [MusicXML.Count.Long]: "noteheadDoubleWhole",
    [MusicXML.Count.Breve]: "noteheadDoubleWhole",
    [MusicXML.Count.Whole]: "noteheadWhole",
    [-1]: "noteheadWhole",
    [MusicXML.Count.Half]: "noteheadHalf",
    [MusicXML.Count.Quarter]: "noteheadBlack",
    [MusicXML.Count.Eighth]: "noteheadBlack",
    [MusicXML.Count._16th]: "noteheadBlack",
    [MusicXML.Count._32nd]: "noteheadBlack",
    [MusicXML.Count._64th]: "noteheadBlack",
    [MusicXML.Count._128th]: "noteheadBlack",
    [MusicXML.Count._256th]: "noteheadBlack",
    [MusicXML.Count._512th]: "noteheadBlack",
    [MusicXML.Count._1024th]: "noteheadBlack"
};

let countToRest: { [key: number]: string } = {
    [MusicXML.Count.Maxima]: "restLonga",
    [MusicXML.Count.Long]: "restLonga",
    [MusicXML.Count.Breve]: "restDoubleWhole",
    [MusicXML.Count.Whole]: "restWhole",
    [-1]: "restWhole",
    [MusicXML.Count.Half]: "restHalf",
    [MusicXML.Count.Quarter]: "restQuarter",
    [MusicXML.Count.Eighth]: "rest8th",
    [MusicXML.Count._16th]: "rest16th",
    [MusicXML.Count._32nd]: "rest32nd",
    [MusicXML.Count._64th]: "rest64th",
    [MusicXML.Count._128th]: "rest128th",
    [MusicXML.Count._256th]: "rest256th",
    [MusicXML.Count._512th]: "rest512th",
    [MusicXML.Count._1024th]: "rest1024th"
};

/**
 * A model that represents 1 or more notes in the same voice, starting on the same beat, and each
 * with the same duration. Any number of these notes may be rests.
 */
class ChordModelImpl implements ChordModel.IChordModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** set in validate$ */
    divCount: number;

    get staffIdx(): number {
        return this[0].staff;
    }

    set staffIdx(n: number) {
        if (n !== this[0].staff) {
            invariant(false, "cannot call set staffIdx on chord model");
        }
    }

    /** @prototype */
    frozenness: IModel.FrozenLevel;

    /** @prototype only */
    modelDidLoad$(segment$: ISegment): void {
        // pass
    }

    validate$(cursor$: ICursor): void {
        if (!isFinite(this._count)) {
            this._implyCountFromPerformanceData(cursor$);
        }
        this.divCount = calcDivisions(this, cursor$);

        invariant(isFinite(this.divCount), "The beat count must be numeric");
        invariant(this.divCount >= 0, "The beat count must be non-negative.");

        const direction = this._pickDirection(cursor$);
        const clef = cursor$.staff.attributes.clef;

        this.satieLedger = IChord.ledgerLines(this, clef);

        _.forEach(this, note => {
            if (!note.duration && !note.grace) {
                note.duration = this.divCount;
            }
            note.validate$();
            note.updateAccidental$(cursor$);
            if (note.pitch) {
                // Update the accidental status.
                const pitch = note.pitch;
                if (pitch.alter === 0) {
                    cursor$.staff.accidentals$[pitch.step] = undefined;
                }
                cursor$.staff.accidentals$[pitch.step + pitch.octave] = pitch.alter;
                if ((cursor$.staff.accidentals$[pitch.step]) !== pitch.alter) {
                    cursor$.staff.accidentals$[pitch.step] = IChord.InvalidAccidental;
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

        if (!this.inBeam$ && IChord.countToIsBeamable[this._count]) {
            this.satieFlag = IChord.countToFlag[this._count];
        } else {
            this.satieFlag = null;
        }

        if (this._hasStem()) {
            this.satieStem = {
                direction: direction,
                stemHeight: this._getStemHeight(direction, clef),
                stemStart: IChord.startingLine(this, direction, clef)
            };

            this.satieDirection = direction === 1 ? MusicXML.StemType.Up : MusicXML.StemType.Down;
        } else {
            this.satieStem = null;
            this.satieDirection = NaN;
        }
    }

    layout(cursor$: ICursor): ChordModel.IChordLayout {
        return new ChordModelImpl.Layout(this, cursor$);
    }

    private _checkMulitpleRest$(cursor$: ICursor) {
        let {measureStyle} = cursor$.staff.attributes;
        let multipleRest = measureStyle && measureStyle.multipleRest;
        if (multipleRest && multipleRest.count > 1 && !measureStyle.multipleRestInitiatedHere) {
            this.satieMultipleRest = measureStyle.multipleRest;
        }
    }

    private _implyNoteheads$(cursor$: ICursor) {
        let {measureStyle} = cursor$.staff.attributes;
        if (measureStyle) {
            _.forEach(this, note => {
                if (measureStyle.slash) {
                    note.notehead = note.notehead || {type: null};
                    note.notehead.type = MusicXML.NoteheadType.Slash;
                    if (!measureStyle.slash.useStems) {
                        note.stem = {
                            type: MusicXML.StemType.None
                        };
                    }
                }
            });
        }
        if (this._isRest) {
            if (this.satieMultipleRest) {
                this.noteheadGlyph = ["restHBar"];
            } else {
                this.noteheadGlyph = [countToRest[this.count]];
            }
        } else {
            this.noteheadGlyph = _.times(this.length, () => countToNotehead[this.count]);
        }
        this.noteheadGlyph = this.noteheadGlyph.map((stdGlyph, idx) =>
            IChord.getNoteheadGlyph(this[idx].notehead, stdGlyph));
    }

    private _hasStem() {
        if (this[0] && this[0].stem && this[0].stem.type === MusicXML.StemType.None) {
            return false;
        }
        return IChord.countToHasStem[this.count];
    }

    /*---- I.2 IChord ---------------------------------------------------------------------------*/

    [key: number]: NoteImpl;
    length: number = 0;
    wholebar$: boolean;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    /**
     * We accept either a Note from musicxml-interfaces, or an IChord, which 
     * is an array-like element of Notes. In either case, we create a deep copy.
     */
    constructor(spec?: IChord | MusicXML.Note) {
        if (!!spec) {
            if (spec._class === "Note") {
                this[0] = new NoteImpl(this, 0, spec);
                this.length = 1;
            } else if ((<IChord>spec).length) {
                _.forEach((<IChord>spec), (note, idx) => {
                    this[idx] = new NoteImpl(this, idx, note);
                });
                this.length = (<IChord>spec).length;
            }
        }
    }

    toXML(): string {
        let xml = "";
        for (let i = 0; i < this.length; ++i) {
            xml += MusicXML.serialize.note(this[i]) + "\n";
        }
        return xml;
    }

    inspect() {
        return this.toXML();
    }

    /*---- III. Util ----------------------------------------------------------------------------*/

    /** @prototype false */
    _isRest: boolean;
    get rest() {
        return this._isRest;
    }
    set rest(r: boolean) {
        if (!!r) {
            this._isRest = true;
            _.times(this.length, idx => {
                if (idx === 0) {
                    this[idx].pitch = null;
                } else {
                    delete this[idx];
                }
            });
            this.tieds = [null];
        } else {
            invariant(!this.rest, "Instead, set the exact pitch or chord...");
        }
    }

    get timeModification() {
        return this._timeModification;
    }

    set timeModification(t: MusicXML.TimeModification) {
        this._timeModification = t;
    }

    get notes(): NoteImpl[] {
        return _.times(this.length, i => this[i]);
    }

    set notes(c: NoteImpl[]) {
        this._isRest = false;
        throw new Error("not implemented");
    }

    get tieds(): MusicXML.Tied[] {
        return _.chain(this.notes)
            .map(n => n.notationObj.tieds)
            .map(t => t && t.length ? t[0] : null)
            .value();
    }
    set tieds(v: MusicXML.Tied[]) {
        _.forEach(this.notes, (n, i) => {
            if (v[i]) {
                n.ensureNotationsWrittable();
                n.notationObj.tieds = [v[i]];
            } else {
                delete n.notationObj.tieds;
            }
        });
        // TODO: Also update sound (ties)
    }

    get count() {
        return this._count;
    }

    set count(n: MusicXML.Count) {
        invariant(!isNaN(n), "Invalid count %s", n);
        this._count = n;
        this.divCount = null; // Kill optimizer.
        _.forEach(this, note => {
            delete note.duration; // Kill playback data.
        });
    }

    stem: MusicXML.Stem;

    private _count: MusicXML.Count;
    private _timeModification: MusicXML.TimeModification;

    /** @prototype */
    dots: number;

    inBeam$: boolean; // set by BeamModels

    push(...notes: MusicXML.Note[]) {
        _.forEach(notes, note => {
            this[this.length] = new NoteImpl(this, this.length, note);
            ++this.length;
        });

        return this.length;
    }

    private _implyCountFromPerformanceData(cursor$: ICursor) {
        const {time, divisions} = cursor$.staff.attributes;
        const ts = {
            beatType: time.beatTypes[0], // FIXME
            beats: _.reduce(time.beats, (sum, beat) => sum + parseInt(beat, 10), 0)
        };

        let factor = ts.beatType/4;
        let beats = factor * (this[0].duration / divisions);
        this._count = 4 / (this[0].duration / divisions);

        // Try dots
        let dotFactor = 1;
        let dots = 0;
        while (!isPO2(1/(beats/dotFactor/4)) && dots < 5) { // /8?
            ++dots;
            dotFactor += Math.pow(1/2, dots);
        }
        if (dots === 5) {
            dots = 0;
        } else if (dots !== 0) {
            this._count = (1/(beats/dotFactor/4/factor));
            this.dots = dots;
        }

        // Try tuplets
        // TODO

        // Try ties
        if (!isPO2(this.count)) {
            // Whole bar rests can still exist even when there's no single NOTE duration
            // that spans a bar.
            if (beats === ts.beats && !!this[0].rest) {
                this._count = MusicXML.Count.Whole;
            } else {
                let nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count)/Math.log(2)));
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
            return !!n && !(n & (n - 1));
        }
    }

    private _getStemHeight(direction: number, clef: MusicXML.Clef): number {
        let heightFromOtherNotes = (IChord.highestLine(this, clef) -
            IChord.lowestLine(this, clef)) * 10;
        let idealStemHeight = IDEAL_STEM_HEIGHT + heightFromOtherNotes;
        let minStemHeight = MIN_STEM_HEIGHT + heightFromOtherNotes;

        let start = IChord.heightDeterminingLine(this, direction, clef)*10;
        let idealExtreme = start + direction*idealStemHeight;

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
        // TODO: Chords should override this
        if (this.satieDirection) {
            return this.satieDirection;
        }

        const {clef} = cursor$.staff.attributes;
        let avgLine = IChord.averageLine(this, clef);
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
            let notes = <ChordModelImpl[]> <any> _.filter(cursor$.segment, (el, idx) => {
                if (idx === cursor$.idx$) {
                    nIdx = nLength;
                }
                let ret = cursor$.factory.modelHasType(el, IModel.Type.Chord);
                if (ret) {
                    ++nLength;
                }
                return nLength;
            });
            invariant(notes.length === nLength, "Invalid filtration");

            // 1. Continue the stem direction of surrounding stems that are in one
            //    direction only
            let linePrev = nIdx > 0 ? IChord.averageLine(notes[nIdx - 1], clef) : 3;
            if (linePrev === 3 && nIdx > 0) {
                // Note, the solution obtained may not be ideal, because we greedily resolve
                // ties in a forward direction.
                linePrev = notes[nIdx - 1].satieDirection === 1 ? 2.99 : 3.01;
            }
            let lineNext = nIdx + 1 < notes.length ?
                IChord.averageLine(notes[nIdx + 1], clef) : 3;
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
            let bpDivisions = _.map(beamingPattern, seg => calcDivisions(seg, cursor$));
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

    satieStem: {
        direction: number;
        stemHeight: number;
        stemStart: number;
    };

    satieFlag: string;
    satieDirection: MusicXML.StemType;
    satieLedger: number[];
    satieMultipleRest: MusicXML.MultipleRest;
    noteheadGlyph: string[];
    satieBeam: IBeam.ILayout;
}

ChordModelImpl.prototype.frozenness = IModel.FrozenLevel.Warm;
ChordModelImpl.prototype.dots = 0;
ChordModelImpl.prototype._isRest = false;

module ChordModelImpl {
    export class Layout implements ChordModel.IChordLayout {
        constructor(baseModel: ChordModelImpl, cursor$: ICursor) {
            this.division = cursor$.division$;
            let {measureStyle} = cursor$.staff.attributes;
            if (measureStyle.multipleRest && !measureStyle.multipleRestInitiatedHere &&
                    measureStyle.multipleRest.count > 0 && !baseModel.satieMultipleRest) {
                // This is not displayed because it is part of a multirest.
                this.expandPolicy = IModel.ExpandPolicy.None;
                return;
            }

            this.model = this._detachModelWithContext(cursor$, baseModel);
            this.boundingBoxes$ = this._captureBoundingBoxes();

            let isWholeBar = baseModel.wholebar$ || baseModel.count === MusicXML.Count.Whole;

            if (baseModel.satieMultipleRest || baseModel.rest && isWholeBar) {
                // N.B.: this.model does not have count
                this.expandPolicy = IModel.ExpandPolicy.Centered;
            }

            _.forEach(this.model, note => {
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
            let widths = _.map(noteheads, getGlyphWidth);
            this.renderedWidth = _.max(widths);

            if (baseModel.satieMultipleRest || baseModel.count === MusicXML.Count.Whole) {
                _.forEach(this.model, note => note.dots = []);
            }

            this.x$ = cursor$.x$ + accidentalWidth;
            this.minSpaceAfter = this._getMinWidthAfter(cursor$);
            this.minSpaceBefore = this._getMinWidthBefore(cursor$);
            cursor$.x$ += totalWidth;
        }

        _captureBoundingBoxes(): IModel.IBoundingRect[] {
            let bboxes: IModel.IBoundingRect[] = [];
            _.forEach(this.model, note => {
                let notations = note.notationObj; // TODO: detach this
                bboxes = bboxes.concat(getBoundingRects(notations));
            });
            return bboxes;
        }

        _calcAccidentalWidth(): number {
            // We allow accidentals to be slightly squished.

            return _.reduce(this.model, (maxWidth, note) => {
                return Math.max(maxWidth, note.accidental ? -note.accidental.defaultX : 0);
            }, 0)*0.73;
        }

        _calcTotalWidth(cursor: ICursor, baseModel: ChordModelImpl): number {
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

            return baseWidth + extraWidth + accidentalWidth + this._calcDotWidth(cursor, baseModel);
        }

        _calcDotWidth(cursor: ICursor, baseModel: ChordModelImpl): number {
            if (baseModel.wholebar$ || baseModel.satieMultipleRest) {
                return 0;
            }
            return _.max(_.map(baseModel, m => m.dots.length))*6;
        }

        _getMinWidthBefore(cursor: ICursor) {
            return this._getLyricWidth(cursor)/2;
        }

        _getMinWidthAfter(cursor: ICursor) {
            return this._getLyricWidth(cursor)/2;
        }

        _getLyricWidth(cursor: ICursor) {
            let factor = 40*25.4/96; // 40 tenths in staff * pixelFactor
            return getChordLyricWidth(this.model, factor);
        }

        _detachModelWithContext(cursor: ICursor, baseModel: ChordModelImpl): ChordModelImpl {
            let {clef} = cursor.staff.attributes;
            let model: ChordModelImpl = <any> _.map(baseModel, note => Object.create(note, {
                /* Here, we're extending each note to have the correct default position.
                 * To do so, we use prototypical inheritance. See Object.create. */

                defaultX: {
                    get: () => {
                        return note.defaultX || (<any>this).overrideX || this.x$;
                    }
                },
                defaultY: {
                    get: () => {
                        if (note.defaultY) {
                            return note.defaultY;
                        }
                        return (IChord.lineForClef(note, clef) - 3)*10;
                    }
                },
                stem: {
                    get: () => {
                        return baseModel.stem || {
                            type: baseModel.satieDirection
                        };
                    }
                }
            }));
            model.satieStem = baseModel.satieStem;
            model.satieLedger = baseModel.satieLedger;
            model.satieMultipleRest = baseModel.satieMultipleRest;
            model.satieFlag = baseModel.satieFlag;
            model.noteheadGlyph = baseModel.noteheadGlyph;
            model.staffIdx = baseModel.staffIdx;
            model.divCount = baseModel.divCount;

            return model;
        }

        /*---- IChordLayout ------------------------------------------------------*/

        // Constructed:

        model: ChordModelImpl;
        x$: number;
        division: number;
        renderedWidth: number;
        notehead: string;

        minSpaceBefore: number;
        minSpaceAfter: number;

        // Prototype:

        mergePolicy: IModel.HMergePolicy;
        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
    }

    Layout.prototype.mergePolicy = IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = IModel.ExpandPolicy.After;
    Layout.prototype.renderClass = IModel.Type.Chord;
    Layout.prototype.boundingBoxes$ = [];
}

export default ChordModelImpl;
