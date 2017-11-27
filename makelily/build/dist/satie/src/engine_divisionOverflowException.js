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
var private_util_1 = require("./private_util");
var private_util_2 = require("./private_util");
function getSplit(segment, maxDiv, isVoice) {
    var divs = 0;
    var split = 0;
    do {
        divs += (segment[split].divCount || 0);
        if (divs <= maxDiv || !isVoice) {
            ++split;
        }
    } while (divs <= maxDiv && segment[split]);
    return split;
}
var DivisionOverflowException = /** @class */ (function () {
    function DivisionOverflowException(maxDiv, measure, attributes) {
        this.newParts = {};
        this.measure = measure;
        this.message = "DivisionOverflowException: max division should be " +
            (maxDiv + " in measure " + this.measure.idx);
        this.stack = (new Error).stack;
        this.maxDiv = maxDiv;
        this.oldParts = {
            "P1": {
                voices: measure.parts["P1"].voices.map(function (segment) {
                    if (!segment) {
                        return null;
                    }
                    var split = getSplit(segment, maxDiv, true);
                    var ov = segment.slice(0, split);
                    return ov;
                }),
                staves: measure.parts["P1"].staves.map(function (segment) {
                    if (!segment) {
                        return null;
                    }
                    var split = getSplit(segment, maxDiv, false);
                    var os = segment.slice(0, split);
                    return os.filter(function (item) { return item._class !== "Barline"; });
                }),
            },
        };
        this.newParts = {
            "P1": {
                voices: measure.parts["P1"].voices.map(function (segment) {
                    if (!segment) {
                        return null;
                    }
                    var split = getSplit(segment, maxDiv, true);
                    var ov = segment.slice(split);
                    return ov;
                }),
                staves: measure.parts["P1"].staves.map(function (segment) {
                    if (!segment) {
                        return null;
                    }
                    var split = getSplit(segment, maxDiv, false);
                    var os = segment.slice(split);
                    return os;
                }),
            },
        };
        this.attributes = attributes;
    }
    DivisionOverflowException.prototype.getOperations = function () {
        return private_util_2.cloneObject([
            {
                ld: this.measure,
                li: {
                    uuid: this.measure.uuid,
                    parts: this.oldParts,
                },
                p: ["measures", this.measure.idx],
            },
            {
                li: {
                    uuid: Math.floor(Math.random() * private_util_1.MAX_SAFE_INTEGER),
                    parts: this.newParts,
                },
                p: ["measures", this.measure.idx + 1],
            },
        ]);
    };
    return DivisionOverflowException;
}());
exports.default = DivisionOverflowException;
//# sourceMappingURL=engine_divisionOverflowException.js.map