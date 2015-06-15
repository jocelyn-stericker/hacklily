/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

import MusicXML = require("musicxml-interfaces");
import {Component, DOM, PropTypes} from "react";
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import DirectionModel from "../../models/direction";
import {RenderUtil} from "../../engine";
import {ITextMixin, Prototype as TextMixin} from "../textMixin";

class Words extends Component<Words.IProps, void> implements ITextMixin {
    render(): any {
        let layout = this.props.layout;
        let model = layout.model;
        let wordsContainer = _.filter(model.directionTypes, dt => dt.words)[0];
        invariant(!!wordsContainer, "No words found!");
        let words = wordsContainer.words;

        let initX = this.context.originX;
        let initY = this.context.originY - words[0].defaultY - (words[0].relativeY||0);
        let scale40 = this.context.scale40;

        return DOM.text({
                x: initX,
                y: initY
            },
            _.map(words, (words, idx) => {
                let isBold = words.fontWeight === MusicXML.NormalBold.Bold;
                let isItalic = words.fontStyle === MusicXML.NormalItalic.Italic;
                let fontSize = RenderUtil.cssSizeToTenths(scale40, words.fontSize);

                return _.map(words.data.split("\n"), (line, lineNum) => DOM.tspan({
                    "alignment-baseline": "hanging",
                    color: words.color || "black",
                    direction: this.getDirection(words),
                    dx: this.getDX(words, 0, lineNum),
                    dy: this.getDY(words, initY, lineNum),
                    "font-style": isItalic ? "italic" : "normal",
                    "font-weight": isBold ? "bold" : "normal",
                    fontFamily: words.fontFamily || "Alegreya",
                    fontSize: fontSize,
                    key: idx + "l" + lineNum,
                    "letter-spacing": words.letterSpacing && words.letterSpacing !== "normal" ?
                        ("" + RenderUtil.cssSizeToTenths(this.context.scale40,
                                words.letterSpacing)) : "normal",
                    "text-decoration": this.getTextDecoration(words),
                    textAnchor: this.getTextAnchor(words),
                    transform: this.getTransform(words),
                    x: this.getX(lineNum)
                }, line));
            })
        /* DOM.text */);
    }

    /* TextMixin.ITextMixin */
    getTextAnchor: (words: MusicXML.CreditWords | MusicXML.Words) => string;
    getTextDecoration: (words: MusicXML.CreditWords | MusicXML.Words) => string;
    getTransform: (words: MusicXML.CreditWords | MusicXML.Words) => string;
    getDirection: (words: MusicXML.CreditWords | MusicXML.Words) => string;
    getX: (lineNum: number) => number;
    getDX: (words: MusicXML.CreditWords | MusicXML.Words, initX: number, lineNum: number) => number;
    getDY: (words: MusicXML.CreditWords | MusicXML.Words, initY: number, lineNum: number) => number;
}

_.extend(Words.prototype, TextMixin);

module Words {
    export interface IProps {
        layout: DirectionModel.ILayout;
    }
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired,
        scale40: PropTypes.number.isRequired
    };
}

export default Words;
