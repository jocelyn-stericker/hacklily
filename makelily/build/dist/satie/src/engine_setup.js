"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var private_fontManager_1 = require("./private_fontManager");
var implAttributes_attributesModel_1 = __importDefault(require("./implAttributes_attributesModel"));
var implAttributes_attributesPostprocessor_1 = __importDefault(require("./implAttributes_attributesPostprocessor"));
var implBarline_barlineModel_1 = __importDefault(require("./implBarline_barlineModel"));
var implChord_chordModel_1 = __importDefault(require("./implChord_chordModel"));
var implChord_voiceStaffStemDirectionPreprocessor_1 = __importDefault(require("./implChord_voiceStaffStemDirectionPreprocessor"));
var implChord_beamPostprocessor_1 = __importDefault(require("./implChord_beamPostprocessor"));
var implChord_tiedsPostprocessor_1 = __importDefault(require("./implChord_tiedsPostprocessor"));
var implDirection_directionModel_1 = __importDefault(require("./implDirection_directionModel"));
var implFiguredBass_figuredBassModel_1 = __importDefault(require("./implFiguredBass_figuredBassModel"));
var implGrouping_groupingModel_1 = __importDefault(require("./implGrouping_groupingModel"));
var implHarmony_harmonyModel_1 = __importDefault(require("./implHarmony_harmonyModel"));
var implPrint_printModel_1 = __importDefault(require("./implPrint_printModel"));
var implProxy_proxyModel_1 = __importDefault(require("./implProxy_proxyModel"));
var implSound_soundModel_1 = __importDefault(require("./implSound_soundModel"));
var implSpacer_spacerModel_1 = __importDefault(require("./implSpacer_spacerModel"));
var implVisualCursor_visualCursorModel_1 = __importDefault(require("./implVisualCursor_visualCursorModel"));
var implLine_centerPostprocessor_1 = __importDefault(require("./implLine_centerPostprocessor"));
var implLine_justifyPostprocessor_1 = __importDefault(require("./implLine_justifyPostprocessor"));
var implLine_padPostprocessor_1 = __importDefault(require("./implLine_padPostprocessor"));
var implLine_removeOverlapsPostprocessor_1 = __importDefault(require("./implLine_removeOverlapsPostprocessor"));
var engine_factory_1 = __importDefault(require("./engine_factory"));
var BrowserSetup;
(function (BrowserSetup) {
    BrowserSetup.cssInjected = false;
    BrowserSetup.injectStyles = lodash_1.once(function injectStyles(spec) {
        if (spec === void 0) { spec = {}; }
        BrowserSetup.cssInjected = true;
        if (typeof window === "undefined") {
            return;
        }
        var style = document.createElement("style");
        style.appendChild(document.createTextNode("")); // WebKit hack
        document.head.appendChild(style);
        lodash_1.forEach(spec.preloadedFonts, function (font) {
            var baseFont = (/[\w\s]*/.exec(font) || [""])[0]
                .replace(/\s/g, " ")
                .trim();
            if (!baseFont) {
                throw new Error("Font " + font + " is not a valid font name.");
            }
            var variant = (/\((\w*)\)/.exec(font) || [])[1] || undefined;
            if (variant &&
                variant !== "bold" &&
                variant !== "bold italic" &&
                variant !== "italic") {
                throw new Error("Valid font variants are bold, bold italic, and italic");
            }
            private_fontManager_1.markPreloaded(baseFont, variant);
        });
        if (spec.satieRoot) {
            private_fontManager_1.setRoot(spec.satieRoot);
        }
        style.innerHTML =
            ".mn_ {" +
                "-moz-user-select: none;" +
                "-ms-user-select: none;" +
                "-webkit-touch-callout: none;" +
                "-webkit-user-select: none;" +
                "cursor: default;" +
                "font-family: 'bravura';" +
                "user-select: none;" +
                "text-rendering: optimizeSpeed;" +
                "}" +
                ".mmn_ {" +
                "font-family: 'Alegreya';" +
                "font-style: italic;" +
                "text-anchor: middle;" +
                "fill: #444;" +
                "}" +
                ".bn_ {" +
                "font-family: 'Alegreya';" +
                "font-style: italic;" +
                "text-anchor: end;" +
                "fill: #7a7a7a;" +
                "}";
    });
})(BrowserSetup || (BrowserSetup = {}));
/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
function init(options) {
    invariant_1.default(!BrowserSetup.cssInjected, "init must be called before any Satie component is mounted " +
        "and must only be called once");
    BrowserSetup.injectStyles(options);
}
exports.init = init;
function makeFactory() {
    return new engine_factory_1.default([
        implAttributes_attributesModel_1.default,
        implBarline_barlineModel_1.default,
        implChord_chordModel_1.default,
        implDirection_directionModel_1.default,
        implFiguredBass_figuredBassModel_1.default,
        implGrouping_groupingModel_1.default,
        implHarmony_harmonyModel_1.default,
        implPrint_printModel_1.default,
        implProxy_proxyModel_1.default,
        implSound_soundModel_1.default,
        implSpacer_spacerModel_1.default,
        implVisualCursor_visualCursorModel_1.default,
    ], [implChord_voiceStaffStemDirectionPreprocessor_1.default], [
        implLine_padPostprocessor_1.default,
        implLine_justifyPostprocessor_1.default,
        implChord_beamPostprocessor_1.default,
        implLine_centerPostprocessor_1.default,
        implAttributes_attributesPostprocessor_1.default,
        implChord_tiedsPostprocessor_1.default,
        implLine_removeOverlapsPostprocessor_1.default,
    ]);
}
exports.makeFactory = makeFactory;
//# sourceMappingURL=engine_setup.js.map