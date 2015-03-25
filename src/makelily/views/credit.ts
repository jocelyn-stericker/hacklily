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

import MusicXML         = require("musicxml-interfaces");
import React            = require("react");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("../models/engine");

var DOMProperty         = require("react/lib/DOMProperty");

const DEF_SPACING       = 4;

let custAttributes = {
    "text-decoration": true,
    "letter-spacing": true,
    "font-style": true,
    "font-weight": true,
    "color": true,
    "direction": true
};

DOMProperty.injection.injectDOMPropertyConfig({
    isCustomAttribute: function (attributeName: string) {
        return attributeName in custAttributes;
    }
});

/**                                     IMPL        TEST
 * --- words -------------------------------------------
 * justify?: LeftCenterRight;           YES
 * defaultX?: number;                   YES
 * relativeY?: number;                  YES
 * defaultY?: number;                   YES
 * relativeX?: number;                  YES
 * fontFamily?: string;                 YES
 * fontWeight?: NormalBold;             YES
 * fontStyle?: NormalItalic;            YES
 * fontSize?: string;                   YES
 * color?: string;                      YES
 * halign?: LeftCenterRight;            0.5 (not if diff. than justify)
 * valign?: TopMiddleBottomBaseline;
 * underline?: number;                  1
 * overline?: number;                   1
 * lineThrough?: number;                1
 * rotation?: number;                   YES
 * letterSpacing?: string;              YES
 * lineHeight?: string;
 * dir?: DirectionMode;                 YES
 * enclosure?: EnclosureShape;
 * --- image -------------------------[ NO              ]
 * --- page --------------------------[ N/A             ]
 * --- creditTypes -------------------[ N/A             ]
 */
class Credit extends React.Component<MusicXML.Credit, void> {
    render() {
        const image = this.props.creditImage;
        const words = this.props.creditWords;
        invariant(!image, "Not implemented"); // There is either words or image, but not both
        invariant(!!words, "Unknown component type");

        if (!!words && !words.length) {
            return React.DOM.g({});
        }
        const initX = (words[0].defaultX + (words[0].relativeX || 0));
        const initY = (this.context.pageHeight - (words[0].defaultY + (words[0].relativeY || 0)));

        return React.DOM.text({
                x: initX,
                y: initY
            },
            _.map(words, (words, idx) => React.DOM.tspan({
                key: idx,
                dx: (words.defaultX || words.relativeX) ?
                    (words.defaultX + (words.relativeX || 0)) - initX :
                    DEF_SPACING,
                dy: (words.defaultY || words.relativeY) ?
                    (this.context.pageHeight - (words.defaultY + (words.relativeY || 0))) - initY :
                    0,
                fontFamily: words.fontFamily || "Alegreya",
                fontSize: Engine.RenderUtil.cssSizeToTenths(this.context.scale40, words.fontSize),
                "font-weight": words.fontWeight === MusicXML.NormalBold.Bold ? "bold" : "normal",
                "font-style": words.fontStyle === MusicXML.NormalItalic.Italic ? "italic" : "normal",
                color: words.color || "black",
                textAnchor: this.getTextAnchor(words),
                "text-decoration": this.getTextDecoration(words),
                transform: this.getTransform(words),
                "letter-spacing": words.letterSpacing && words.letterSpacing !== "normal" ?
                    ("" + Engine.RenderUtil.cssSizeToTenths(this.context.scale40,
                            words.letterSpacing)) : "normal",
                direction: this.getDirection(words)
            }, words.words))
        /* React.DOM.text */);
    }
    getTextAnchor(words: MusicXML.CreditWords) {
        switch(words.halign || words.justify) {
            case MusicXML.LeftCenterRight.Right:
                return "end";
            case MusicXML.LeftCenterRight.Center:
                return "middle";
            case MusicXML.LeftCenterRight.Left:
                return "start";
            default:
                return "inherit";
        }
    }
    getTextDecoration(words: MusicXML.CreditWords) {
        if (words.underline) {
            return "underline";
        }
        if (words.overline) {
            return "overline";
        }
        if (words.lineThrough) {
            return "line-through";
        }
        return "none";
    }
    getTransform(words: MusicXML.CreditWords) {
        if (words.rotation) {
            return `rotate(${words.rotation})`;
        }
        return undefined;
    }
    getDirection(words: MusicXML.CreditWords) {
        switch(words.dir) {
            case MusicXML.DirectionMode.Lro:    // TODO: bidi
            case MusicXML.DirectionMode.Ltr:
                return "ltr";

            case MusicXML.DirectionMode.Rlo:    // TODO: bidi
            case MusicXML.DirectionMode.Rtl:
                return "rtl";

            default:
                return "inherit";
        }
    }
}

module Credit {
    export var contextTypes = <any> {
        scale40:            React.PropTypes.number.isRequired,
        pageHeight:         React.PropTypes.number.isRequired
    };
}

export = Credit;
