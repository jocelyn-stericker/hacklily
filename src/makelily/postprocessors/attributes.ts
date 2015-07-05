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

"use strict";

import {Attributes} from "musicxml-interfaces";
import {forEach, sortedIndex, any} from "lodash";

import {IModel, IMeasureLayout, ILayoutOptions, ILineBounds} from "../engine";

/** 
 * Sets the width of attributes w.r.t. staff lines.
 * 
 * @returns a list of measures
 */
function attributes(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {

    let attributesByPart: {[part: string]: IModel.ILayout} = {};
    let originXByPart: {[part: string]: number} = {};
    let measureStartX = 0;
    let targetsByPart: {[part: string]: number[]} = {};
    let isBarlineByPart: {[part: string]: boolean[]} = {};

    forEach(measures, measure => {
        forEach(measure.elements, elements => {
            forEach(elements, (element, index) => {
                if (!element.model) {
                    return;
                }
                if (element.renderClass === IModel.Type.Barline ||
                        element.renderClass === IModel.Type.Chord) {
                    let partKey = element.part + "_" + element.model.staffIdx;
                    if (!targetsByPart[partKey]) {
                        targetsByPart[partKey] = [];
                        isBarlineByPart[partKey] = [];
                    }
                    let targets = targetsByPart[partKey];
                    let x = element.x$ + measureStartX;
                    let index = sortedIndex(targets, x);
                    let isBarline = element.renderClass === IModel.Type.Barline;
                    if (targets[index] === x) {
                        isBarlineByPart[partKey][index] =
                            isBarlineByPart[partKey][index] || isBarline;
                    } else {
                        targets.splice(index, 0, element.x$ + measureStartX);
                        isBarlineByPart[partKey].splice(index, 0, isBarline);
                    }
                }
            });
        });
        measureStartX += measure.width;
    });

    measureStartX = 0;

    forEach(measures, measure => {
        forEach(measure.elements, elements => {
            forEach(elements, (element, index) => {
                if (!element.model) {
                    return;
                }
                let partKey = element.part + "_" + element.model.staffIdx;
                if (element.renderClass === IModel.Type.Attributes && element.model) {
                    let targetIsBarline = true;
                    if (attributesByPart[partKey]) {
                        let targets = targetsByPart[partKey] || [];
                        let targetIdx = sortedIndex(targets, element.x$ + measureStartX) - 1;
                        targetIsBarline = isBarlineByPart[partKey][targetIdx];
                        if (!targetIsBarline) {
                            targetIdx++;
                        }
                        let target = targets[targetIdx];
                        (<any>attributesByPart[partKey]).staffWidth = target -
                            originXByPart[partKey];
                    }

                    let shouldSplit = false;

                    if (!attributesByPart[partKey]) {
                        shouldSplit = true;
                    } else {
                        let oldAttributes: Attributes = attributesByPart[partKey].model;
                        let newAttributes: Attributes = element.model;
                        shouldSplit = any(oldAttributes.staffDetails, (details, detailIndex) => {
                            if (!details) {
                                return false;
                            }
                            let newDetails = newAttributes.staffDetails[detailIndex];
                            return details.staffLines !== newDetails.staffLines;
                        });
                    }

                    if (shouldSplit) {
                        attributesByPart[partKey] = element;
                        let targets = targetsByPart[partKey] || [];
                        let targetIdx = sortedIndex(targets, element.x$ + measureStartX) - 1;
                        let attrTarget = targets[targetIdx] || 0;
                        if (!targetIsBarline) {
                            ++targetIdx;
                        }
                        let target = targets[targetIdx] || 0;
                        originXByPart[partKey] = target;
                        if (measureStartX === 0) {
                            // FIXME
                            (<any>element).staffLinesOffsetX = 0;
                        } else {
                            (<any>element).staffLinesOffsetX = element.x$ + measureStartX -
                                target - (target - attrTarget);
                        }
                    }
                }
            });
        });
        measureStartX += measure.width;
    });
    forEach(attributesByPart, (attributes, partKey) => {
        (<any>attributes).staffWidth = measureStartX - originXByPart[partKey];
    });
    return measures;
}

export default attributes;
