"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var document_1 = require("./document");
/**
 * Sets the width of attributes w.r.t. staff lines.
 *
 * @returns a list of measures
 */
function attributes(options, bounds, measures) {
    var attributesByPart = {};
    var originXByPart = {};
    var measureStartX = 0;
    var targetsByPart = {};
    var isBarlineByPart = {};
    lodash_1.forEach(measures, function (measure) {
        lodash_1.forEach(measure.elements, function (elements) {
            lodash_1.forEach(elements, function (element, index) {
                if (!element.model) {
                    return;
                }
                if (element.renderClass === document_1.Type.Barline ||
                    element.renderClass === document_1.Type.Chord) {
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
                    var index_1 = lodash_1.sortedIndex(targets, x);
                    var isBarline = element.renderClass === document_1.Type.Barline;
                    if (targets[index_1] === x) {
                        isBarlineByPart[partKey][index_1] =
                            isBarlineByPart[partKey][index_1] || isBarline;
                    }
                    else {
                        targets.splice(index_1, 0, element.x + measureStartX);
                        isBarlineByPart[partKey].splice(index_1, 0, isBarline);
                    }
                }
            });
        });
        measureStartX += measure.width;
    });
    measureStartX = 0;
    lodash_1.forEach(measures, function (measure) {
        lodash_1.forEach(measure.elements, function (elements) {
            lodash_1.forEach(elements, function (element, index) {
                if (!element.model) {
                    return;
                }
                var partKey = element.part + "_" + element.model.staffIdx;
                if (element.renderClass === document_1.Type.Attributes && element.model) {
                    // Calculate the width for the staff lines in the previous attributes element.
                    {
                        var targets = targetsByPart[partKey] || [];
                        var targetIdx = lodash_1.sortedIndex(targets, element.x + measureStartX) - 1;
                        var targetIsBarline = isBarlineByPart[partKey][targetIdx];
                        if (!targetIsBarline) {
                            targetIdx++;
                        }
                        if (attributesByPart[partKey]) {
                            var target = targets[targetIdx];
                            attributesByPart[partKey].staffWidth = target -
                                originXByPart[partKey];
                        }
                    }
                    // Capture the new attributes element.
                    var shouldSplit = false;
                    if (!attributesByPart[partKey]) {
                        shouldSplit = true;
                    }
                    else {
                        var oldAttributes = attributesByPart[partKey].model;
                        var newAttributes_1 = element.model;
                        shouldSplit = lodash_1.some(oldAttributes.staffDetails, function (details, detailIndex) {
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
                        var targetIdx = lodash_1.sortedIndex(targets, element.x + measureStartX) - 1;
                        var attrTarget = targets[targetIdx] || 0;
                        var target = targets[targetIdx] || 0;
                        originXByPart[partKey] = target;
                        element.staffLinesOffsetX = element.x + measureStartX -
                            target - (target - attrTarget);
                    }
                }
            });
        });
        measureStartX += measure.width;
    });
    lodash_1.forEach(attributesByPart, function (attributes, partKey) {
        attributes.staffWidth = measureStartX - originXByPart[partKey];
    });
    return measures;
}
exports.default = attributes;
//# sourceMappingURL=implAttributes_attributesPostprocessor.js.map