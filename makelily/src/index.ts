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
import validateURL      = require("./util/validateURL");
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
    /**
     * Absolute URL of Bravura font, including protocol. By default, Bravura is loaded from Rawgit's CDN.
     * If you are using Satie in production, you should host Bravura yourself (otherwise you are relying on
     * Rawgit's uptime, which has no guarantee).
     *
     * Set to "none" if Satie should not load Bravura at all. This is useful if you are also using Bravura
     * outside of Satie.
     *
     * Default: location.protocol + "//cdn.rawgit.com/ripieno/satie/724fa96260b40e455e9e5217e226825066ba8312/" +
     *          "res/bravura.woff"
     *
     * Server behavior: This value is ignored on the server.
     */
    bravuraURL?: string;

    /**
     * Download fonts from Google Fonts as needed. Currently, just Alegreya is downloaded.
     * In future versions, other fonts defined in sheet music will also be downloaded.
     *
     * Default: true
     *
     * Server behavior: This value is ignored on the server.
     */
    useGoogleFonts?: boolean;
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

        if (spec.useGoogleFonts !== false) {
            (<any>window).WebFontConfig = {
                google: { families: ["Alegreya:400italic,700italic,900italic,400,700:latin", "Alegreya+SC:700,400:latin"] }
            };
            var protocol = "https:" === document.location.protocol ? "https" : "http";
            var wf = document.createElement("script");
            wf.src = protocol +
                "://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js";
            wf.type = "text/javascript";
            wf.async = true;

            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(wf, s);
        }

        var style = document.createElement("style");
        style.appendChild(document.createTextNode("")); // WebKit hack
        document.head.appendChild(style);

        var bravuraFontFace: string;
        if (spec.bravuraURL === "none") {
            bravuraFontFace = "";
        } else {
            invariant(!spec.bravuraURL || validateURL(spec.bravuraURL),
                "The bravuraURL must be undefined, a valid URL with protocol, or \"none\", but is \"%s\".", spec.bravuraURL);
            var bravuraURL = spec.bravuraURL ||
                (protocol + "://cdn.rawgit.com/ripieno/satie/724fa96260b40e455e9e5217e226825066ba8312/res/bravura.woff");
            bravuraFontFace = "@font-face {"+
                "font-family: 'bravura';"+
                "src: url('" + bravuraURL + "') format('woff');"+
                "font-weight: normal;"+
                "font-style: normal;"+
            "}";
        }

        style.innerHTML =
            bravuraFontFace +
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

