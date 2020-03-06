/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */
import React from "react";
import { Application } from "./satie/src/satie";
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
