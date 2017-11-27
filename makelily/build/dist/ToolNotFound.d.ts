/// <reference types="react" />
import React = require('react');
import { ToolProps } from './tool';
/**
 * Placeholder for when a tool with an invalid name is requested.
 */
export default class ToolNotFound extends React.Component<ToolProps, {}> {
    render(): JSX.Element;
}
