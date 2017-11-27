/// <reference types="react" />
import React = require('react');
import { ToolProps } from './tool';
export interface State {
    octave: number;
    octaveOptional: boolean;
    selectedClef: number;
}
/**
 * A tool which allows clefs to be inserted.
 */
export default class ToolSetClef extends React.Component<ToolProps, State> {
    state: State;
    render(): JSX.Element;
    private generateLy();
    private handleInsertLyClicked;
}
