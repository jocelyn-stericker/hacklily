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

import Engine           = require("../engine");
import NoteImpl         = require("./noteImpl"); // @cyclic
import ChordModel       = require("../chord");
import Metre            = require("./metre");

const IDEAL_STEM_HEIGHT: number    = 35;
const MIN_STEM_HEIGHT: number      = 25;

/**
 * A model that represents 1 or more notes in the same voice, starting on the same beat, and each
 * with the same duration. Any number of these notes may be rests.
 */
class ChordModelImpl implements ChordModel.IChordModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** set in validate$ */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    /** @prototype only */
    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // pass
    }

    validate$(cursor$: Engine.ICursor): void {
        this.divCount = Metre.calcDivisions(this, cursor$);
        invariant(isFinite(this.divCount), "Unknown beat count");

        if (!isFinite(this._count)) {
            this._implyCountFromPerformanceData(cursor$);
        }

        const direction = this._pickDirection(cursor$);
        const clef = cursor$.staff.attributes.clefs[cursor$.staff.idx];

        this.satieStem = {
            direction:  direction,
            stemHeight: this._getStemHeight(direction, clef),
            stemStart:  Engine.IChord.startingLine(this, direction, clef)
        };

        this.satieDirection = direction === 1 ? MusicXML.StemType.Up : MusicXML.StemType.Down;

        this.satieLedger = Engine.IChord.ledgerLines(this, clef);

        _.forEach(this, note => {
            if (!note.duration && !note.grace) {
                note.duration = this.divCount;
            }
            note.validate$();
        });

        this.wholebar$ = this.divCount === cursor$.staff.totalDivisions || this.divCount === -1;
        // TODO: overfill
        // TODO: rhythmic spelling
        // TODO: the document must end with a marker

        invariant(isFinite(this._count) && this._count !== null, "%s is not a valid count", this._count);
    }

    layout(cursor$: Engine.ICursor): ChordModel.IChordLayout {
        // mutates cursor$ as required.
        return new ChordModelImpl.Layout(this, cursor$);
    }

    /*---- I.2 IChord ---------------------------------------------------------------------------*/

    [key: number]: NoteImpl;
    length: number              = 0;
    wholebar$: boolean;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec?: Engine.IChord | MusicXML.Note | {_class: string}) {
        if (!!spec) {
            if ((<{_class: string}>spec)._class === "Note") {
                this[0] = new NoteImpl(this, 0, spec);
                this.length = 1;
            } else if ((<Engine.IChord>spec).length) {
                _.forEach((<Engine.IChord>spec), (note, idx) => {
                    this[idx] = new NoteImpl(this, idx, note);
                });
                this.length = (<Engine.IChord>spec).length;
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
        this._timeModification            = t;
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

    private _implyCountFromPerformanceData(cursor$: Engine.ICursor) {
        const times = cursor$.staff.attributes.times;
        const divisions = cursor$.staff.attributes.divisions;
        const tsComplex = times[0];
        const ts = {
            beats: _.reduce(tsComplex.beats, (sum, beat) => sum + parseInt(beat, 10), 0),
            beatType: tsComplex.beatTypes[0] // FIXME
        };

        var factor = ts.beatType/4;
        var beats = factor * (this[0].duration / divisions);
        this._count = 4 / (this[0].duration / divisions);

        // Try dots
        var dotFactor = 1;
        var dots = 0;
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
                this._count = -1;
            } else {
                var nextPO2 = Math.pow(2, Math.ceil(Math.log(this.count)/Math.log(2)));
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
        var heightFromOtherNotes = (Engine.IChord.highestLine(this, clef) -
            Engine.IChord.lowestLine(this, clef)) * 10;
        var idealStemHeight = IDEAL_STEM_HEIGHT + heightFromOtherNotes;
        var minStemHeight = MIN_STEM_HEIGHT + heightFromOtherNotes;

        var start = Engine.IChord.heightDeterminingLine(this, direction, clef)*10;
        var idealExtreme = start + direction*idealStemHeight;

        var result: number;
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

        return result;
    }

    private _pickDirection(cursor$: Engine.ICursor) {
        // TODO: Chords should override this

        const clef = cursor$.staff.attributes.clefs[cursor$.staff.idx];
        let avgLine = Engine.IChord.averageLine(this, clef);
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
                let ret = cursor$.factory.modelHasType(el, Engine.IModel.Type.Chord);
                if (ret) {
                    ++nLength;
                }
                return nLength;
            });
            invariant(notes.length === nLength, "Invalid filtration");

            // 1. Continue the stem direction of surrounding stems that are in one
            //    direction only
            let linePrev = nIdx > 0 ? Engine.IChord.averageLine(notes[nIdx - 1], clef) : 3;
            if (linePrev === 3 && nIdx > 0) {
                // Note, the solution obtained may not be ideal, because we greedily resolve ties in a forward
                // direction.
                linePrev = notes[nIdx - 1].satieDirection === 1 ? 2.99 : 3.01;
            }
            const lineNext = nIdx + 1 < notes.length ? Engine.IChord.averageLine(notes[nIdx + 1], clef) : 3;
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
            const beamingPattern = Metre.getBeamingPattern(cursor$.staff.attributes.times);
            const bpDivisions = _.map(beamingPattern, seg => Metre.calcDivisions(seg, cursor$));
            const currDivision = cursor$.division$;
            let prevDivisionStart = 0;
            let i = 0;
            for (; i < bpDivisions.length; ++i) {
                if (prevDivisionStart + bpDivisions[i] >= currDivision) {
                    break;
                }
                prevDivisionStart += bpDivisions[i];
            }
            let nextDivisionStart = prevDivisionStart + bpDivisions[i] || NaN;
            let considerPrev = (prevDivisionStart < currDivision) ? notes[nIdx - 1] : null;
            let considerNext = (nextDivisionStart > currDivision + this.divCount) ? notes[nIdx + 1] : null;
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
        direction:  number;
        stemHeight: number;
        stemStart:  number;
    };

    satieDirection: MusicXML.StemType;

    /**
     * Line numbers that need ledgers
     */
    satieLedger: number[];
}

