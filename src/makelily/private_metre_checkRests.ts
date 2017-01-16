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

/**
 * r_ = a single rest can fit here
 * *  = any combination of rests can go here
 */
type RestRules = ReadonlyArray<string>;

export interface IOptions {
    dotsAllowed: boolean;
}

let _stretchRestRuleMemo: {[key: string]: string} = {};
function _stretchRestRule(rule: string, quantization: number) {
    const key = rule + String(quantization);
    if (!_stretchRestRuleMemo[key]) {
        const newRule: string[] = [];
        for (let i = 0; i < rule.length; ++i) {
            newRule.push(rule[i]);
            for (let j = 1; j < quantization; ++j) {
                newRule.push(rule[i] === "r" ? "_" : rule[i]);
            }
        }
        _stretchRestRuleMemo[key] = newRule.join("");
    }
    return _stretchRestRuleMemo[key];
}

function _getValidSubBeatLengths(quantumPerBeats: number, beatsPerMeasure: number, dotsAllowed: boolean) {
    let validLengths: number[] = [];
    for (let i = 5; i > 0; --i) {
        let pow2 = Math.pow(2, i);
        if (quantumPerBeats % pow2 === 0) {
            validLengths.push(quantumPerBeats / pow2);
        }
        let toAdd = quantumPerBeats / pow2;
        let dottedLength = quantumPerBeats / pow2;
        let dots = 0;
        if (dotsAllowed) {
            while ((toAdd % 2 === 0) && dots + 1 <= 3) {
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

class RestSolver {
    private _ruleBeats: number;
    private _ruleBeatType: number;
    private _restRules: RestRules;

    constructor(
            ruleBeats: number,
            ruleBeatType: number,
            restRules: RestRules) {
        this._ruleBeats = ruleBeats;
        this._ruleBeatType = ruleBeatType;
        this._restRules = restRules;
    }

    isSimple() {
        return this._ruleBeats === 1 ||
            this._ruleBeats === 2 ||
            this._ruleBeats === 3 ||
            this._ruleBeats === 4;
    }

    static dotRule = /r__(\.|$)/;

    checkRests(divisions: number, song: string, options: IOptions): string {
        const MATCH_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const quantization = divisions * 4 / this._ruleBeatType;
        let myRestRules = this._restRules
            .filter(rule => options.dotsAllowed || (rule.search(RestSolver.dotRule) === -1))
            .map(rule => _stretchRestRule(rule, quantization));
        song = _stretchRestRule(song, 1 / quantization);
        const len = myRestRules[0].length;
        const quantumPerBeats = len / this._ruleBeats;
        const validSubBeatLengths = _getValidSubBeatLengths(quantumPerBeats, this._ruleBeats, options.dotsAllowed);
        const validNonDotSubBeatLengths = _getValidSubBeatLengths(quantumPerBeats, this._ruleBeats, false);
        if (song.length > len) {
            return `split ${len} ${myRestRules[0].length}`;
        } else if (song.length < myRestRules[0].length) {
            return `apply ${len} ${
                song.split("").map(() => ".").join("") +
                Array(myRestRules[0].length - song.length + 1).join("r")
            }`;
        } else if (song.length !== len) {
            return `ERR: ${song.length} !== ${this._ruleBeats}`;
        }

        // Ensure that rests that do not start on beats do not cross beat boundaries.
        for (let i = 0; i < song.length; ++i) {
            if (song[i] === "r" && (i % quantumPerBeats) > 0) {
                let j = i;
                while (song[j + 1] === "_") { ++j; }

                let beats = ((j - i + 1)/quantumPerBeats);
                if (beats >= 1) {
                    let startOfNextBeat = i + 1;
                    while (startOfNextBeat % quantumPerBeats !== 0) { ++startOfNextBeat; }

                    let fillUntil = startOfNextBeat = startOfNextBeat + 1;
                    while (fillUntil % quantumPerBeats !== 0 &&
                            song[fillUntil] &&
                            song[fillUntil] !== ".") { ++fillUntil; }

                    let patch = Array(startOfNextBeat).join(".") +
                        "r" + Array(fillUntil - startOfNextBeat + 1).join("_") +
                        Array(song.length - fillUntil + 1).join(".");
                    return `apply ${len} ${patch}`;
                }
            }
        }

        // Apply rules
        let matches = new Array<string>(song.length + 1).join(" ").split("");
        for (let ruleNum = 0; ruleNum < myRestRules.length; ++ruleNum) {
            const rule = myRestRules[ruleNum];

            for (let i = 0; i < rule.length; ++i) {
                if (rule[i] === "r" && song[i] === "r" && matches[i] === " ") {
                    let ruleMatches = true;
                    let ruleIsApplied = true;
                    ruleMatch: for (let j = i + 1; j < rule.length; ++j) {
                        if (rule[j] === "_" && song[j] === "_") {
                            continue ruleMatch;
                        }
                        if (rule[j] !== "_") {
                            if (song[j] === "_") {
                                // New rule must start here.
                                let k = j;
                                while (song[k + 1] === "_") { ++k; }
                                return `apply ${len} ${
                                    Array(j + 1).join(".") +
                                        "r" +
                                        Array(k - j + 1).join("_") +
                                        Array(song.length - k).join(".")
                                }`;
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
                        } else if (song[j] === ".") {
                            ruleMatches = false;
                            break ruleMatch;
                        } else if (song[j] === "_") {
                            throw new Error("Not reached");
                        }
                    } // end ruleMatch

                    if (ruleMatches && !ruleIsApplied) {
                        return `apply ${len} ${rule}`;
                    }

                    if (ruleMatches) {
                        for (let j = 0; j < rule.length; ++j) {
                            if (rule[j] !== ".") {
                                if (matches[j] !== " ") {
                                    throw new Error("Double match.");
                                }
                                matches[j] = MATCH_CHARS[ruleNum];
                            }
                        }
                    }
                } else if (rule[i] === "*" && song[i] === "r" && matches[i] === " ") { // Match subbeat!
                    if (this.isSimple()) {
                        let bestSubbeatReplacement = "";
                        subbeatOptions: for (let j = 0; j < validSubBeatLengths.length; ++j) {
                            let subbeatLength = validSubBeatLengths[j];
                            let k = i;

                            while (rule[k + 1] === "*" && matches[k + 1] === " " && song[k + 1] !== ".") { ++k; }
                            let matchedLength = k - i + 1;
                            if (matchedLength >= subbeatLength) {
                                // When it is preferable to show more clearly how the beat is divided,
                                // divide the rest into half-beats.

                                // Improvised extension: we apply this to quarters and eighths of a
                                // beat as well.
                                const isDotted = validNonDotSubBeatLengths.indexOf(subbeatLength) === -1;
                                const atEnd = rule[i + subbeatLength] !== "*";

                                // XXX: make this a lint warning, instead of a requirement.
                                const ruleSize = rule.split("*").length - 1;
                                const ruleStart = rule.indexOf("*");
                                let dividesMiddle = false;
                                for (let divisions = 2; divisions <= 16; divisions *= 2) {
                                    for (let l = 1; l < divisions; ++l) {
                                        const rulePoint = ruleStart + l * ruleSize / divisions;
                                        if (i < rulePoint && (i + subbeatLength) > rulePoint) {
                                            dividesMiddle = true;
                                        }
                                        if (i < rulePoint &&
                                                i > (rulePoint - ruleSize / divisions) &&
                                                (i + subbeatLength) > rulePoint &&
                                                (i + subbeatLength) < rulePoint + ruleSize / divisions) {
                                            continue subbeatOptions;
                                        }
                                    }
                                }

                                // Allow, but do not prefer, dotted rests at the end of a beat.
                                // XXX: we should have a "lint warning" suggesting non-dotted at end.
                                const isOptional = isDotted && (atEnd || dividesMiddle);

                                for (let l = i + 1; l < i + subbeatLength; ++l) {
                                    if (song[l] === "r") {
                                        let pattern = bestSubbeatReplacement || (
                                            Array(i + 1).join(".") + "r" +
                                            Array(i + subbeatLength - i).join("_") +
                                            Array(song.length - (i + subbeatLength) + 1).join(".")
                                        );

                                        if (isOptional) {
                                            bestSubbeatReplacement = pattern;
                                            continue subbeatOptions;
                                        }

                                        return `apply ${len} ${pattern}`;
                                    }
                                }

                                // Make sure the subbeat actually ends where it is supposed to.
                                if (song[i + subbeatLength] === "_") {
                                    let l = i + subbeatLength;
                                    while (song[l] === "_") { ++l; }

                                    return `apply ${len} ${
                                        Array((i + subbeatLength) + 1).join(".") + "r" +
                                        Array(l - (i + subbeatLength)).join("_") +
                                        Array(song.length - l + 1).join(".")
                                    }`;
                                }

                                // Subbeat match.
                                for (let l = i; l < i + subbeatLength; ++l) {
                                    matches[l] = MATCH_CHARS[ruleNum];
                                }

                                break subbeatOptions;
                            }
                        }
                    } else {
                        subbeatOptions: for (let j = 0; j < validSubBeatLengths.length; ++j) {
                            let subbeatLength = validSubBeatLengths[j];
                            let k = i;
                            while (rule[k + 1] === "*" && matches[k + 1] === " " && song[k + 1] !== ".") { ++k; }
                            let matchedLength = k - i + 1;
                            if (matchedLength >= subbeatLength) {

                                // Make sure the subbeat actually ends where it is supposed to.
                                if (song[i + subbeatLength] === "_") {
                                    let l = i + subbeatLength;
                                    while (song[l] === "_") { ++l; }
                                    return `apply ${len} ${
                                        Array((i + subbeatLength) + 1).join(".") + "r" +
                                        Array(l - (i + subbeatLength)).join("_") +
                                        Array(song.length - l + 1).join(".")
                                    }`;
                                }

                                // Subbeat match.
                                for (let l = i; l < i + subbeatLength; ++l) {
                                    matches[l] = MATCH_CHARS[ruleNum];
                                }

                                break subbeatOptions;
                            }
                        }
                    } // end subbeatOptions
                }
            }
        };

        // Continuations that aren't matched should become rests
        for (let i = 0; i < song.length; ++i) {
            if (matches[i] === " " && song[i] !== ".") {
                let j = i;
                while (song[j + 1] === "_") { ++j; }
                return `apply ${len} ${
                    Array(i + 1).join(".") + "r" + 
                    Array(j - i + 1).join("_") +
                    Array(song.length - j).join(".")
                }`;
            }
        }

        return "GOOD";
    }
}

const REST_RULES_1: RestRules = Object.freeze([
    "r",
    "*",
]);

const REST_RULES_2: RestRules = Object.freeze([
    "r_",
    "r.",
    ".r",
    "*.",
    ".*",
]);

const REST_RULES_3: RestRules = Object.freeze([
    "r__",
    "r..",
    ".r.",
    "..r",
    "*..",
    ".*.",
    "..*",
]);

const REST_RULES_4: RestRules = Object.freeze([
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

const REST_RULES_6: RestRules = Object.freeze([
    "r_____",
    "r__...",   // if dots allowed
    "...r__",   // if dots allowed
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

const REST_RULES_9: RestRules = Object.freeze([
    "r________",
    "r__......",    // if dots allowed (may be filtered out)
    "...r__...",    // if dots allowed (may be filtered out)
    "......r__",    // if dots allowed (may be filtered out)
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

const REST_RULES_12: RestRules = Object.freeze([
    "r___________",
    "r_____......", // if dots allowed (may be filtered out)
    "......r_____", // if dots allowed (may be filtered out)
    "r__.........", // if dots allowed (may be filtered out)
    "...r__......", // if dots allowed (may be filtered out)
    "......r__...", // if dots allowed (may be filtered out)
    ".........r__", // if dots allowed (may be filtered out)
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

const TIME_SIGNATURES: {readonly [name: string]: RestSolver} = Object.freeze({
    "4/8": new RestSolver(
        4, 8,
        REST_RULES_4,
    ),
    "2/4": new RestSolver(
        2, 4,
        REST_RULES_2,
    ),
    "1/2": new RestSolver(
        1, 2,
        REST_RULES_1,
    ),

    "4/4": new RestSolver(
        4, 4,
        REST_RULES_4,
    ),
    "2/2": new RestSolver(
        2, 2,
        REST_RULES_2,
    ),
    "1/1": new RestSolver(
        1, 1,
        REST_RULES_1,
    ),

    "6/16": new RestSolver(
        6, 16,
        REST_RULES_6,
    ),
    "6/8": new RestSolver(
        6, 8,
        REST_RULES_6,
    ),
    "6/4": new RestSolver(
        6, 4,
        REST_RULES_6,
    ),
    "12/8": new RestSolver(
        12, 8,
        REST_RULES_12,
    ),

    "3/4": new RestSolver(
        3, 4,
        REST_RULES_3,
    ),
    "3/8": new RestSolver(
        3, 8,
        REST_RULES_3,
    ),
    "9/8": new RestSolver(
        9, 8,
        REST_RULES_9,
    ),
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
export default function checkRests(
        timeSignatureName: string,
        barLength: number,
        song: string,
        options: IOptions): string {
    const ts = TIME_SIGNATURES[timeSignatureName];
    if (!ts) {
        return `ERR: No such time signature ${timeSignatureName}.`;
    }
    const numerator = parseInt(timeSignatureName.split("/")[0], 10);
    if (isNaN(numerator)) {
        return `ERR: No such time signature ${timeSignatureName}`;
    }
    const denominator = parseInt(timeSignatureName.split("/")[1], 10);
    if (isNaN(denominator)) {
        return `ERR: No such time signature ${timeSignatureName}`;
    }
    const divisions = barLength / numerator / 4 * denominator;
    if (divisions !== Math.round(divisions)) {
        return `ERR: Invalid bar length ${barLength}. Divisions per quarter note must be an integer.`;
    }
    return ts.checkRests(divisions, song, options);
}
