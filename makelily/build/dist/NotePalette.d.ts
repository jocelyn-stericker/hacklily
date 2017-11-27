/// <reference types="react" />
import { Count, Direction, MxmlAccidental, Notations, TimeModification } from 'musicxml-interfaces';
import * as React from 'react';
export interface Props {
    accidental: MxmlAccidental;
    direction: Direction;
    dots: number;
    editType: 'N' | 'R' | 'E' | 'P';
    notation: Notations;
    note: Count;
    timeModification: TimeModification;
    newMeasure(): void;
    redo(): void;
    setAccidental(accidental: MxmlAccidental): void;
    setDirection(direction: Direction): void;
    setDots(dots: number): void;
    setEditType(editType: 'N' | 'R' | 'E' | 'P'): void;
    setNotation(notation: Notations): void;
    setNote(count: Count): void;
    setTimeModification(timeModification: TimeModification): void;
    undo(): void;
}
/**
 * Renders a list of tools that can be selected in the note editor.
 */
export default class NotePalette extends React.Component<Props, {}> {
    render(): JSX.Element;
    shouldComponentUpdate(nextProps: Props): boolean;
    private renderAccidentals();
    private renderArticulations();
    private renderDuration();
    private renderDynamics();
    private renderModifiers();
    private renderSecondRow();
    private setAccidentalF;
    private setAccidentalNone;
    private setAccidentalS;
    private setNote1;
    private setNote16;
    private setNote2;
    private setNote32;
    private setNote4;
    private setNote8;
    private setTypeN;
    private setTypeP;
    private setTypeR;
    private toggleDots;
    private toggleTuplet;
}
