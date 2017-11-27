/// <reference types="react" />
import { Component, ReactElement } from "react";
import ChordModel from "./implChord_chordModel";
export interface IProps {
    layout: ChordModel.IChordLayout;
}
/**
 * Renders notes and their notations.
 */
export default class ChordView extends Component<IProps, {}> {
    static contextTypes: any;
    context: {
        originY: number;
    };
    render(): ReactElement<any>;
}
