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
    get fields(): string[]{
        return _.times(this.length, idx => "" + idx)
            .concat("length", "dots");
    }

    modelDidLoad$(segment$: Engine.Measure.ISegmentRef): void {
        // pass
    }

    validate$(cursor$: Engine.ICursor): void {
        // Get the measureStyle owned by the most recent attribute...
        var measureStyle: MusicXML.MeasureStyle = cursor$.staff.attributes.measureStyle;
        // ... and use it to sync multi rest attributes.
        if (measureStyle && measureStyle.multipleRest && measureStyle.multipleRest.count > 1 &&
                !cursor$.hiddenCounter$) {
            this.multiRest$ = measureStyle.multipleRest.count;
        } else {
            delete this.multiRest$;
        }

        this.divCount = Metre.calcDivisions(this, cursor$);
        invariant(isFinite(this.divCount), "Unknown beat count");

        _.forEach(this, note => {
            if (!note.duration && !note.grace) {
                note.duration = this.divCount;
            }
            note.validate$();
        });

        this.wholebar$ = this.divCount === cursor$.staff.totalDivisions || this.divCount === -1;

        invariant(this.multiRest$ && this.wholebar$ || !this.multiRest$,
            "multiRest should imply wholebar$");

        // TODO: overfill
        // TODO: rhythmic spelling
        // TODO: the doumcnet must end with a marker
    }

    layout(cursor$: Engine.ICursor): ChordModel.IChordLayout {
        // mutates cursor$ as required.
        return new ChordModelImpl.Layout(this, cursor$);
    }

    /*---- I.2 IChord ---------------------------------------------------------------------------*/

    [key: number]: NoteImpl;
    length: number              = 0;
    multiRest$: number;
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
        return MusicXML.chordToXML(this);
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
}

ChordModelImpl.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;
ChordModelImpl.prototype.dots = 0;
ChordModelImpl.prototype.staffIdx = 1;
ChordModelImpl.prototype._isRest = false;

module ChordModelImpl {
    export class Layout implements ChordModel.IChordLayout {
        constructor(model: ChordModelImpl, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            if (model.divCount === -1) {
                cursor$.division$ += cursor$.staff.totalDivisions;
            } else {
                cursor$.division$ += model.divCount;
            }

            // TODO: Each note's width has a linear component proportional to log of its duration
            // with respect to the shortest length

            // TODO: set data for view

            // TODO: set min/max padding
            // TODO: set invisible counter
        }

        /*---- IChordLayout ------------------------------------------------------*/

        // Constructed:

        model: ChordModelImpl;
        x$: number;
        division: number;

        // Prototype:

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        priority: Engine.IModel.Type;
        expandable: boolean;

        /*---- ChordModel ---------------------------------------------------*/

    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandable = true;
    Layout.prototype.priority = Engine.IModel.Type.Chord;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);

}

export = ChordModelImpl;
