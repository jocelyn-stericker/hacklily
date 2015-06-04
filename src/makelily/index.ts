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

/// <reference path="../vendor/typings/tsd.d.ts" />

import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("./models/engine");
import Models           = require("./models");
export import Viewer    = require("./viewer");

/*---- Public Interface -------------------------------------------------------------------------*/

export type IDocument = Engine.IDocument;

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
 * Options for initSatie. All options have defaults.
 */
export interface ISatieOptions {
}

/**
 * Props of MusicXMLView.
 */
export interface ISatieProps {
    /**
     * Valid timewise or partwise MusicXML 3.0 string.
     */
    src: string;

    /**
     * Width of component in pixels. The score will be scaled to fit within the width.
     */
    width: number;

    /**
     * Height of component in pixels. A scroll-bar will be used if the score does not
     * fit within this height.
     */
    height: number;
}

export function loadDocument(xml: string, failure: (err: Error) => void, success: (doc: Engine.IDocument) => void) {
    Models.importXML(xml, (err, document) => err ? failure(err) : success(document));
}

export function toSVG(xml: string, cb: (svg: string) => void) {
    throw new Error("not implemented");
}

/*---- Private ----------------------------------------------------------------------------------*/

module BrowserSetup {
    export var cssInjected = false;

    export var injectStyles = _.once(function injectStyles(spec: ISatieOptions = {}): void {
        // Only run this function once.
        if (cssInjected) {
            return;
        }
        cssInjected = true;
        if (typeof window === "undefined") {
            return;
        }

        var style = document.createElement("style");
        style.appendChild(document.createTextNode("")); // WebKit hack
        document.head.appendChild(style);

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

