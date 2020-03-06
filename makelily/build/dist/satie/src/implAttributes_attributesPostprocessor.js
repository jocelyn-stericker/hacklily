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
import { forEach, sortedIndex, some } from "lodash";
import { Type } from "./document";
/**
 * Sets the width of attributes w.r.t. staff lines.
 *
 * @returns a list of measures
 */
function attributes(_options, _bounds, measures) {
    var attributesByPart = {};
    var originXByPart = {};
    var measureStartX = 0;
    var targetsByPart = {};
    var isBarlineByPart = {};
    forEach(measures, function (measure) {
        forEach(measure.elements, function (elements) {
            forEach(elements, function (element) {
                if (!element.model) {
                    return;
                }
                if (element.renderClass === Type.Barline ||
                    element.renderClass === Type.Chord) {
                    var partKey = element.part + "_" + element.model.staffIdx;
                    if (!element.model.staffIdx) {
                        console.warn("Missing staffIdx", element.model);
                    }
                    if (!targetsByPart[partKey]) {
                        targetsByPart[partKey] = [];
                        isBarlineByPart[partKey] = [];
                    }
                    var targets = targetsByPart[partKey];
                    var x = element.x + measureStartX;
                    var index = sortedIndex(targets, x);
                    var isBarline = element.renderClass === Type.Barline;
                    if (targets[index] === x) {
                        isBarlineByPart[partKey][index] =
                            isBarlineByPart[partKey][index] || isBarline;
                    }
                    else {
                        targets.splice(index, 0, element.x + measureStartX);
                        isBarlineByPart[partKey].splice(index, 0, isBarline);
                    }
                }
            });
        });
        measureStartX += measure.width;
    });
    measureStartX = 0;
    forEach(measures, function (measure) {
        forEach(measure.elements, function (elements) {
            forEach(elements, function (element) {
                if (!element.model) {
                    return;
                }
                var partKey = element.part + "_" + element.model.staffIdx;
                if (element.renderClass === Type.Attributes && element.model) {
                    // Calculate the width for the staff lines in the previous attributes element.
                    {
                        var targets = targetsByPart[partKey] || [];
                        var targetIdx = sortedIndex(targets, element.x + measureStartX) - 1;
                        var targetIsBarline = isBarlineByPart[partKey][targetIdx];
                        if (!targetIsBarline) {
                            targetIdx++;
                        }
                        if (attributesByPart[partKey]) {
                            var target = targets[targetIdx];
                            attributesByPart[partKey].staffWidth =
                                target - originXByPart[partKey];
                        }
                    }
                    // Capture the new attributes element.
                    var shouldSplit = false;
                    if (!attributesByPart[partKey]) {
                        shouldSplit = true;
                    }
                    else {
                        var oldAttributes = attributesByPart[partKey]
                            .model;
                        var newAttributes_1 = element.model;
                        shouldSplit = some(oldAttributes.staffDetails, function (details, detailIndex) {
                            if (!details) {
                                return false;
                            }
                            var newDetails = newAttributes_1.staffDetails[detailIndex];
                            return details.staffLines !== newDetails.staffLines;
                        });
                    }
                    if (shouldSplit) {
                        attributesByPart[partKey] = element;
                        var targets = targetsByPart[partKey] || [];
                        var targetIdx = sortedIndex(targets, element.x + measureStartX) - 1;
                        var attrTarget = targets[targetIdx] || 0;
                        var target = targets[targetIdx] || 0;
                        originXByPart[partKey] = target;
                        element.staffLinesOffsetX =
                            element.x + measureStartX - target - (target - attrTarget);
                    }
                }
            });
        });
        measureStartX += measure.width;
    });
    forEach(attributesByPart, function (attributes, partKey) {
        attributes.staffWidth = measureStartX - originXByPart[partKey];
    });
    return measures;
}
export default attributes;
//# sourceMappingURL=implAttributes_attributesPostprocessor.js.map