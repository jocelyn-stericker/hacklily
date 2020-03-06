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
/**
 * @file engine/scoreHeader.ts holds default header information as well
 * as convienience utilites for score headers.
 */
import { NormalItalic, NormalBold, OddEvenBoth, LeftCenterRight, serializeScoreHeader, } from "musicxml-interfaces";
import { forEach, some, defaultsDeep } from "lodash";
import { getPageMargins } from "./private_print";
import { distances, bravura } from "./private_smufl";
import { mmToTenths, defaultStaveHeight, defaultPageSize, defaultMargins, } from "./private_renderUtil";
/**
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
var ScoreHeaderModel = /** @class */ (function () {
    /*---- Extensions ---------------------------------------------------------------------------*/
    function ScoreHeaderModel(spec) {
        /*---- ScoreHeader --------------------------------------------------------------------------*/
        this.credits = [];
        this.identification = {
            creators: [],
            encoding: {
                encodingDescriptions: [],
                encodingDate: null,
                supports: {},
                encoders: [],
                softwares: [],
            },
            miscellaneous: null,
            relations: [],
            rights: [],
            source: null,
        };
        this.defaults = {
            appearance: {
                distances: {
                    hyphen: {
                        tenths: 10 * distances.hyphen,
                        type: "hyphen",
                    },
                    beam: {
                        tenths: 10 * distances.beam,
                        type: "beam",
                    },
                },
                lineWidths: {
                    staff: {
                        tenths: 10 * bravura.engravingDefaults.staffLineThickness,
                        type: "staff",
                    },
                    wedge: {
                        tenths: 10 * bravura.engravingDefaults.hairpinThickness,
                        type: "wedge",
                    },
                    ending: {
                        tenths: 10 * bravura.engravingDefaults.repeatEndingLineThickness,
                        type: "ending",
                    },
                    "heavy barline": {
                        tenths: 10 * bravura.engravingDefaults.thickBarlineThickness,
                        type: "heavy barline",
                    },
                    leger: {
                        tenths: 10 * bravura.engravingDefaults.legerLineThickness,
                        type: "leger",
                    },
                    stem: {
                        tenths: 10 * bravura.engravingDefaults.stemThickness,
                        type: "stem",
                    },
                    "tuplet bracket": {
                        tenths: 10 * bravura.engravingDefaults.tupletBracketThickness,
                        type: "tuplet bracket",
                    },
                    beam: {
                        tenths: 10 * bravura.engravingDefaults.beamThickness,
                        type: "beam",
                    },
                    "light barline": {
                        tenths: 10 * bravura.engravingDefaults.thinBarlineThickness,
                        type: "light barline",
                    },
                    enclosure: {
                        tenths: 10 * bravura.engravingDefaults.textEnclosureThickness,
                        type: "enclosure",
                    },
                },
                noteSizes: {
                    1: {
                        // Grace
                        type: 1,
                        size: 60,
                    },
                    0: {
                        // Cue
                        type: 0,
                        size: 60,
                    },
                },
                otherAppearances: [],
            },
            lyricFonts: [],
            lyricLanguages: [],
            musicFont: {
                fontSize: "20.5",
                fontFamily: "Bravura, Maestro, engraved",
                fontStyle: NormalItalic.Normal,
                fontWeight: NormalBold.Normal,
            },
            pageLayout: {
                pageHeight: mmToTenths(defaultStaveHeight, defaultPageSize().height),
                pageWidth: mmToTenths(defaultStaveHeight, defaultPageSize().width),
                pageMargins: [
                    {
                        bottomMargin: mmToTenths(defaultStaveHeight, defaultMargins.bottom),
                        leftMargin: mmToTenths(defaultStaveHeight, defaultMargins.left),
                        rightMargin: mmToTenths(defaultStaveHeight, defaultMargins.right),
                        topMargin: mmToTenths(defaultStaveHeight, defaultMargins.top),
                        type: OddEvenBoth.Both,
                    },
                ],
            },
            scaling: {
                millimeters: defaultStaveHeight,
                tenths: 40,
            },
            staffLayouts: [],
            systemLayout: {
                systemDistance: 131,
                systemDividers: null,
                systemMargins: {
                    leftMargin: 0,
                    rightMargin: 0,
                },
                topSystemDistance: 70,
            },
            wordFont: {
                fontSize: "12",
                fontFamily: "Alegreya, Times New Roman, serif",
                fontStyle: NormalItalic.Normal,
                fontWeight: NormalBold.Normal,
            },
        };
        this.work = {
            opus: null,
            workNumber: "",
            workTitle: "",
        };
        this.movementTitle = "";
        this.movementNumber = "";
        this.partList = [];
        if (spec) {
            defaultsDeep(spec, this);
        }
        for (var key in spec) {
            if (Object.prototype.hasOwnProperty.call(spec, key) &&
                typeof key === "string" &&
                !!spec[key]) {
                this[key] = spec[key];
            }
        }
    }
    Object.defineProperty(ScoreHeaderModel.prototype, "composer", {
        get: function () {
            return this._getIdentificationOrCredit("composer");
        },
        set: function (composer) {
            this._setIdentification("composer", composer);
            this._setCredits("composer", composer, LeftCenterRight.Right, "12px", 20);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreHeaderModel.prototype, "arranger", {
        get: function () {
            return this._getIdentificationOrCredit("arranger");
        },
        set: function (arranger) {
            this._setIdentification("arranger", arranger);
            this._setCredits("arranger", arranger, LeftCenterRight.Right, "12px", 35);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreHeaderModel.prototype, "lyricist", {
        get: function () {
            return this._getIdentificationOrCredit("lyricist");
        },
        set: function (lyricist) {
            this._setIdentification("lyricist", lyricist);
            this._setCredits("lyricist", lyricist, LeftCenterRight.Right, "12px", 50);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScoreHeaderModel.prototype, "title", {
        get: function () {
            return this.movementTitle;
        },
        set: function (title) {
            // Set meta-data
            this.movementTitle = title;
            this._setCredits("title", title, LeftCenterRight.Center, "18px", 10);
        },
        enumerable: true,
        configurable: true
    });
    ScoreHeaderModel.prototype.toXML = function () {
        return serializeScoreHeader(this);
    };
    ScoreHeaderModel.prototype.inspect = function () {
        return this.toXML();
    };
    ScoreHeaderModel.prototype.overwriteEncoding = function () {
        var date = new Date();
        this.identification =
            this.identification || new ScoreHeaderModel(null).identification;
        this.identification.encoding = {
            encodingDescriptions: [],
            encodingDate: {
                month: date.getMonth() + 1,
                day: date.getDate(),
                year: date.getFullYear(),
            },
            supports: {
                "satie-collaboration": {
                    element: "satie-collaboration",
                    value: null,
                    type: true,
                    attribute: null,
                },
            },
            encoders: [],
            softwares: ["Songhaus Satie"],
        };
    };
    ScoreHeaderModel.prototype._getIdentificationOrCredit = function (type) {
        if (this.identification && (this.identification.creators || []).length) {
            var idComposer = this.identification.creators
                .filter(function (c) { return c.type === type; })
                .map(function (c) { return c.creator; })
                .join(", ");
            if (idComposer) {
                return idComposer;
            }
        }
        return this.credits
            .filter(function (c) { return c.creditTypes.indexOf(type) !== -1; })
            .map(function (m) { return m.creditWords; })
            .map(function (w) { return w.map(function (w) { return w.words; }).join(", "); })
            .join(", ");
    };
    ScoreHeaderModel.prototype._setIdentification = function (type, val) {
        this.identification =
            this.identification ||
                {
                    miscellaneous: [],
                    creators: [],
                    encoding: [],
                    relations: [],
                    rights: [],
                    source: null,
                };
        this.identification.creators = this.identification.creators || [];
        forEach(this.identification.creators, function (c) {
            if (c.type === type) {
                c.creator = val;
            }
        });
        if (!some(this.identification.creators, function (c) { return c.type === type; })) {
            // ...or add a val
            this.identification.creators.push({
                creator: val,
                type: type,
            });
        }
    };
    ScoreHeaderModel.prototype._setCredits = function (type, val, justification, fontSize, top) {
        var _this = this;
        var mm = this.defaults.scaling.millimeters;
        var pageLayout = this.defaults.pageLayout;
        this.credits = this.credits || [];
        forEach(this.credits, function (c, idx) {
            if (!c.creditWords) {
                return;
            }
            // Replace a credit...
            var isComposer = c.creditTypes.indexOf(type) !== -1;
            if (isComposer) {
                if (!c.creditWords.length) {
                    delete _this.credits[idx];
                }
                else {
                    c.creditWords.length = 1;
                    c.creditWords[0].words = val;
                }
            }
        });
        if (!some(this.credits, function (c) { return Boolean(c.creditWords) && c.creditTypes.indexOf(type) !== -1; })) {
            var defaultX = NaN;
            var margins = getPageMargins(this.defaults.pageLayout.pageMargins, 1);
            // TODO: Throughout this file, use own instead of default values
            switch (justification) {
                case LeftCenterRight.Center:
                    defaultX =
                        (margins.leftMargin - margins.rightMargin + pageLayout.pageWidth) /
                            2;
                    break;
                case LeftCenterRight.Right:
                    defaultX = pageLayout.pageWidth - margins.rightMargin;
                    break;
                case LeftCenterRight.Left:
                    defaultX = margins.leftMargin;
                    break;
                default:
                    defaultX = margins.leftMargin;
                    break;
            }
            this.credits.push({
                // ... or add a credit
                creditImage: null,
                creditTypes: [type],
                creditWords: [
                    {
                        words: val,
                        defaultX: defaultX,
                        justify: justification,
                        defaultY: pageLayout.pageHeight - mmToTenths(mm, top),
                        fontSize: fontSize,
                    },
                ],
                page: 1,
            });
        }
    };
    return ScoreHeaderModel;
}());
export default ScoreHeaderModel;
//# sourceMappingURL=engine_scoreHeader.js.map