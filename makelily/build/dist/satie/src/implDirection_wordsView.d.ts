/// <reference types="react" />
/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */
import { Direction, CreditWords, Words } from "musicxml-interfaces";
import { Component } from "react";
import { ITextMixin } from "./private_views_textMixin";
export interface IProps {
    layout: {
        model: Direction;
        overrideX?: number;
    };
    key?: string | number;
}
export default class WordsView extends Component<IProps, {}> implements ITextMixin {
    static contextTypes: any;
    context: {
        originY: number;
        scale40: number;
    };
    getTextAnchor: (words: CreditWords | Words) => string;
    getTextDecoration: (words: CreditWords | Words) => string;
    getTransform: (words: CreditWords | Words) => string;
    getDirection: (words: CreditWords | Words) => string;
    getX: (lineNum: number) => number;
    getDX: (words: CreditWords | Words, initX: number, lineNum: number) => number;
    getDY: (words: CreditWords | Words, initY: number, lineNum: number) => number;
    render(): any;
}
