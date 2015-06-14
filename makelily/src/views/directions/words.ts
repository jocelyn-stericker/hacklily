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
import React = require("react");
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import DirectionModel = require("../../models/direction");
import Engine = require("../../models/engine");
import TextMixin = require("../textMixin");

class Words extends React.Component<Words.IProps, void> implements TextMixin.ITextMixin {
    render(): any {
        let layout = this.props.layout;
        let model = layout.model;
        let wordsContainer = _.filter(model.directionTypes, dt => dt.words)[0];
        invariant(!!wordsContainer, "No words found!");
        let words = wordsContainer.words;

        let initX = this.context.originX;
        let initY = this.context.originY - words[0].defaultY - (words[0].relativeY||0);
        let scale40 = this.context.scale40;

        return React.DOM.text({
                x: initX,
                y: initY
            },
            _.map(words, (words, idx) => {
                let isBold = words.fontWeight === MusicXML.NormalBold.Bold;
                let isItalic = words.fontStyle === MusicXML.NormalItalic.Italic;
                let fontSize = Engine.RenderUtil.cssSizeToTenths(scale40, words.fontSize);

                return _.map(words.data.split("\n"), (line, lineNum) => React.DOM.tspan({
                    key: idx + "l" + lineNum,
                    "alignment-baseline": "hanging",
                    x: this.getX(lineNum),
                    dx: this.getDX(words, 0, lineNum),
                    dy: this.getDY(words, initY, lineNum),
                    fontFamily: words.fontFamily || "Alegreya",
                    fontSize: fontSize,

                    "font-weight": isBold ? "bold" : "normal",
                    "font-style": isItalic ? "italic" : "normal",
                    color: words.color || "black",
                    textAnchor: this.getTextAnchor(words),
                    "text-decoration": this.getTextDecoration(words),
                    transform: this.getTransform(words),
                    "letter-spacing": words.letterSpacing && words.letterSpacing !== "normal" ?
                        ("" + Engine.RenderUtil.cssSizeToTenths(this.context.scale40,
                                words.letterSpacing)) : "normal",
                    direction: this.getDirection(words)
                }, line));
            })
        /* React.DOM.text */);
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

_.extend(Words.prototype, TextMixin.Prototype);

module Words {
    export interface IProps {
        layout: DirectionModel.ILayout;
    }
    export var contextTypes = <any> {
        scale40: React.PropTypes.number.isRequired,
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };
}

export = Words;
