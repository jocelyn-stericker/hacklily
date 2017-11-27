/// <reference types="react" />
import React = require('react');
import { ToolProps } from './tool';
export interface State {
    selectedKey: number;
    selectedMode: 'major' | 'minor';
}
/**
 * A tool which allows a key to be inserted.
 */
export default class ToolSetKey extends React.Component<ToolProps, State> {
    state: State;
    render(): JSX.Element;
    private generateLy();
    private handleInsertLyClicked;
}
