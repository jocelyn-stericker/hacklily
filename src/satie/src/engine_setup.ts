// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { forEach, once } from "lodash";

import Factory from "./engine_factory";
import AttributesExports from "./implAttributes_attributesModel";
import AttributesPostprocessor from "./implAttributes_attributesPostprocessor";
import Barline from "./implBarline_barlineModel";
import BeamPostprocessor from "./implChord_beamPostprocessor";
import Chord from "./implChord_chordModel";
import TiedsPostprocessor from "./implChord_tiedsPostprocessor";
import VoiceStaffStemDirection from "./implChord_voiceStaffStemDirectionPreprocessor";
import Direction from "./implDirection_directionModel";
import FiguredBass from "./implFiguredBass_figuredBassModel";
import Grouping from "./implGrouping_groupingModel";
import Harmony from "./implHarmony_harmonyModel";
import CenterPostprocessor from "./implLine_centerPostprocessor";
import JustifyPostprocessor from "./implLine_justifyPostprocessor";
import PadPostprocessor from "./implLine_padPostprocessor";
import RemoveOverlapsPostprocessor from "./implLine_removeOverlapsPostprocessor";
import Print from "./implPrint_printModel";
import Proxy from "./implProxy_proxyModel";
import Sound from "./implSound_soundModel";
import Spacer from "./implSpacer_spacerModel";
import VisualCursorModel from "./implVisualCursor_visualCursorModel";
import { markPreloaded, setRoot } from "./private_fontManager";

const BrowserSetup = {
  cssInjected: false,

  injectStyles: once(function injectStyles(spec: ISatieOptions = {}): void {
    BrowserSetup.cssInjected = true;
    if (typeof window === "undefined") {
      return;
    }

    const style = document.createElement("style");
    style.appendChild(document.createTextNode("")); // WebKit hack
    document.head.appendChild(style);

    forEach(spec.preloadedFonts, (font) => {
      const baseFont = (/[\w\s]*/.exec(font) || [""])[0]
        .replace(/\s/g, " ")
        .trim();
      if (!baseFont) {
        throw new Error("Font " + font + " is not a valid font name.");
      }
      const variant = (/\((\w*)\)/.exec(font) || [])[1] || undefined;
      if (
        variant &&
        variant !== "bold" &&
        variant !== "bold italic" &&
        variant !== "italic"
      ) {
        throw new Error(
          "Valid font variants are bold, bold italic, and italic",
        );
      }

      markPreloaded(baseFont, variant);
    });

    if (spec.satieRoot) {
      setRoot(spec.satieRoot);
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
  }),
};

/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
export function init(options: ISatieOptions): void {
  invariant(
    !BrowserSetup.cssInjected,
    "init must be called before any Satie component is mounted " +
      "and must only be called once",
  );

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
   * should not automatically load. You can get better performance improvements by putting font
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

export function makeFactory() {
  return new Factory(
    [
      AttributesExports,
      Barline,
      Chord,
      Direction,
      FiguredBass,
      Grouping,
      Harmony,
      Print,
      Proxy,
      Sound,
      Spacer,
      VisualCursorModel,
    ],
    [VoiceStaffStemDirection],
    [
      PadPostprocessor,
      JustifyPostprocessor,
      BeamPostprocessor,
      CenterPostprocessor,
      AttributesPostprocessor,
      TiedsPostprocessor,
      RemoveOverlapsPostprocessor,
    ],
  );
}
