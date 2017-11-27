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
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var private_smufl_1 = require("./private_smufl");
var PADDING = 1.5;
function articulationDirectionMatters(model) {
    return !model.breathMark && !model.caesura;
}
exports.articulationDirectionMatters = articulationDirectionMatters;
function articulationGlyph(model, direction) {
    if (model.accent) {
        return "articAccent" + direction;
    }
    if (model.breathMark) {
        return "breathMarkComma";
    }
    if (model.caesura) {
        return "caesura";
    }
    if (model.detachedLegato) {
        return "articTenutoStaccato" + direction;
    }
    if (model.doit) {
        return null;
    }
    if (model.falloff) {
        return null;
    }
    if (model.plop) {
        return null;
    }
    if (model.scoop) {
        return null;
    }
    if (model.spiccato) {
        return "articStaccatissimoWedge" + direction;
    }
    if (model.staccatissimo) {
        return "articStaccatissimo" + direction;
    }
    if (model.staccato) {
        return "articStaccato" + direction;
    }
    if (model.stress) {
        return "articStress" + direction;
    }
    if (model.strongAccent) {
        return "articMarcato" + direction;
    }
    if (model.tenuto) {
        return "articTenuto" + direction;
    }
    if (model.unstress) {
        return "articUnstress" + direction;
    }
    console.warn("Unknown articulation...");
    return null;
}
exports.articulationGlyph = articulationGlyph;
function technicalGlyph(model, direction) {
    if (model.arrow) {
        return "arrowBlackDownRight";
    }
    if (model.bend) {
        return "brassBend";
    }
    if (model.doubleTongue) {
        return "doubleTongue" + direction;
    }
    if (model.downBow) {
        if (direction === "Below") {
            return "stringsDownBowTurned";
        }
        else {
            return "stringsDownBow";
        }
    }
    if (model.fingering) {
        return "fingering" + model.fingering.finger;
    }
    if (model.fingernails) {
        return "pluckedWithFingernails";
    }
    if (model.fret) {
        console.warn("fret not implemented");
        return null;
    }
    if (model.hammerOn) {
        console.warn("hammerOn not implemented");
        return null;
    }
    if (model.handbell) {
        console.warn("handbell not implemented");
        return null;
    }
    if (model.harmonic) {
        return "stringsHarmonic";
    }
    if (model.heel) {
        return "stringsDownBow";
    }
    if (model.hole) {
        return "windClosedHole";
    }
    if (model.openString) {
        return "stringsHarmonic";
    }
    if (model.pluck) {
        console.warn("pluck not implemented");
        return null;
    }
    if (model.pullOff) {
        console.warn("pullOff not implemented");
        return null;
    }
    if (model.snapPizzicato) {
        return "pluckedSnapPizzicato" + direction;
    }
    if (model.stopped) {
        return "pluckedLeftHandPizzicato";
    }
    if (model.string) {
        console.warn("string not implemented");
        return null;
    }
    // TODO: stringMute is a direction in musicxml!
    if (model.tap) {
        console.warn("tap not implemented");
        return null;
    }
    if (model.thumbPosition) {
        return "stringsThumbPosition";
    }
    if (model.toe) {
        return "keyboardPedalToe1";
    }
    if (model.tripleTongue) {
        return "tripleTongue" + direction;
    }
    if (model.upBow) {
        if (direction === "Below") {
            return "stringsUpBowTurned";
        }
        else {
            return "stringsUpBow";
        }
    }
    console.warn("Unknown technical", model);
    return null;
}
exports.technicalGlyph = technicalGlyph;
function getBoundingRects(model, note, chord) {
    var boxes = [];
    var origModel = model;
    model = Object.create(model);
    Object.keys(origModel).forEach(function (m) {
        model[m] = typeof model[m] === "object" ? Object.create(model[m]) : model;
    });
    lodash_1.forEach(model.accidentalMarks, function (accidentalMark) {
        // TODO
    });
    lodash_1.forEach(model.arpeggiates, function (arpeggiate) {
        // TODO
    });
    lodash_1.forEach(model.articulations, function (articulation, idx) {
        articulation = model.articulations[idx] = Object.create(articulation);
        lodash_1.forEach(["accent", "breathMark", "caesura", "detachedLegato", "doit", "falloff", "plop",
            "scoop", "spiccato", "staccatissimo", "staccato", "stress", "strongAccent",
            "tenuto", "unstress"], function (type) {
            // TODO: Could this be done any less efficiently?
            if (model.articulations[idx][type]) {
                var thisArticulation = Object.create(model.articulations[idx][type]);
                var placement = thisArticulation.placement;
                var isBelow = placement === musicxml_interfaces_1.AboveBelow.Below;
                var glyph = articulationGlyph(articulation, isBelow ? "Below" : "Above");
                if (!glyph) {
                    console.warn(Object.keys(articulation)[0], "not implented in chord/notation.ts");
                    return;
                }
                var y = void 0;
                var noteheadGlyph = chord.model.noteheadGlyph[0];
                var center = (private_smufl_1.getLeft(noteheadGlyph) + private_smufl_1.getRight(noteheadGlyph)) / 2 -
                    (private_smufl_1.getLeft(glyph) + private_smufl_1.getRight(glyph)) / 2 - 0.5;
                if (!chord.satieStem || (note.stem.type === musicxml_interfaces_1.StemType.Up) === isBelow) {
                    y = note.defaultY + (isBelow ? -9 : 9);
                    if (-note.defaultY % 10 === 0) {
                        y += isBelow ? -5 : 5;
                    }
                }
                else {
                    y = note.defaultY + chord.satieStem.stemHeight + (isBelow ? -12 : 12);
                    if (-note.defaultY % 10 === 0) {
                        y += isBelow ? -5 : 5;
                    }
                }
                model.articulations[idx][type] = push(glyph, thisArticulation, center, y);
            }
        });
    });
    lodash_1.forEach(model.dynamics, function (dynamic) {
        // TODO
    });
    lodash_1.forEach(model.fermatas, function (fermata, idx) {
        fermata = model.fermatas[idx] = Object.create(fermata);
        if (fermata.type === musicxml_interfaces_1.UprightInverted.Inverted) {
            fermata.placement = musicxml_interfaces_1.AboveBelow.Below;
        }
        else {
            fermata.placement = musicxml_interfaces_1.AboveBelow.Above;
        }
        model.fermatas[idx] = push("fermataAbove", fermata);
    });
    lodash_1.forEach(model.glissandos, function (glissando) {
        // TODO
    });
    lodash_1.forEach(model.nonArpeggiates, function (nonArpeggiate) {
        // TODO
    });
    lodash_1.forEach(model.ornaments, function (ornament, idx) {
        ornament = model.ornaments[idx] = Object.create(ornament);
        if (ornament.tremolo) {
            chord.satieStem.tremolo = ornament.tremolo;
        }
        // TODO
    });
    lodash_1.forEach(model.slides, function (slide) {
        // TODO
    });
    lodash_1.forEach(model.slurs, function (slur) {
        // TODO
    });
    lodash_1.forEach(model.technicals, function (technical, idx) {
        technical = model.technicals[idx] = Object.create(technical);
        lodash_1.forEach([
            "arrow", "bend", "doubleTongue", "downBow", "fingering", "fingernails",
            "fret", "hammerOn", "handbell", "harmonic", "heel", "hole", "openString",
            "pluck", "pullOff", "snapPizzicato", "stopped", "string", "tap",
            "thumbPosition", "toe", "tripleTongue", "upBow",
        ], function (type) {
            // TODO: Could this be done any less efficiently?
            if (model.technicals[idx][type]) {
                var thisTechnical = Object.create(model.technicals[idx][type]);
                var placement = thisTechnical.placement;
                var isBelow = placement === musicxml_interfaces_1.AboveBelow.Below;
                var glyph = technicalGlyph(technical, isBelow ? "Below" : "Above");
                if (!glyph) {
                    console.warn(Object.keys(technical)[0], "not implented in chord/notation.ts");
                    return;
                }
                var y = void 0;
                var noteheadGlyph = chord.model.noteheadGlyph[0];
                var center = (private_smufl_1.getLeft(noteheadGlyph) + private_smufl_1.getRight(noteheadGlyph)) / 2 -
                    (private_smufl_1.getLeft(glyph) + private_smufl_1.getRight(glyph)) / 2 - 0.5;
                if (!chord.satieStem || (note.stem.type === musicxml_interfaces_1.StemType.Up) === isBelow) {
                    y = note.defaultY + (isBelow ? -9 : 9);
                    if (-note.defaultY % 10 === 0) {
                        y += isBelow ? -5 : 5;
                    }
                }
                else {
                    y = note.defaultY + chord.satieStem.stemHeight + (isBelow ? -12 : 12);
                    if (-note.defaultY % 10 === 0) {
                        y += isBelow ? -5 : 5;
                    }
                }
                model.technicals[idx][type] = push(glyph, thisTechnical, center, y);
            }
        });
    });
    lodash_1.forEach(model.tieds, function (tied) {
        // TODO
    });
    lodash_1.forEach(model.tuplets, function (tuplet) {
        // TODO
    });
    function push(glyphName, notation, defaultX, defaultY) {
        if (defaultX === void 0) { defaultX = 0; }
        if (defaultY === void 0) { defaultY = NaN; }
        console.log("PUSH", glyphName);
        var box = private_smufl_1.bboxes[glyphName];
        if (!box) {
            console.warn("Unknown glyph", glyphName);
            return null;
        }
        if (isNaN(defaultY)) {
            if (notation.placement === musicxml_interfaces_1.AboveBelow.Below) {
                defaultY = -30 + box[3] * 10 * PADDING;
            }
            else if (notation.placement === musicxml_interfaces_1.AboveBelow.Above) {
                defaultY = 60 + box[3] * 10 * PADDING;
            }
            else {
                console.warn("TODO: Set default above/below");
                // above: "fermata", "breathMark", "caesura", "strings"
                // below: "dynamic"
                defaultY = 0;
            }
        }
        var printStyle = Object.create(notation);
        var boundingRect = printStyle;
        boundingRect.top = box[3] * 10;
        boundingRect.bottom = box[1] * 10;
        boundingRect.left = box[2] * 10;
        boundingRect.right = box[0] * 10;
        boundingRect.defaultX = defaultX;
        boundingRect.defaultY = defaultY;
        boxes.push(printStyle);
        return printStyle;
    }
    return {
        bb: boxes,
        n: model,
    };
}
exports.getBoundingRects = getBoundingRects;
//# sourceMappingURL=implChord_notation.js.map