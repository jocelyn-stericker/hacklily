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

/**
 * @file part of Satie test suite
 */

import OwnerType from "../../document/ownerTypes";
import ISegment from "../../document/segment";
import IModel from "../../document/model";
import Type from "../../document/types";
import ExpandPolicy from "../../document/expandPolicies";

import IFactory from "../../private/factory";
import ILayout from "../../private/layout";
import ICursor from "../../private/cursor";

export let fakeFactory: IFactory = {
    create: (modelType: Type): IModel => {
        chai.assert(false, "not reached");
        return null;
    },
    modelHasType: (model: IModel, modelType: Type): boolean => {
        if (model.divCount === 0) {
            return modelType === Type.Attributes;
        } else if ("length" in model) {
            return modelType === Type.Chord;
        }
        return modelType === Type.Spacer;
    },
    search: (models: IModel[], idx: number,
            modelType: Type): IModel[] => {
        return fakeFactory.modelHasType(models[idx], modelType) ? [models[idx]] : [];
    },
    fromSpec: (spec: any): IModel => {
        throw new Error("Not implemented");
    }
};

export function createFakeStaffSegment(
        divisions1: number, divisions2: number, idx: number): ISegment {
    let a: ISegment = <any> <IModel[]> [
        {
            divCount: divisions1,
            staffIdx: 1,

            __validate: function(cursor$: ICursor) {
                // pass
            },
            __layout: function(cursor$: ICursor): ILayout {
                let width = cursor$.detached ? 0 : 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    model: this,
                    renderClass: Type.Attributes
                };
            }
        },
        {
            divCount: divisions2,
            staffIdx: 1,

            __validate: function(cursor$: ICursor) {
                // pass
            },
            __layout: function(cursor$: ICursor): ILayout {
                let width = 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    model: this,
                    renderClass: Type.Attributes
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
    let a: ISegment = <any> <(IModel & {length: number; 0: any})[]> [
        {
            divCount: divisions1,
            staffIdx: 1,
            length: 1,
            [0]: {
                pitch: {
                    step: "E",
                    octave: 4
                },
                noteType: {
                    duration: 8,
                },
                ties: [{}]
            },

            __validate: function(cursor$: ICursor) {
                // pass
            },

            __layout: function(cursor$: ICursor): ILayout {
                let width = divisions1 * 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    expandPolicy: ExpandPolicy.After,
                    model: this,
                    renderClass: Type.Chord
                };
            }
        },
        {
            divCount: divisions2,
            staffIdx: 1,
            length: 1,
            [0]: {
                pitch: {
                    step: "E",
                    octave: 4
                },
                noteType: {
                    duration: 8,
                },
                ties: [{}]
            },

            __validate: function(cursor$: ICursor) {
                // pass
            },

            __layout: function(cursor$: ICursor): ILayout {
                let width = divisions2 * 10;
                cursor$.x$ += width;
                return {
                    boundingBoxes$: [],
                    division: cursor$.division$,
                    x$: cursor$.x$ - width,
                    expandPolicy: ExpandPolicy.After,
                    model: this,
                    renderClass: Type.Chord
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

export function createFakeLayout(idx: number, offset: number, max: boolean): ILayout {
    return {
        model: <any> {},
        x$: idx * 100 + Math.log(1 + offset) / Math.log(2) * 10,
        division: idx * 4 + offset,
        boundingBoxes$: [],
        renderClass: Type.Attributes
    };
}
