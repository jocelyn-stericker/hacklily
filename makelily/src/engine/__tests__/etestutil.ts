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

import ICursor from "../icursor";
import IModel from "../imodel";
import {ISegment, OwnerType} from "../measure";

export let fakeFactory: IModel.IFactory = {
    create: (modelType: IModel.Type): IModel => {
        chai.assert(false, "not reached");
        return null;
    },
    modelHasType: (model: IModel, modelType: IModel.Type): boolean => {
        if (model.divCount === 0) {
            return modelType === IModel.Type.Attributes;
        }
        return modelType === IModel.Type.Chord;
    },
    search: (models: IModel[], idx: number,
            modelType: IModel.Type): IModel[] => {
        return fakeFactory.modelHasType(models[idx], modelType) ? [models[idx]] : [];
    },
    fromSpec: (spec: any): IModel => {
        throw "Not implemented";
    }
};

export function createFakeStaffSegment(
        divisions1: number, divisions2: number, idx: number): ISegment {
    let a: ISegment = <any> <IModel[]> [
        {
            divCount: divisions1,
            staffIdx: 1,
            frozenness: IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: ISegment) => { /* pass */ },
            validate$: function(cursor$: ICursor) {
                // pass
            },
            layout: function(cursor$: ICursor): IModel.ILayout {
                let width = cursor$.detached ? 0 : 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    model: this,
                    renderClass: IModel.Type.Attributes
                };
            }
        },
        {
            divCount: divisions2,
            staffIdx: 1,
            frozenness: IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: ISegment) => { /* pass */ },
            validate$: function(cursor$: ICursor) {
                // pass
            },
            layout: function(cursor$: ICursor): IModel.ILayout {
                let width = 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    model: this,
                    renderClass: IModel.Type.Attributes
                };
            }
        }
    ];
    a.owner = idx;
    a.part = "P1";
    a.divisions = divisions1 + divisions2;
    a.ownerType = OwnerType.Staff;
    return a;
}

export function createFakeVoiceSegment(
        divisions1: number, divisions2: number, idx: number): ISegment {
    let a: ISegment = <any> <IModel[]> [
        {
            divCount: divisions1,
            staffIdx: 1,
            frozenness: IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: ISegment) => { /* pass */ },
            validate$: function(cursor$: ICursor) {
                // pass
            },
            layout: function(cursor$: ICursor): IModel.ILayout {
                let width = divisions1 * 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    expandPolicy: IModel.ExpandPolicy.After,
                    model: this,
                    renderClass: IModel.Type.Chord
                };
            }
        },
        {
            divCount: divisions2,
            staffIdx: 1,
            frozenness: IModel.FrozenLevel.Warm,
            modelDidLoad$: (segment$: ISegment) => { /* pass */ },
            validate$: function(cursor$: ICursor) {
                // pass
            },
            layout: function(cursor$: ICursor): IModel.ILayout {
                let width = divisions2*10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    expandPolicy: IModel.ExpandPolicy.After,
                    model: this,
                    renderClass: IModel.Type.Chord
                };
            }
        }
    ];
    a.owner = idx;
    a.part = "P1";
    a.ownerType = OwnerType.Voice;
    a.divisions = divisions1 + divisions2;
    return a;
}

export function createFakeLayout(idx: number, offset: number, max: boolean): IModel.ILayout {
    return {
        model: <any> {},
        x$: idx*100 + Math.log(1 + offset)/Math.log(2) * 10,
        division: idx*4 + offset,
        boundingBoxes$: [],
        renderClass: IModel.Type.Attributes
    };
}
