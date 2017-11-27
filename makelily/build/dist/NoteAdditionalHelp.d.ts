/// <reference types="react" />
import React = require('react');
export interface Props {
    kind: 'keyboard' | 'midi' | 'mouse' | 'relative' | 'whyNotEdit';
    onHide(): void;
}
/**
 * Renders help links in the note tool.
 */
export default class NoteAdditionalHelp extends React.Component<Props, {}> {
    render(): JSX.Element;
    private renderKeyboard();
    private renderMIDI();
    private renderMouse();
    private renderRelative();
    private renderWhyNotEdit();
}
