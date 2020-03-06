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
var _stretchRestRuleMemo = {};
function _stretchRestRule(rule, quantization) {
    var key = rule + String(quantization);
    if (!_stretchRestRuleMemo[key]) {
        var newRule = [];
        for (var i = 0; i < rule.length; ++i) {
            newRule.push(rule[i]);
            for (var j = 1; j < quantization; ++j) {
                newRule.push(rule[i] === "r" ? "_" : rule[i]);
            }
        }
        _stretchRestRuleMemo[key] = newRule.join("");
    }
    return _stretchRestRuleMemo[key];
}
function _getValidSubBeatLengths(quantumPerBeats, beatsPerMeasure, dotsAllowed) {
    var validLengths = [];
    for (var i = 5; i > 0; --i) {
        var pow2 = Math.pow(2, i);
        if (quantumPerBeats % pow2 === 0) {
            validLengths.push(quantumPerBeats / pow2);
        }
        var toAdd = quantumPerBeats / pow2;
        var dottedLength = quantumPerBeats / pow2;
        var dots = 0;
        if (dotsAllowed) {
            while (toAdd % 2 === 0 && dots + 1 <= 3) {
                toAdd /= 2;
                dottedLength += toAdd;
                ++dots;
                validLengths.push(dottedLength);
            }
        }
    }
    // It's currently from smallest to largest, we want it from largest to smallest.
    validLengths.reverse();
    return validLengths;
}
var RestSolver = /** @class */ (function () {
    function RestSolver(ruleBeats, ruleBeatType, restRules) {
        this._ruleBeats = ruleBeats;
        this._ruleBeatType = ruleBeatType;
        this._restRules = restRules;
    }
    RestSolver.prototype.isSimple = function () {
        return (this._ruleBeats === 1 ||
            this._ruleBeats === 2 ||
            this._ruleBeats === 3 ||
            this._ruleBeats === 4);
    };
    RestSolver.prototype.checkRests = function (divisions, song, options) {
        var MATCH_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var quantization = (divisions * 4) / this._ruleBeatType;
        var myRestRules = this._restRules
            .filter(function (rule) { return options.dotsAllowed || rule.search(RestSolver.dotRule) === -1; })
            .map(function (rule) { return _stretchRestRule(rule, quantization); });
        song = _stretchRestRule(song, 1 / quantization);
        var len = myRestRules[0].length;
        var quantumPerBeats = len / this._ruleBeats;
        var validSubBeatLengths = _getValidSubBeatLengths(quantumPerBeats, this._ruleBeats, options.dotsAllowed);
        var validNonDotSubBeatLengths = _getValidSubBeatLengths(quantumPerBeats, this._ruleBeats, false);
        if (song.length > len) {
            return "split " + len + " " + myRestRules[0].length;
        }
        else if (song.length < myRestRules[0].length) {
            return "apply " + len + " " + (song
                .split("")
                .map(function () { return "."; })
                .join("") + Array(myRestRules[0].length - song.length + 1).join("r"));
        }
        else if (song.length !== len) {
            return "ERR: " + song.length + " !== " + this._ruleBeats;
        }
        // Ensure that rests that do not start on beats do not cross beat boundaries.
        for (var i = 0; i < song.length; ++i) {
            if (song[i] === "r" && i % quantumPerBeats > 0) {
                var j = i;
                while (song[j + 1] === "_") {
                    ++j;
                }
                var beats = (j - i + 1) / quantumPerBeats;
                if (beats >= 1) {
                    var startOfNextBeat = i + 1;
                    while (startOfNextBeat % quantumPerBeats !== 0) {
                        ++startOfNextBeat;
                    }
                    var fillUntil = (startOfNextBeat = startOfNextBeat + 1);
                    while (fillUntil % quantumPerBeats !== 0 &&
                        song[fillUntil] &&
                        song[fillUntil] !== ".") {
                        ++fillUntil;
                    }
                    var patch = Array(startOfNextBeat).join(".") +
                        "r" +
                        Array(fillUntil - startOfNextBeat + 1).join("_") +
                        Array(song.length - fillUntil + 1).join(".");
                    return "apply " + len + " " + patch;
                }
            }
        }
        // Apply rules
        var matches = new Array(song.length + 1).join(" ").split("");
        for (var ruleNum = 0; ruleNum < myRestRules.length; ++ruleNum) {
            var rule = myRestRules[ruleNum];
            for (var i = 0; i < rule.length; ++i) {
                if (rule[i] === "r" && song[i] === "r" && matches[i] === " ") {
                    var ruleMatches = true;
                    var ruleIsApplied = true;
                    ruleMatch: for (var j = i + 1; j < rule.length; ++j) {
                        if (rule[j] === "_" && song[j] === "_") {
                            continue ruleMatch;
                        }
                        if (rule[j] !== "_") {
                            if (song[j] === "_") {
                                // New rule must start here.
                                var k = j;
                                while (song[k + 1] === "_") {
                                    ++k;
                                }
                                return "apply " + len + " " + (Array(j + 1).join(".") +
                                    "r" +
                                    Array(k - j + 1).join("_") +
                                    Array(song.length - k).join("."));
                            }
                            break ruleMatch;
                        }
                        if (matches[j] !== " ") {
                            ruleMatches = false;
                            ruleIsApplied = false;
                            break ruleMatch;
                        }
                        if (song[j] === "r") {
                            ruleIsApplied = false;
                        }
                        else if (song[j] === ".") {
                            ruleMatches = false;
                            break ruleMatch;
                        }
                        else if (song[j] === "_") {
                            throw new Error("Not reached");
                        }
                    } // end ruleMatch
                    if (ruleMatches && !ruleIsApplied) {
                        return "apply " + len + " " + rule;
                    }
                    if (ruleMatches) {
                        for (var j = 0; j < rule.length; ++j) {
                            if (rule[j] !== ".") {
                                if (matches[j] !== " ") {
                                    throw new Error("Double match.");
                                }
                                matches[j] = MATCH_CHARS[ruleNum];
                            }
                        }
                    }
                }
                else if (rule[i] === "*" && song[i] === "r" && matches[i] === " ") {
                    // Match subbeat!
                    if (this.isSimple()) {
                        var bestSubbeatReplacement = "";
                        subbeatOptions: for (var j = 0; j < validSubBeatLengths.length; ++j) {
                            var subbeatLength = validSubBeatLengths[j];
                            var k = i;
                            while (rule[k + 1] === "*" &&
                                matches[k + 1] === " " &&
                                song[k + 1] !== ".") {
                                ++k;
                            }
                            var matchedLength = k - i + 1;
                            if (matchedLength >= subbeatLength) {
                                // When it is preferable to show more clearly how the beat is divided,
                                // divide the rest into half-beats.
                                // Improvised extension: we apply this to quarters and eighths of a
                                // beat as well.
                                var isDotted = validNonDotSubBeatLengths.indexOf(subbeatLength) === -1;
                                var atEnd = rule[i + subbeatLength] !== "*";
                                // XXX: make this a lint warning, instead of a requirement.
                                var ruleSize = rule.split("*").length - 1;
                                var ruleStart = rule.indexOf("*");
                                var dividesMiddle = false;
                                for (var divisions_1 = 2; divisions_1 <= 16; divisions_1 *= 2) {
                                    for (var l = 1; l < divisions_1; ++l) {
                                        var rulePoint = ruleStart + (l * ruleSize) / divisions_1;
                                        if (i < rulePoint && i + subbeatLength > rulePoint) {
                                            dividesMiddle = true;
                                        }
                                        if (i < rulePoint &&
                                            i > rulePoint - ruleSize / divisions_1 &&
                                            i + subbeatLength > rulePoint &&
                                            i + subbeatLength < rulePoint + ruleSize / divisions_1) {
                                            continue subbeatOptions;
                                        }
                                    }
                                }
                                // Allow, but do not prefer, dotted rests at the end of a beat.
                                // XXX: we should have a "lint warning" suggesting non-dotted at end.
                                var isOptional = isDotted && (atEnd || dividesMiddle);
                                for (var l = i + 1; l < i + subbeatLength; ++l) {
                                    if (song[l] === "r") {
                                        var pattern = bestSubbeatReplacement ||
                                            Array(i + 1).join(".") +
                                                "r" +
                                                Array(i + subbeatLength - i).join("_") +
                                                Array(song.length - (i + subbeatLength) + 1).join(".");
                                        if (isOptional) {
                                            bestSubbeatReplacement = pattern;
                                            continue subbeatOptions;
                                        }
                                        return "apply " + len + " " + pattern;
                                    }
                                }
                                // Make sure the subbeat actually ends where it is supposed to.
                                if (song[i + subbeatLength] === "_") {
                                    var l = i + subbeatLength;
                                    while (song[l] === "_") {
                                        ++l;
                                    }
                                    return "apply " + len + " " + (Array(i + subbeatLength + 1).join(".") +
                                        "r" +
                                        Array(l - (i + subbeatLength)).join("_") +
                                        Array(song.length - l + 1).join("."));
                                }
                                // Subbeat match.
                                for (var l = i; l < i + subbeatLength; ++l) {
                                    matches[l] = MATCH_CHARS[ruleNum];
                                }
                                break subbeatOptions;
                            }
                        }
                    }
                    else {
                        subbeatOptions: for (var j = 0; j < validSubBeatLengths.length; ++j) {
                            var subbeatLength = validSubBeatLengths[j];
                            var k = i;
                            while (rule[k + 1] === "*" &&
                                matches[k + 1] === " " &&
                                song[k + 1] !== ".") {
                                ++k;
                            }
                            var matchedLength = k - i + 1;
                            if (matchedLength >= subbeatLength) {
                                // Make sure the subbeat actually ends where it is supposed to.
                                if (song[i + subbeatLength] === "_") {
                                    var l = i + subbeatLength;
                                    while (song[l] === "_") {
                                        ++l;
                                    }
                                    return "apply " + len + " " + (Array(i + subbeatLength + 1).join(".") +
                                        "r" +
                                        Array(l - (i + subbeatLength)).join("_") +
                                        Array(song.length - l + 1).join("."));
                                }
                                // Subbeat match.
                                for (var l = i; l < i + subbeatLength; ++l) {
                                    matches[l] = MATCH_CHARS[ruleNum];
                                }
                                break subbeatOptions;
                            }
                        }
                    } // end subbeatOptions
                }
            }
        }
        // Continuations that aren't matched should become rests
        for (var i = 0; i < song.length; ++i) {
            if (matches[i] === " " && song[i] !== ".") {
                var j = i;
                while (song[j + 1] === "_") {
                    ++j;
                }
                return "apply " + len + " " + (Array(i + 1).join(".") +
                    "r" +
                    Array(j - i + 1).join("_") +
                    Array(song.length - j).join("."));
            }
        }
        return "GOOD";
    };
    RestSolver.dotRule = /r__(\.|$)/;
    return RestSolver;
}());
var REST_RULES_1 = Object.freeze(["r", "*"]);
var REST_RULES_2 = Object.freeze(["r_", "r.", ".r", "*.", ".*"]);
var REST_RULES_3 = Object.freeze([
    "r__",
    "r..",
    ".r.",
    "..r",
    "*..",
    ".*.",
    "..*",
]);
var REST_RULES_4 = Object.freeze([
    "r___",
    "r_..",
    "..r_",
    "r...",
    ".r..",
    "..r.",
    "...r",
    "*...",
    ".*..",
    "..* ",
    "...*",
]);
var REST_RULES_5 = Object.freeze([
    "r__..",
    "r....",
    ".r...",
    "..r..",
    "*....",
    ".*...",
    "..*..",
    "...r_",
    "...r.",
    "....r",
    "...*.",
    "....*",
    "..r__",
    "..r..",
    "...r.",
    "....r",
    "..*..",
    "...*.",
    "....*",
    "r_...",
    "r....",
    ".r...",
    "*....",
    ".*...",
]);
var REST_RULES_6 = Object.freeze([
    "r_____",
    "r__...",
    "...r__",
    "r_....",
    "...r_.",
    "r.....",
    ".r....",
    "..r...",
    "...r..",
    "....r.",
    ".....r",
    "*.....",
    ".*....",
    "..*...",
    "...*..",
    "....*.",
    ".....*",
]);
var REST_RULES_7 = Object.freeze([
    "r___...",
    "r_.....",
    "..r_...",
    "r......",
    ".r.....",
    "..r....",
    "...r...",
    "*......",
    ".*.....",
    "..* ...",
    "...*...",
    "....r__",
    "....r..",
    ".....r.",
    "......r",
    "....*..",
    ".....*.",
    "......*",
    "...r___",
    "...r_..",
    ".....r_",
    "...r...",
    "....r..",
    ".....r.",
    "......r",
    "r__....",
    "r......",
    ".r.....",
    "..r....",
    "*......",
    ".*.....",
    "..*....",
]);
var REST_RULES_9 = Object.freeze([
    "r________",
    "r__......",
    "...r__...",
    "......r__",
    "r_.......",
    "...r_....",
    "......r_.",
    "r........",
    ".r.......",
    "..r......",
    "...r.....",
    "....r....",
    ".....r...",
    "......r..",
    ".......r.",
    "........r",
    "*........",
    ".*.......",
    "..*......",
    "...*.....",
    "....*....",
    ".....*...",
    "......*..",
    ".......*.",
    "........*",
]);
var REST_RULES_12 = Object.freeze([
    "r___________",
    "r_____......",
    "......r_____",
    "r__.........",
    "...r__......",
    "......r__...",
    ".........r__",
    "r_..........",
    "...r_.......",
    "......r_....",
    ".........r_.",
    "r...........",
    ".r..........",
    "..r.........",
    "...r........",
    "....r.......",
    ".....r......",
    "......r.....",
    ".......r....",
    "........r...",
    ".........r..",
    "..........r.",
    "...........r",
    "*...........",
    ".*..........",
    "..*.........",
    "...*........",
    "....*.......",
    ".....*......",
    "......*.....",
    ".......*....",
    "........*...",
    ".........*..",
    "..........*.",
    ".......... *",
]);
var TIME_SIGNATURES = Object.freeze({
    "4/8": new RestSolver(4, 8, REST_RULES_4),
    "2/4": new RestSolver(2, 4, REST_RULES_2),
    "1/2": new RestSolver(1, 2, REST_RULES_1),
    "4/4": new RestSolver(4, 4, REST_RULES_4),
    "2/2": new RestSolver(2, 2, REST_RULES_2),
    "1/1": new RestSolver(1, 1, REST_RULES_1),
    "6/16": new RestSolver(6, 16, REST_RULES_6),
    "6/8": new RestSolver(6, 8, REST_RULES_6),
    "7/8": new RestSolver(7, 8, REST_RULES_7),
    "6/4": new RestSolver(6, 4, REST_RULES_6),
    "7/4": new RestSolver(7, 4, REST_RULES_7),
    "12/8": new RestSolver(12, 8, REST_RULES_12),
    "3/4": new RestSolver(3, 4, REST_RULES_3),
    "3/8": new RestSolver(3, 8, REST_RULES_3),
    "9/8": new RestSolver(9, 8, REST_RULES_9),
    "5/4": new RestSolver(5, 4, REST_RULES_5),
    "5/8": new RestSolver(5, 8, REST_RULES_5),
});
/**
 * $timeSignatureName is a string like "4/4" or "6/8".
 *
 * A $song is a string in a song where $barLength divisions make up a bar.
 * A full $song is made up of $barLength characters.
 * The string contains three kinds of characters.
 *  - 'r': The start of a beat
 *  - '_': The continuation of a beat
 *  - '.': A note
 *
 * See README.md for examples / tests.
 */
export default function checkRests(timeSignatureName, barLength, song, options) {
    var ts = TIME_SIGNATURES[timeSignatureName];
    if (!ts) {
        return "GOOD";
    }
    var numerator = parseInt(timeSignatureName.split("/")[0], 10);
    if (isNaN(numerator)) {
        return "ERR: No such time signature " + timeSignatureName;
    }
    var denominator = parseInt(timeSignatureName.split("/")[1], 10);
    if (isNaN(denominator)) {
        return "ERR: No such time signature " + timeSignatureName;
    }
    var divisions = (barLength / numerator / 4) * denominator;
    if (divisions !== Math.round(divisions)) {
        return "ERR: Invalid bar length " + barLength + ". Divisions per quarter note must be an integer.";
    }
    return ts.checkRests(divisions, song, options);
}
//# sourceMappingURL=private_metre_checkRests.js.map