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

/**
 * @file part of Satie test suite
 */

"use strict";

import Engine           = require("../../engine");

export var fakeAttributeChordFactory: Engine.IModel.IFactory = {
    create: (modelType: Engine.IModel.Type): Engine.IModel => {
        chai.assert(false, "not reached");
        return null;
    },
    modelHasType: (model: Engine.IModel, modelType: Engine.IModel.Type): boolean => {
        if (model.divCount === 0) {
            return modelType === Engine.IModel.Type.Attributes;
        }
        return modelType === Engine.IModel.Type.Chord;
    },
    searchHere: (models: Engine.IModel[], idx: number,
            modelType: Engine.IModel.Type): Engine.IModel[] => {
        return this.modelHasType(models[idx], modelType) ? [models[idx]] : [];
    },
    fromSpec: (spec: any): Engine.IModel => {
        throw "Not implemented";
    }
};

export function createFakeStaffSegment(divisions1: number, divisions2: number, idx: number): Engine.Measure.ISegment {
    let a: Engine.Measure.ISegment = <any> <Engine.IModel[]> [
        {
            divCount: divisions1,
            staffIdx: 1,
            frozenness: Engine.IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: Engine.Measure.ISegment) => { /* pass */ },
            validate$: function(cursor$: Engine.ICursor) {
                // pass
            },
            fields: [],
            layout: function(cursor$: Engine.ICursor): Engine.IModel.ILayout {
                var width = cursor$.detached ? 0 : 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    mergePolicy: Engine.IModel.HMergePolicy.Min,
                    x$: cursor$.x$ - width,
                    model: this,
                    priority: Engine.IModel.Type.Attributes
                };
            }
        },
        {
            divCount: divisions2,
            staffIdx: 1,
            frozenness: Engine.IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: Engine.Measure.ISegment) => { /* pass */ },
            validate$: function(cursor$: Engine.ICursor) {
                // pass
            },
            fields: [],
            layout: function(cursor$: Engine.ICursor): Engine.IModel.ILayout {
                var width = 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    mergePolicy: Engine.IModel.HMergePolicy.Max,
                    x$: cursor$.x$ - width,
                    model: this,
                    priority: Engine.IModel.Type.Attributes
                };
            }
        }
    ];
    a.owner = idx;
    a.divisions = divisions1 + divisions2;
    a.ownerType = Engine.Measure.OwnerType.Staff;
    return a;
}

export function createFakeVoiceSegment(divisions1: number, divisions2: number, idx: number): Engine.Measure.ISegment {
    let a: Engine.Measure.ISegment = <any> <Engine.IModel[]> [
        {
            divCount: divisions1,
            staffIdx: 1,
            frozenness: Engine.IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: Engine.Measure.ISegment) => { /* pass */ },
            validate$: function(cursor$: Engine.ICursor) {
                // pass
            },
            fields: [],
            layout: function(cursor$: Engine.ICursor): Engine.IModel.ILayout {
                var width = divisions1 * 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    mergePolicy: Engine.IModel.HMergePolicy.Min,
                    x$: cursor$.x$ - width,
                    expandable: true,
                    model: this,
                    priority: Engine.IModel.Type.Chord
                };
            }
        },
        {
            divCount: divisions2,
            staffIdx: 1,
            frozenness: Engine.IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: Engine.Measure.ISegment) => { /* pass */ },
            validate$: function(cursor$: Engine.ICursor) {
                // pass
            },
            fields: [],
            layout: function(cursor$: Engine.ICursor): Engine.IModel.ILayout {
                var width = divisions2*10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    mergePolicy: Engine.IModel.HMergePolicy.Max,
                    x$: cursor$.x$ - width,
                    expandable: true,
                    model: this,
                    priority: Engine.IModel.Type.Chord
                };
            }
        }
    ];
    a.owner = idx;
    a.ownerType = Engine.Measure.OwnerType.Voice;
    a.divisions = divisions1 + divisions2;
    return a;
}

export function createFakeLayout(idx: number, offset: number, max: boolean): Engine.IModel.ILayout {
    return {
        model: <any> {},
        x$: idx*100 + Math.log(1 + offset)/Math.log(2) * 10,
        division: idx*4 + offset,
        mergePolicy: max ? Engine.IModel.HMergePolicy.Max : Engine.IModel.HMergePolicy.Min,
        boundingBoxes$: [],
        priority: Engine.IModel.Type.Attributes
    };
}
