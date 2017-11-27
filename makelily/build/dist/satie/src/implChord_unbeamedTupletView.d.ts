/// <reference types="react" />
import { Component } from "react";
import { IBeamLayout } from "./implChord_beamLayout";
export interface IProps {
    key?: string | number;
    stroke: string;
    stemWidth: number;
    layout: IBeamLayout;
}
export default class UnbeamedTuplet extends Component<IProps, {}> {
    static contextTypes: any;
    context: {
        originY: number;
    };
    render(): any;
    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset(): number;
    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    direction(): 1 | -1;
    private _withXOffset(x);
    private _getX1();
    private _getX2();
    private _getY1(incl);
    private _getY2(incl);
}
