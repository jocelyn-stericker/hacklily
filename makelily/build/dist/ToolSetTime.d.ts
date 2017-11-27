/// <reference types="react" />
import React = require('react');
import { ToolProps } from './tool';
export interface State {
    selectedTime: number;
}
/**
 * A tool which allows a time signature to be inserted.
 */
export default class ToolSetTime extends React.Component<ToolProps, State> {
    state: State;
    render(): JSX.Element;
    private generateLy();
    private handleInsertLyClicked;
}
