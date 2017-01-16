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

import {reduce, forEach} from "lodash";
import {lcm} from "./private_util";
import {IFactory} from "./private_factory";

import {IModel} from "./document_model";
import {ISegment} from "./document_measure";
import {IDocument} from "./document_document";
import Type from "./document_types";

/** 
 * Given a set of segments, scales divisions so that they are compatible.
 * 
 * Returns the division count.
 */
export function normalizeDivisionsInPlace(factory: IFactory | IDocument,
                                          segments$: ISegment[],
                                          factor: number = 0): number {

    let divisions: number = factor || reduce(segments$, (div1, seg) => {
        if (!div1) {
            return 1;
        }

        return lcm(div1, seg.divisions);
    }, 0);

    forEach(segments$, segment => {
        if (!segment) {
            return;
        }

        let ratio = divisions / segment.divisions;
        segment.divisions = divisions;

        forEach(segment, (model: IModel) => {
            if (model.divCount) {
                model.divCount *= ratio;
            }

            if (factory.modelHasType(model, Type.Chord)) {
                forEach(model, note => {
                    if (note.duration) {
                        note.duration *= ratio;
                    }
                });
            }
            if (factory.modelHasType(model, Type.Attributes)) {
                // This could be an attributes item or a note.
                if (model.divisions) {
                    ratio = divisions / model.divisions;
                }
                try {
                    model.divisions = divisions;
                } catch(err) {
                    console.warn("Could not set divisions");
                }
            }
        });
    });

    return divisions;
};
