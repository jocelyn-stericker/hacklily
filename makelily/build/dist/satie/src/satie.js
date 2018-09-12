"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = process.env.SATIE_VERSION || "";
var engine_songImpl_1 = __importDefault(require("./engine_songImpl"));
/* The web application API */
var engine_application_1 = require("./engine_application");
exports.Application = engine_application_1.default;
/* Root-scope interfaces: Songs, documents, models */
var engine_application_2 = require("./engine_application");
exports.IHandler = engine_application_2.default;
var document_1 = require("./document");
exports.Document = document_1.Document;
exports.Type = document_1.Type;
exports.Song = engine_songImpl_1.default;
/* Experimental addons */
var private_smufl_1 = require("./private_smufl");
var private_renderUtil_1 = require("./private_renderUtil");
var implAttributes_clefView_1 = __importDefault(require("./implAttributes_clefView"));
var implAttributes_keySignatureView_1 = __importDefault(require("./implAttributes_keySignatureView"));
var implAttributes_timeSignatureView_1 = __importDefault(require("./implAttributes_timeSignatureView"));
var implAttributes_attributesData_1 = require("./implAttributes_attributesData");
var implDirection_directionView_1 = __importDefault(require("./implDirection_directionView"));
var implChord_notationView_1 = __importDefault(require("./implChord_notationView"));
var private_fontManager_1 = require("./private_fontManager");
exports.requireFont = private_fontManager_1.requireFont;
/* Patches */
var engine_createPatch_1 = __importDefault(require("./engine_createPatch"));
var engine_createPatch_2 = require("./engine_createPatch");
exports.PartBuilder = engine_createPatch_2.PartBuilder;
exports.StaffBuilder = engine_createPatch_2.StaffBuilder;
exports.DocumentBuilder = engine_createPatch_2.DocumentBuilder;
exports.MeasureBuilder = engine_createPatch_2.MeasureBuilder;
exports.VoiceBuilder = engine_createPatch_2.VoiceBuilder;
var Addons;
(function (Addons) {
    Addons.getGlyphCode = private_smufl_1.getGlyphCode;
    Addons.pageSizes = private_renderUtil_1.pageSizes;
    Addons.Clef = implAttributes_clefView_1.default;
    Addons.KeySignature = implAttributes_keySignatureView_1.default;
    Addons.TimeSignature = implAttributes_timeSignatureView_1.default;
    Addons.Direction = implDirection_directionView_1.default;
    Addons.NotationView = implChord_notationView_1.default;
    Addons.getAccidentalsFromKey = implAttributes_attributesData_1.getNativeKeyAccidentals;
})(Addons = exports.Addons || (exports.Addons = {}));
var Patch;
(function (Patch) {
    Patch.createPatch = engine_createPatch_1.default;
})(Patch = exports.Patch || (exports.Patch = {}));
//# sourceMappingURL=satie.js.map