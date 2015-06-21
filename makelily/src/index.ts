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
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import {IDocument, ILinesLayoutMemo} from "./engine";
import {markPreloaded, setRoot} from "./models/fontManager";
import {renderDocument} from "./views";
import {stringToDocument as musicxmlStringToDocument} from "./models/musicxml/import";

import Attributes from "./models/attributes";
import Barline from "./models/barline";
import Chord from "./models/chord";
import Direction from "./models/direction";
import Factory from "./models/factory";
import FiguredBass from "./models/figuredBass";
import {requireFont, whenReady} from "./models/fontManager";
import Grouping from "./models/grouping";
import Harmony from "./models/harmony";
import Print from "./models/print";
import Proxy from "./models/proxy";
import Sound from "./models/sound";
import Spacer from "./models/spacer";

import VoiceStaffStemDirection from "./preprocessors/voiceStaffStemDirection";

import AttributesPostprocessor from "./postprocessors/attributes";
import BeamPostprocessor from "./postprocessors/beam";
import CenterPostprocessor from "./postprocessors/center";
import JustifyPostprocessor from "./postprocessors/justify";
import PadPostprocessor from "./postprocessors/pad";
import RemoveOverlapsPostprocessor from "./postprocessors/removeOverlaps";
import TiedsPostprocessor from "./postprocessors/tieds";

/*---- Public Interface -------------------------------------------------------------------------*/

/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
export function init(options: ISatieOptions): void {
    invariant(!BrowserSetup.cssInjected,
        "init must be called before any Satie component is mounted " +
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
     * A list of fonts and variants (in parentheses) that are included on a webpage, that Satie
     * should not automatically load. You can get strong performance improvements by putting font
     * loading inside your's HTML file's `<head></head>`
     *
     * e.g., "Alegreya", "Alegreya (bold)", "Bravura"
     */
    preloadedFonts?: string[];

    /**
     * For web browsers only.
     * 
     * Specify where all the files Satie needs are.
     * By default, Satie looks inside `http[s]://vendor/`.
     */
    satieRoot?: string;
}

/**
 * Represents a MusicXML document.
 */
export {IDocument} from "./engine";

/**
 * Parses a MusicXML document and returns an IDocument.
 */
export function importXML(src: string, cb: (error: Error, document?: IDocument) => void) {
    requireFont("Bravura", "root://bravura/otf/Bravura.otf");
    requireFont("Alegreya", "root://alegreya/Alegreya-Regular.ttf");
    requireFont("Alegreya", "root://alegreya/Alegreya-Bold.ttf", "bold");
    whenReady((err) => {
        if (err) {
            cb(err);
        } else {
            try {
                let memo$ = ILinesLayoutMemo.create(NaN);
                let factory = makeFactory();
                cb(null, musicxmlStringToDocument(src, memo$, factory));
            } catch(err) {
                cb(err);
            }
        }
    });
}

export function exportXML(score: IDocument, cb: (error: Error, xml: string) => void) {
    let out = "";
    out += MusicXML.serialize.scoreHeader(score.header) + "\n";
    _.forEach(score.measures, measure => {
        // TODO: dehack
        out += `<measure number="${measure.number}">\n`;
        _.forEach(measure.parts, (part, id) => {
            out += `  <part id="${id}">\n`;
            // TODO: merge
            _.forEach(part.voices, voice => {
                if (voice) {
                    out += (_.map(voice, model =>
                            (<any>model).toXML())
                                .join("\n")
                                .split("\n")
                                .map(t => "    " + t)
                                .join("\n")) + "\n";
                }
            });
            _.forEach(part.staves, staff => {
                if (staff) {
                    out += (_.map(staff, model =>
                                (<any>model).toXML())
                                    .join("\n")
                                    .split("\n")
                                    .map(t => "    " + t)
                                    .join("\n")) + "\n";
                }
            });
            out += `  </part>\n`;
        });
        out += `</measure>\n`;
    });

    cb(null, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 1.0 Timewise//EN"
                                "http://www.musicxml.org/dtds/timewise.dtd">
<score-timewise>
${out.split("\n").map(t => "  " + t).join("\n")}
</score-timewise>`);
}

/**
 * Convienience function which renders the first page of a MusicXML document as an SVG.
 */
export function getSVGPreview(document: IDocument, cb: (err: Error, svg?: string) => void) {
    try {
        cb(null, renderDocument(document, 0));
    } catch(err) {
        cb(err);
    }
}

/**
 * A Viewer is a React component that renders a MusicXML document.
 * 
 * Usage: <Satie.Viewer document={document} pageClassName="satiePage" />
 */
export {default as Viewer} from "./viewer";

/*---- Private ----------------------------------------------------------------------------------*/

function makeFactory() {
    return new Factory(
        [
            Attributes,
            Barline,
            Chord,
            Direction,
            FiguredBass,
            Grouping,
            Harmony,
            Print,
            Proxy,
            Sound,
            Spacer
        ],
        [
            VoiceStaffStemDirection
        ],
        [
            PadPostprocessor,
            JustifyPostprocessor,
            BeamPostprocessor,
            CenterPostprocessor,
            AttributesPostprocessor,
            TiedsPostprocessor,
            RemoveOverlapsPostprocessor
        ]
    );
}

module BrowserSetup {
    export let cssInjected = false;

    export let injectStyles = _.once(function injectStyles(spec: ISatieOptions = {}): void {
        invariant(!cssInjected, "_.once doesn't work?");
        cssInjected = true;
        if (typeof window === "undefined") {
            return;
        }

        let style = document.createElement("style");
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

            markPreloaded(baseFont, variant);
        });

        if (spec.satieRoot) {
            setRoot(spec.satieRoot);
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
