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

import MusicXML = require("musicxml-interfaces");
import * as React from "react"; // TS 1.5 workaround
import {createFactory as $, PropTypes} from "react";

import Glyph from "./primitives/glyph";

const CUSTOM_NOTEHEADS: {[key: number]: string[]} = {
    [MusicXML.NoteheadType.ArrowDown]: ["noteheadLargeArrowDownBlack", "noteheadLargeArrowDownHalf",
        "noteheadLargeArrowDownWhole", "noteheadLargeArrowDownDoubleWhole"],
    [MusicXML.NoteheadType.ArrowUp]: ["noteheadLargeArrowUpBlack", "noteheadLargeArrowUpHalf",
        "noteheadLargeArrowUpWhole", "noteheadLargeArrowUpDoubleWhole"],
    [MusicXML.NoteheadType.BackSlashed]: ["noteheadSlashedBlack2", "noteheadSlashedHalf2",
        "noteheadSlashedWhole2", "noteheadSlashedDoubleWhole2"],
    [MusicXML.NoteheadType.CircleDot]: ["noteheadRoundWhiteWithDot", "noteheadCircledHalf",
        "noteheadCircledWhole", "noteheadCircledDoubleWhole"],
    [MusicXML.NoteheadType.CircleX]: ["noteheadCircledXLarge", "noteheadCircledXLarge",
        "noteheadCircledXLarge", "noteheadCircledXLarge"],
    [MusicXML.NoteheadType.Cluster]: ["noteheadNull", "noteheadNull",
        "noteheadNull", "noteheadNull"], // TODO
    [MusicXML.NoteheadType.Cross]: ["noteheadPlusBlack", "noteheadPlusHalf",
        "noteheadPlusWhole", "noteheadPlusDoubleWhole"],
    [MusicXML.NoteheadType.InvertedTriangle]: ["noteheadTriangleDownBlack",
        "noteheadTriangleDownHalf", "noteheadTriangleDownWhole", "noteheadTriangleDownDoubleWhole"],
    [MusicXML.NoteheadType.LeftTriangle]: ["noteheadTriangleRightBlack", "noteheadTriangleRightHalf",
        "noteheadTriangleRightWhole", "noteheadTriangleRightDoubleWhole"],
        // Finale has a different idea about what left means
    [MusicXML.NoteheadType.None]: ["noteheadNull", "noteheadNull", "noteheadNull", "noteheadNull"],
    [MusicXML.NoteheadType.Slash]: ["noteheadSlashHorizontalEnds", "noteheadSlashWhiteHalf",
        "noteheadSlashWhiteWhole", "noteheadDoubleWhole"],
    [MusicXML.NoteheadType.Slashed]: ["noteheadSlashedBlack1", "noteheadSlashedHalf1",
        "noteheadSlashedWhole1", "noteheadSlashedDoubleWhole1"],

    [MusicXML.NoteheadType.X]: ["noteheadXBlack", "noteheadXHalf",
        "noteheadXWhole", "noteheadXDoubleWhole"],

    [MusicXML.NoteheadType.Do]: ["noteheadTriangleUpBlack", "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole", "noteheadTriangleUpDoubleWhole"],
    [MusicXML.NoteheadType.Triangle]: ["noteheadTriangleUpBlack", "noteheadTriangleUpHalf",
        "noteheadTriangleUpWhole", "noteheadTriangleUpDoubleWhole"],

    [MusicXML.NoteheadType.Re]: ["noteheadMoonBlack", "noteheadMoonWhite",
        "noteheadMoonWhite", "noteheadMoonWhite"],

    [MusicXML.NoteheadType.Mi]: ["noteheadDiamondBlack", "noteheadDiamondHalf",
        "noteheadDiamondWhole", "noteheadDiamondDoubleWhole"],
    [MusicXML.NoteheadType.Diamond]: ["noteheadDiamondBlack", "noteheadDiamondHalf",
        "noteheadDiamondWhole", "noteheadDiamondDoubleWhole"],

    [MusicXML.NoteheadType.Fa]: ["noteheadTriangleUpRightBlack", "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite", "noteheadTriangleUpRightWhite"],
    [MusicXML.NoteheadType.FaUp]: ["noteheadTriangleUpRightBlack", "noteheadTriangleUpRightWhite",
        "noteheadTriangleUpRightWhite", "noteheadTriangleUpRightWhite"],

    [MusicXML.NoteheadType.So]: ["noteheadBlack", "noteheadHalf",
        "noteheadWhole", "noteheadDoubleWhole"],

    [MusicXML.NoteheadType.La]: ["noteheadSquareBlack", "noteheadSquareWhite",
        "noteheadSquareWhite", "noteheadSquareWhite"],
    [MusicXML.NoteheadType.Square]: ["noteheadSquareBlack", "noteheadSquareWhite",
        "noteheadSquareWhite", "noteheadSquareWhite"],
    [MusicXML.NoteheadType.Rectangle]: ["noteheadSquareBlack", "noteheadSquareWhite",
        "noteheadSquareWhite", "noteheadSquareWhite"],

    [MusicXML.NoteheadType.Ti]: ["noteheadTriangleRoundDownBlack", "noteheadTriangleRoundDownWhite",
        "noteheadTriangleRoundDownWhite", "noteheadTriangleRoundDownWhite"]
};

/**
 * Renders a notehead.
 */
class Notehead extends React.Component<Notehead.IProps, void> {
    render() {
        let spec = this.props.spec;
        let pos = <MusicXML.Position> spec;
        let head = <MusicXML.Notehead> spec;

        return $(Glyph)({
            fill: head.color,
            glyphName: this.getNoteheadGlyph(),
            // scale: this.props.grace ? 0.6 : 1.0,
            x: this.context.originX + pos.defaultX + (pos.relativeX || 0),
            y: this.context.originY - pos.defaultY - (pos.relativeY || 0),
        });
    }
    getNoteheadGlyph() {
        let spec = this.props.spec;
        let head = <MusicXML.Notehead> spec;

        if (head.type === MusicXML.NoteheadType.Normal) {
            return this.props.notehead;
        } else {
            let noteheads = CUSTOM_NOTEHEADS[head.type];
            if (noteheads) {
                if (noteheads[0] && this.props.notehead === "noteheadBlack") {
                    return noteheads[0];
                } else if (noteheads[1] && this.props.notehead === "noteheadHalf") {
                    return noteheads[1];
                } else if (noteheads[2] && this.props.notehead === "noteheadWhole") {
                    return noteheads[2];
                } else if (noteheads[3] && this.props.notehead === "noteheadDoubleWhole") {
                    return noteheads[3];
                }
            }
        }
        console.warn(`The custom notehead with ID ${head.type} cannot replace ` +
            `${this.props.notehead}, probably because it's not implemented.`);
        return this.props.notehead;
    }
}

module Notehead {
    export interface IProps {
        spec: MusicXML.Notehead | MusicXML.Position;
        notehead: string;
    }
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default Notehead;
