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

import {forEach, sortedIndex} from "lodash";

import Type from "../document/types";

import ILayout from "../private/layout";
import IMeasureLayout from "../private/measureLayout";
import ILayoutOptions from "../private/layoutOptions";
import ILineBounds from "../private/lineBounds";

/** 
 * Sets the width of attributes w.r.t. staff lines.
 * 
 * @returns a list of measures
 */
function attributes(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {

    let attributesByPart: {[part: string]: ILayout} = {};
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
                if (element.renderClass === Type.Barline ||
                        element.renderClass === Type.Chord) {
                    let partKey = element.part + "_" + element.model.staffIdx;
                    if (!element.model.staffIdx) {
                        console.warn("Missing staffIdx", element.model);
                    }
                    if (!targetsByPart[partKey]) {
                        targetsByPart[partKey] = [];
                        isBarlineByPart[partKey] = [];
                    }
                    let targets = targetsByPart[partKey];
                    let x = element.x$ + measureStartX;
                    let index = sortedIndex(targets, x);
                    let isBarline = element.renderClass === Type.Barline;
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
                if (element.renderClass === Type.Attributes && element.model) {
                    // Calculate the width for the staff lines in the previous attributes element.
                    {
                        let targets = targetsByPart[partKey] || [];
                        let targetIdx = sortedIndex(targets, element.x$ + measureStartX) - 1;
                        let targetIsBarline = isBarlineByPart[partKey][targetIdx];
                        if (!targetIsBarline) {
                            targetIdx++;
                        }
                        if (attributesByPart[partKey]) {
                            let target = targets[targetIdx];
                            (<any>attributesByPart[partKey]).staffWidth = target -
                                originXByPart[partKey];
                        }
                    }

                    // Capture the new attributes element.
                    {
                        attributesByPart[partKey] = element;
                        let targets = targetsByPart[partKey] || [];
                        let targetIdx = sortedIndex(targets, element.x$ + measureStartX) - 1;
                        let attrTarget = targets[targetIdx] || 0;
                        let target = targets[targetIdx] || 0;
                        originXByPart[partKey] = target;
                        (<any>element).staffLinesOffsetX = element.x$ + measureStartX -
                            target - (target - attrTarget);
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
