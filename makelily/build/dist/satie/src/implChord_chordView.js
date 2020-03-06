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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as React from "react";
import { StemType } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { map, some, chain, maxBy } from "lodash";
import { bboxes, bravura, getRight } from "./private_smufl";
import BeamView from "./implChord_beamView";
import FlagView from "./implChord_flagView";
import LedgerLineView from "./implChord_ledgerLineView";
import { DEFAULT_LYRIC_SIZE, DEFAULT_FONT } from "./implChord_lyrics";
import NoteView from "./implChord_noteView";
import NotationView from "./implChord_notationView";
import RestView from "./implChord_restView";
import StemView from "./implChord_stemView";
import UnbeamedTupletView from "./implChord_unbeamedTupletView";
var stemThickness = bravura.engravingDefaults.stemThickness * 10;
/**
 * Renders notes and their notations.
 */
var ChordView = /** @class */ (function (_super) {
    __extends(ChordView, _super);
    function ChordView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ChordView.prototype.render = function () {
        var _this = this;
        var layout = this.props.layout;
        var spec = layout.model;
        var maxNotehead = maxBy(spec.noteheadGlyph, function (glyph) { return getRight(glyph); });
        var anyVisible = some(spec, function (note) { return note.printObject !== false; });
        if (!anyVisible) {
            return null;
        }
        var lyKey = 0;
        var lyrics = chain(spec)
            .map(function (n) { return n.lyrics; })
            .filter(function (l) { return !!l; })
            .flattenDeep()
            .filter(function (l) { return !!l; })
            .map(function (l) {
            var text = [];
            for (var i = 0; i < l.lyricParts.length; ++i) {
                switch (l.lyricParts[i]._class) {
                    case "Syllabic":
                        break;
                    case "Text":
                        {
                            var textPt = l.lyricParts[i];
                            var width = bboxes[maxNotehead][0] * 10;
                            text.push(React.createElement("text", { fontFamily: textPt.fontFamily || DEFAULT_FONT, fontSize: textPt.fontSize || DEFAULT_LYRIC_SIZE, key: ++lyKey, textAnchor: "middle", x: _this.props.layout.x + width / 2, y: _this.context.originY + 60 }, textPt.data));
                        }
                        break;
                    case "Extend":
                        // TODO
                        break;
                    case "Elision":
                        // TODO
                        break;
                    default:
                        throw new Error("Unknown class " + l.lyricParts[i]._class);
                }
            }
            return text;
        })
            .flatten()
            .value();
        if (spec[0].rest) {
            return (React.createElement(RestView, { multipleRest: spec.satieMultipleRest, notehead: spec.noteheadGlyph[0], spec: spec[0] }));
        }
        var stemX = spec.stemX();
        return (React.createElement("g", null,
            map(spec, function (_noteSpec, idx) {
                if (!spec[idx]) {
                    return null;
                }
                return (React.createElement(NoteView, { key: "n" + idx, noteheadGlyph: spec.noteheadGlyph[idx], spec: spec[idx], defaultX: spec[idx].defaultX }));
            }),
            layout.satieStem && (React.createElement(StemView, { bestHeight: layout.satieStem.stemHeight, tremolo: layout.satieStem.tremolo, key: "s", notehead: maxNotehead, spec: {
                    color: spec[0].stem.color || "#000000",
                    defaultX: stemX,
                    defaultY: (layout.satieStem.stemStart - 3) * 10,
                    type: layout.satieStem.direction === 1 ? StemType.Up : StemType.Down,
                }, width: stemThickness })),
            map(spec.satieLedger, function (lineNumber) { return (React.createElement(LedgerLineView, { key: "l" + lineNumber, notehead: maxNotehead, spec: {
                    color: "#000000",
                    defaultX: stemX,
                    defaultY: (lineNumber - 3) * 10,
                } })); }),
            layout.satieFlag && layout.satieStem && (React.createElement(FlagView, { key: "f", notehead: maxNotehead, spec: {
                    color: spec[0].stem.color || "$000000",
                    defaultX: stemX,
                    defaultY: (layout.satieStem.stemStart - 3) * 10 +
                        (layout.satieStem.stemHeight - 7) * layout.satieStem.direction,
                    direction: layout.satieStem.direction,
                    flag: layout.satieFlag,
                }, stemHeight: layout.satieStem.stemHeight, stemWidth: stemThickness })),
            this.props.layout.satieBeam && (React.createElement(BeamView, { key: "b", layout: this.props.layout.satieBeam, stemWidth: stemThickness, stroke: "black" })),
            spec.satieUnbeamedTuplet && (React.createElement(UnbeamedTupletView, { key: "ut", layout: spec.satieUnbeamedTuplet, stemWidth: stemThickness, stroke: "black" })),
            map(spec, function (note, idx) {
                return map(note.notations, function (notation, jdx) { return (React.createElement(NotationView, { key: "N" + idx + "_" + jdx, layout: _this.props.layout, defaultY: note.defaultY, spec: notation })); });
            }),
            lyrics));
    };
    ChordView.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return ChordView;
}(Component));
export default ChordView;
//# sourceMappingURL=implChord_chordView.js.map