ChordModelImpl.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;
ChordModelImpl.prototype.dots = 0;
ChordModelImpl.prototype.staffIdx = 1;
ChordModelImpl.prototype._isRest = false;

module ChordModelImpl {
    export class Layout implements ChordModel.IChordLayout {
        constructor(model: ChordModelImpl, cursor$: Engine.ICursor) {
            this.model = <any> _.map(model, note => Object.create(note, {
                /* Here, we're extending each note to have the correct default position.
                 * To do so, we use prototypical inheritance. See Object.create. */

                defaultX: {
                    get: () => {
                        return note.defaultX || this.x$;
                    }
                },
                defaultY: {
                    get: () => {
                        if (note.defaultY) {
                            return note.defaultY;
                        }
                        const clef = cursor$.staff.attributes.clefs[cursor$.staff.idx];
                        return (Engine.IChord.lineForClef(note, clef) - 3)*10;
                    }
                },
                stem: {
                    get: () => {
                        return model.stem || {
                            type: model.satieDirection
                        };
                    }
                }
            }));
            this.model.satieStem = model.satieStem;
            this.model.satieLedger = model.satieLedger;
            _.forEach(this.model, note => {
                cursor$.maxPaddingTop$ = Math.max(cursor$.maxPaddingTop$, note.defaultY - 10);
                cursor$.maxPaddingBottom$ = Math.max(cursor$.maxPaddingBottom$, note.defaultY - 30);
            });
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            /*---- Move cursor in time ------------------*/

            if (model.divCount === -1) {
                cursor$.division$ += cursor$.staff.totalDivisions;
            } else {
                cursor$.division$ += model.divCount;
            }

            /*---- Move cursor by width -----------------*/

            // TODO: Each note's width has a linear component proportional to log of its duration
            // with respect to the shortest length
            const divisions = cursor$.staff.attributes.divisions;
            let extraWidth = (Math.log(model.divCount) - Math.log(cursor$.line.shortestCount *
                    divisions)) / Math.log(2) / 3 * 40;
            const grace = model[0].grace; // TODO: What if only some notes are grace?
            if (grace) {
                extraWidth /= 10; // TODO: Put grace notes in own segment
            }
            const baseWidth = grace ? 11.4 : 22.8;

            const accidentalWidth = 0; // TODO: displayedAccidentals ? 9.6*(grace ? 0.6 : 1.0) : 0;
            const totalWidth = baseWidth + extraWidth + accidentalWidth;

            // TODO
            // const lyricWidth = this.getLyricWidth();
            // totalWidth = Math.max(lyricWidth/2, totalWidth);
            invariant(isFinite(totalWidth), "Invalid width %s", totalWidth);

            cursor$.x$ += totalWidth;

            /*---- Misc ---------------------------------*/

            // TODO: set min/max padding
            // TODO: set invisible counter

            if (cursor$.staff.attributes.clefs) {
                this.clef = cursor$.staff.attributes.clefs[cursor$.staff.idx];
            } else {
                this.clef = null;
            }

            let measureStyle: MusicXML.MeasureStyle = cursor$.staff.attributes.measureStyle;
            this.multipleRest = measureStyle ? measureStyle.multipleRest : null;
        }

        /*---- IChordLayout ------------------------------------------------------*/

        // Constructed:

        model: ChordModelImpl;
        x$: number;
        division: number;

        // Prototype:

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        renderClass: Engine.IModel.Type;
        expandable: boolean;

        /*---- ChordModel ---------------------------------------------------*/

        clef: MusicXML.Clef;
        multipleRest: MusicXML.MultipleRest;
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandable = true;
    Layout.prototype.renderClass = Engine.IModel.Type.Chord;
    Layout.prototype.boundingBoxes$ = [];
}

export = ChordModelImpl;
