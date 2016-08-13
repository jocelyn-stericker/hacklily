/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {Credit, NormalItalic, NormalBold, CreditWords, Words} from "musicxml-interfaces";
import {Component, DOM, PropTypes} from "react";
import {map, extend} from "lodash";
import * as invariant from "invariant";

import {cssSizeToTenths} from "../private/renderUtil";
import {ITextMixin, Prototype as TextMixin} from "../private/views/textMixin";

export default class CreditView extends Component<Credit, void> implements ITextMixin {
    static contextTypes = {
        originY: PropTypes.number.isRequired,
        scale40: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
        scale40: number;
    };

    /* ITextMixin */
    getTextAnchor: (words: CreditWords | Words) => string;
    getTextDecoration: (words: CreditWords | Words) => string;
    getTransform: (words: CreditWords | Words) => string;
    getDirection: (words: CreditWords | Words) => string;
    getX: (lineNum: number) => number;
    getDX: (words: CreditWords | Words, initX: number, lineNum: number) => number;
    getDY: (words: CreditWords | Words, initY: number, lineNum: number) => number;

    render(): any {
        let image = this.props.creditImage;
        let words = this.props.creditWords;
        let scale40 = this.context.scale40;
        invariant(!image, "Not implemented"); // There is either words or image, but not both
        invariant(!!words, "Unknown component type");

        if (!!words && !words.length) {
            return DOM.g({});
        }
        const initX = (words[0].defaultX + (words[0].relativeX || 0));
        const initY = (this.context.originY - (words[0].defaultY + (words[0].relativeY || 0)));

        return DOM.text({
                x: initX,
                y: initY
            },
            map(words, (words, idx) => {
                let isItalic = words.fontStyle === NormalItalic.Italic;
                let isBold = words.fontWeight === NormalBold.Bold;
                let fontSize = cssSizeToTenths(scale40, words.fontSize);
                return map(words.words.split("\n"), (line, lineNum) => DOM.tspan({
                    "alignment-baseline": "hanging",
                    fill: words.color || "black",
                    direction: this.getDirection(words),
                    dx: this.getDX(words, initX, lineNum),
                    dy: this.getDY(words, initY, lineNum),
                    "font-style": isItalic ? "italic" : "normal",
                    "font-weight": isBold ? "bold" : "normal",
                    fontFamily: words.fontFamily || "Alegreya",
                    fontSize: fontSize,
                    key: idx + "l" + lineNum,
                    "letter-spacing": words.letterSpacing && words.letterSpacing !== "normal" ?
                        ("" + cssSizeToTenths(this.context.scale40,
                                words.letterSpacing)) : "normal",
                    "text-decoration": this.getTextDecoration(words),
                    textAnchor: this.getTextAnchor(words),
                    transform: this.getTransform(words),
                    x: this.getX(lineNum)
                } as any, line));
            })
        /* DOM.text */);
    }
}

extend(CreditView.prototype, TextMixin);

