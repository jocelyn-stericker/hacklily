/// <reference types="react" />
import { Count, Direction, MxmlAccidental, Notations, Pitch, TimeModification } from 'musicxml-interfaces';
import { IAny } from 'musicxml-interfaces/operations';
import React = require('react');
import { ToolProps } from './tool';
export declare function toSerializable<T>(obj: T): T;
export interface State {
    accidental: MxmlAccidental;
    canonicalOperations: any;
    direction: Direction;
    dots: number;
    editType: 'N' | 'R' | 'P';
    lastPath: (number | string)[];
    lastPitch: Pitch;
    notation: Notations;
    note: Count;
    operations: any;
    redoStack: IAny[][];
    relativeMode: boolean;
    showAdditionalHelp: 'keyboard' | 'midi' | 'mouse' | 'relative' | 'whyNotEdit' | null;
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
    componentDidMount(): void;
    render(): JSX.Element;
    private applyPreviewPatch;
    private applyUndoablePatch;
    private clearPreview;
    private generateLy();
    private getPitch(apitch, doc, measure);
    private getValidCursorTargetIndecies(doc, segment);
    private handleDirectionEvent(doc, measure, measureUUID, ev, isPreview);
    private handleError;
    private handleInsertLyClicked;
    private handleKeyDown;
    private handleKeyPress;
    private handleKeyPressSetAccidental(key);
    private handleKeyPressSetDuration(key);
    private handleKeyPressSetEditType(key);
    private handleMouseClick;
    private handleMouseMove;
    /**
     * Changes operations if needed.
     * Returns whether canoncialOperations were changed.
     */
    private handler(ev, isPreview);
    private handleShowHelpKeyboard;
    private handleShowHelpMIDI;
    private handleShowHelpMouse;
    private handleShowHelpNone;
    private handleShowHelpRelative;
    private handleShowHelpWhyNotEdit;
    private handleSongScroll;
    private handleVoiceEvent(doc, measure, measureUUID, ev, isPreview);
    private moveCursor;
    private moveCursorToEndOfMeasure(part, voiceNum, measure);
    private moveCursorToStartOfMeasure(part, voiceNum, measure);
    private moveInMeasure(part, voiceNum, measure, pickIdx);
    private newMeasure;
    private playNote(pitch);
    private redo;
    private renderAdditionalHelp();
    private renderPalette();
    private satieKeyToBeat(doc, key);
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
