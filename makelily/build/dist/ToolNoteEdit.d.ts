/**
 * @license
 * This file is part of Makelily
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */
import { Count, Direction, MxmlAccidental, Notations, Pitch, TimeModification } from "musicxml-interfaces";
import { IAny } from "musicxml-interfaces/operations";
import React from "react";
import { ToolProps } from "./tool";
export declare function toSerializable<T>(obj: T): T;
export interface State {
    accidental: MxmlAccidental;
    canonicalOperations: any;
    direction: Direction;
    dots: number;
    editType: "N" | "R" | "P";
    lastPath: (number | string)[];
    lastPitch: Pitch;
    notation: Notations;
    note: Count;
    operations: any;
    redoStack: IAny[][];
    relativeMode: boolean;
    showAdditionalHelp: "keyboard" | "midi" | "mouse" | "relative" | "whyNotEdit" | null;
    showHelp: boolean;
    src: string;
    timeModification: TimeModification;
    undoStack: IAny[][];
}
/**
 * A tool which allows notes to be entered with a mouse or keyboard.
 * This may also eventually support MIDI keyboards.
 */
export default class ToolNoteEdit extends React.Component<ToolProps, State> {
    state: State;
    private song;
    domNode: React.RefObject<HTMLDivElement>;
    componentDidMount(): void;
    render(): JSX.Element;
    private applyPreviewPatch;
    private applyUndoablePatch;
    private clearPreview;
    private generateLy;
    private getPitch;
    private getValidCursorTargetIndecies;
    private handleDirectionEvent;
    private handleError;
    private handleInsertLyClicked;
    private handleKeyDown;
    private handleKeyPress;
    private handleKeyPressSetAccidental;
    private handleKeyPressSetDuration;
    private handleKeyPressSetEditType;
    private handleMouseClick;
    private handleMouseMove;
    /**
     * Changes operations if needed.
     * Returns whether canoncialOperations were changed.
     */
    private handler;
    private handleShowHelpKeyboard;
    private handleShowHelpMIDI;
    private handleShowHelpMouse;
    private handleShowHelpNone;
    private handleShowHelpRelative;
    private handleShowHelpWhyNotEdit;
    private handleSongScroll;
    private handleVoiceEvent;
    private moveCursor;
    private moveCursorToEndOfMeasure;
    private moveCursorToStartOfMeasure;
    private moveInMeasure;
    private newMeasure;
    private playNote;
    private redo;
    private renderAdditionalHelp;
    private renderPalette;
    private satieKeyToBeat;
    private setAccidental;
    private setDirection;
    private setDots;
    private setEditType;
    private setNotation;
    private setNote;
    private setSongRef;
    private setTimeModification;
    private undo;
    private updateChord;
    private updateOctave;
}
