/// <reference types="react" />
import React = require('react');
import { Application } from './satie/src/satie';
export declare const satieApplication: Application;
export interface Props {
    clef: string;
    defaultTool: string;
    keySig: string;
    singleTaskMode: boolean;
    time: string;
    onHide(): void;
    onInsertLy(ly: string): void;
}
export interface State {
    toolKey: string;
}
/**
 * A modal which provides UIs for inserting LilyPond.
 */
export default class Makelily extends React.Component<Props, State> {
    state: State;
    componentDidCatch(error: Error, info: React.ErrorInfo): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): JSX.Element;
    private handleDocumentKeyDown;
}
