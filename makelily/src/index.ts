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

import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("./models/engine");
import FontManager      = require("./models/fontManager");
import Models           = require("./models");
import Views            = require("./views");

/*---- Public Interface -------------------------------------------------------------------------*/

/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
export function init(options: ISatieOptions): void {
    invariant(!BrowserSetup.cssInjected, "init must be called before any Satie component is mounted " +
        "and must only be called once");
    BrowserSetup.injectStyles(options);
}

/**
 * Options to pass into init(...). No options are required.
 */
export interface ISatieOptions {
    /**
     * For web browsers only.
     * 
     * A list of fonts and variants (in parentheses) that are included on a webpage, that Satie should not automatically load.
     * You can get pretty good performance improvements by putting font loading inside your's HTML file's `<head></head>`
     * e.g., "Alegreya", "Alegreya (bold)", "Bravura"
     */
    preloadedFonts?: string[];

    /**
     * For web browsers only.
     * 
     * Specify where all the files Satie needs are. By default, Satie looks inside `http[s]://vendor/`.
     */
    satieRoot?: string;
}

/**
 * Represents a MusicXML document.
 */
export type IDocument = Engine.IDocument;

/**
 * Parses a MusicXML document and returns an IDocument.
 */
export function loadDocument(xml: string, failure: (err: Error) => void, success: (doc: Engine.IDocument) => void) {
    Models.importXML(xml, (err, document) => err ? failure(err) : success(document));
}

/**
 * Convienience function which renders the first page of a MusicXML document as an SVG.
 */
export function getSVGPreview(document: Engine.IDocument, failure: (err: Error) => void, success: (svg: string) => void) {
    try {
        success(Views.renderDocument(document, 0));
    } catch(err) {
        failure(err);
    }
}

/**
 * A Viewer is a React component that renders a MusicXML document.
 * 
 * Usage: <Satie.Viewer document={document} pageClassName="satiePage" />
 */
export import Viewer = require("./viewer");

/*---- Private ----------------------------------------------------------------------------------*/

module BrowserSetup {
    export var cssInjected = false;

    export var injectStyles = _.once(function injectStyles(spec: ISatieOptions = {}): void {
        invariant(!cssInjected, "_.once doesn't work?");
        cssInjected = true;
        if (typeof window === "undefined") {
            return;
        }

        var style = document.createElement("style");
        style.appendChild(document.createTextNode("")); // WebKit hack
        document.head.appendChild(style);

        _.forEach(spec.preloadedFonts, font => {
            let baseFont = (/[\w\s]*/.exec(font) || [""])[0].replace(/\s/g, " ").trim();
            if (!baseFont) {
                throw new Error("Font " + font + " is not a valid font name.");
            }
            let variant = (/\((\w*)\)/.exec(font) || [])[1] || undefined;
            if (variant && variant !== "bold" && variant !== "bold italic" && variant !== "italic") {
                throw new Error("Valid font variants are bold, bold italic, and italic");
            }

            FontManager.markPreloaded(baseFont, variant);
        });

        if (spec.satieRoot) {
            FontManager.setRoot(spec.satieRoot);
        }

        style.innerHTML =
            ".mn_ {"+
                "-moz-user-select: none;"+
                "-ms-user-select: none;"+
                "-webkit-touch-callout: none;"+
                "-webkit-user-select: none;"+
                "cursor: default;"+
                "font-family: 'bravura';"+
                "user-select: none;"+
                "pointer-events: none;"+
                "text-rendering: optimizeSpeed;"+
            "}" +
            ".mmn_ {"+
                "font-family: 'Alegreya';" +
                "font-style: italic;" +
                "text-anchor: middle;" +
                "fill: #444;" +
            "}" +
            ".bn_ {"+
                "font-family: 'Alegreya';" +
                "font-style: italic;" +
                "text-anchor: end;" +
                "fill: #7a7a7a;" +
            "}";
    });
}
