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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as React from "react";
import { NormalItalic, NormalBold, } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { filter, map, extend } from "lodash";
import invariant from "invariant";
import { cssSizeToTenths } from "./private_renderUtil";
import { Prototype as TextMixin } from "./private_views_textMixin";
var WordsView = /** @class */ (function (_super) {
    __extends(WordsView, _super);
    function WordsView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WordsView.prototype.render = function () {
        var _this = this;
        var layout = this.props.layout;
        var model = layout.model;
        var wordsContainer = filter(model.directionTypes, function (dt) { return dt.words; })[0];
        invariant(!!wordsContainer, "No words found!");
        var words = typeof wordsContainer !== "number" &&
            typeof wordsContainer !== "function" &&
            wordsContainer.words;
        var initX = this.props.layout.overrideX;
        var initY = this.context.originY - words[0].defaultY - (words[0].relativeY || 0);
        var scale40 = this.context.scale40;
        return (React.createElement("text", { x: initX, y: initY }, map(words, function (words, idx) {
            var isBold = words.fontWeight === NormalBold.Bold;
            var isItalic = words.fontStyle === NormalItalic.Italic;
            var fontSize = cssSizeToTenths(scale40, words.fontSize);
            return map(words.data.split("\n"), function (line, lineNum) { return (React.createElement("tspan", { alignmentBaseline: "hanging", fill: words.color || "black", direction: _this.getDirection(words), dx: _this.getDX(words, 0, lineNum), dy: _this.getDY(words, initY, lineNum), fontStyle: isItalic ? "italic" : "normal", fontWeight: isBold ? "bold" : "normal", fontFamily: words.fontFamily || "Alegreya", fontSize: fontSize, key: idx + "l" + lineNum, letterSpacing: words.letterSpacing && words.letterSpacing !== "normal"
                    ? "" +
                        cssSizeToTenths(_this.context.scale40, words.letterSpacing)
                    : "normal", textDecoration: _this.getTextDecoration(words), textAnchor: _this.getTextAnchor(words), transform: _this.getTransform(words), x: _this.getX(lineNum) }, line)); });
        })));
    };
    WordsView.contextTypes = {
        originY: PropTypes.number.isRequired,
        scale40: PropTypes.number.isRequired,
    };
    return WordsView;
}(Component));
export default WordsView;
extend(WordsView.prototype, TextMixin);
//# sourceMappingURL=implDirection_wordsView.js.map