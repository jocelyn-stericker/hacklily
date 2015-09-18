/**
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

/**
 * @file engine/scoreHeader.ts holds default header information as well
 * as convienience utilites for score headers.
 */

"use strict";

import {ScoreHeader, Credit, Identification, Defaults, NormalItalic, NormalBold,
    OddEvenBoth, Work, PartList, LeftCenterRight,
    serialize as serializeToXML} from "musicxml-interfaces";
import {forEach, any} from "lodash";

import {defaultsDeep, IPrint} from "../engine";
import {mmToTenths, defaultStaveHeight, pageSizes, defaultMargins} from "../engine/renderUtil";
import {distances, bravura} from "./smufl";

/** 
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
class ScoreHeaderModel implements ScoreHeader {
    /*---- ScoreHeader --------------------------------------------------------------------------*/

    credits: Credit[] = [];

    identification: Identification = {
        creators: [],
        encoding: {
            encodingDescriptions: [],
            encodingDate: null,
            supports: {},
            encoders: [],
            softwares: []
        },
        miscellaneous: null,
        relations: [],
        rights: [],
        source: null
    };

    defaults: Defaults = {
        appearance: {
            distances: {
                hyphen: {
                    tenths: 10 * distances.hyphen,
                    type: "hyphen"
                },
                beam: {
                    tenths: 10 * distances.beam,
                    type: "beam"
                }
            },
            lineWidths: {
                staff: {
                    "tenths": 10 * bravura.engravingDefaults.staffLineThickness,
                    "type": "staff"
                },
                wedge: {
                    "tenths": 10 * bravura.engravingDefaults.hairpinThickness,
                    "type": "wedge"
                },
                ending: {
                    "tenths": 10 * bravura.engravingDefaults.repeatEndingLineThickness,
                    "type": "ending"
                },
                "heavy barline": {
                    "tenths": 10 * bravura.engravingDefaults.thickBarlineThickness,
                    "type": "heavy barline"
                },
                leger: {
                    "tenths": 10 * bravura.engravingDefaults.legerLineThickness,
                    "type": "leger"
                },
                stem: {
                    "tenths": 10 * bravura.engravingDefaults.stemThickness,
                    "type": "stem"
                },
                "tuplet bracket": {
                    "tenths": 10 * bravura.engravingDefaults.tupletBracketThickness,
                    "type": "tuplet bracket"
                },
                beam: {
                    "tenths": 10 * bravura.engravingDefaults.beamThickness,
                    "type": "beam"
                },
                "light barline": {
                    "tenths": 10 * bravura.engravingDefaults.thinBarlineThickness,
                    "type": "light barline"
                },
                enclosure: {
                    "tenths": 10 * bravura.engravingDefaults.textEnclosureThickness,
                    "type": "enclosure"
                }
            },
            noteSizes: {
                1: { // Grace
                    "type": 1,
                    "size": 60 // Not sure what 60 refers to. Our grace notes are 1.9 spaces
                },
                0: { // Cue
                    "type": 0,
                    "size": 60 // Not sure what 60 refers to. Our cue notes are 1.9 spaces.
                }
            },
            otherAppearances: []
        },
        lyricFonts: [],
        lyricLanguages: [],
        musicFont: {
            fontSize: "20.5", // This value is completely ignored. See "scaling"
            fontFamily: "Bravura, Maestro, engraved",
            fontStyle: NormalItalic.Normal,
            fontWeight: NormalBold.Normal
        },
        pageLayout: {
            pageHeight: mmToTenths(
                defaultStaveHeight, pageSizes[0].height),
            pageWidth: mmToTenths(
                defaultStaveHeight, pageSizes[0].width),
            pageMargins: [
                {
                    bottomMargin: mmToTenths(
                        defaultStaveHeight, defaultMargins.bottom),
                    leftMargin: mmToTenths(
                        defaultStaveHeight, defaultMargins.left),
                    rightMargin: mmToTenths(
                        defaultStaveHeight, defaultMargins.right),
                    topMargin: mmToTenths(
                        defaultStaveHeight, defaultMargins.top),
                    type: OddEvenBoth.Both
                }
            ]
        },
        scaling: {
            millimeters: defaultStaveHeight,
            tenths: 40
        },
        staffLayouts: [],
        systemLayout: {
            systemDistance: 131,
            systemDividers: null,
            systemMargins: {
                leftMargin: 0,
                rightMargin: 0
            },
            topSystemDistance: 70
        },
        wordFont: {
            fontSize: "12",
            fontFamily: "Alegreya, Times New Roman, serif",
            fontStyle: NormalItalic.Normal,
            fontWeight: NormalBold.Normal
        }
    };

    work: Work = {
        opus: null,
        workNumber: "",
        workTitle: ""
    };

    movementTitle: string = "";
    movementNumber: string = "";

    partList: PartList = [];

    get composer() {
        return this._getIdentificationOrCredit("composer");
    }

    set composer(composer: string) {
        this._setIdentification("composer", composer);
        this._setCredits("composer", composer, LeftCenterRight.Right, "12px", 20);
    }

    get arranger() {
        return this._getIdentificationOrCredit("arranger");
    }

    set arranger(arranger: string) {
        this._setIdentification("arranger", arranger);
        this._setCredits("arranger", arranger, LeftCenterRight.Right, "12px", 35);
    }

    get lyricist() {
        return this._getIdentificationOrCredit("lyricist");
    }

    set lyricist(lyricist: string) {
        this._setIdentification("lyricist", lyricist);
        this._setCredits("lyricist", lyricist, LeftCenterRight.Right, "12px", 50);
    }

    get title() {
        return this.movementTitle;
    }
    set title(title: string) {
        // Set meta-data
        this.movementTitle = title;

        this._setCredits("title", title, LeftCenterRight.Center, "18px", 10);
    }

    /*---- Extensions ---------------------------------------------------------------------------*/

    constructor(spec: ScoreHeader) {
        if (spec) {
            defaultsDeep(spec, this);
        }
        for (let key in spec) {
            if (spec.hasOwnProperty(key) && typeof key === "string" && !!(<any>spec)[key]) {
                (<any>this)[key] = (<any>spec)[key];
            }
        }
    }

    toXML(): string {
        return serializeToXML.scoreHeader(this);
    }

    inspect() {
        return this.toXML();
    }

    overwriteEncoding() {
        let date = new Date;

        this.identification = this.identification || (new ScoreHeaderModel(null)).identification;
        this.identification.encoding = {
            encodingDescriptions: [],
            encodingDate: {
                month: date.getMonth() + 1,
                day: date.getDate(),
                year: date.getFullYear()
            },
            supports: {
                "satie-ext": {
                    element: "satie-ext",
                    value: null,
                    type: "yes",
                    attribute: null
                }
            },
            encoders: [],
            softwares: [
                "Ripieno Satie"
            ]
        };
    }

    private _getIdentificationOrCredit(type: string) {
        if (this.identification && (this.identification.creators || []).length) {
            let idComposer = this.identification.creators
                .filter(c => c.type === type)
                .map(c => c.creator)
                .join(", ");

            if (idComposer) {
                return idComposer;
            }
        }

        return this.credits.filter(c => c.creditTypes.indexOf(type) !== -1)
            .map(m => m.creditWords)
            .map(w => w.map(w => w.words).join(", "))
            .join(", ");
    }

    private _setIdentification(type: string, val: string) {
        this.identification = this.identification || {
                miscellaneous: [],
                creators: [],
                encoding: [],
                relations: [],
                rights: [],
                source: null
            };
        this.identification.creators = this.identification.creators || [];

        forEach(this.identification.creators, c => {
            if (c.type === type) {
                c.creator = val;
            }
        });
        if (!any(this.identification.creators, c => c.type === type)) {
            // ...or add a val
            this.identification.creators.push({
                creator: val,
                type: type
            });
        }
    }

    private _setCredits(type: string, val: string,
            justification: LeftCenterRight, fontSize: string, top: number) {
        const mm = this.defaults.scaling.millimeters;
        const pageLayout = this.defaults.pageLayout;

        this.credits = this.credits || [];
        forEach(this.credits, (c, idx) => {
            if (!c.creditWords) {
                return false;
            }
            // Replace a credit...
            let isComposer = c.creditTypes.indexOf(type) !== -1;
            if (isComposer) {
                if (!c.creditWords.length) {
                    delete this.credits[idx];
                } else {
                    c.creditWords.length = 1;
                    c.creditWords[0].words = val;
                }
            }
        });
        if (!any(this.credits, c => Boolean(c.creditWords) && c.creditTypes.indexOf(type) !== -1)) {
            let defaultX = NaN;
            let margins = IPrint.getPageMargins(this.defaults.pageLayout.pageMargins, 1);
            // TODO: Throughout this file, use own instead of default values
            switch (justification) {
                case LeftCenterRight.Center:
                    defaultX = (margins.leftMargin - margins.rightMargin +
                        pageLayout.pageWidth) / 2;
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
            };

            this.credits.push({
                // ... or add a credit
                creditImage: null,
                creditTypes: [type],
                creditWords: [{
                    words: val,
                    defaultX: defaultX,
                    justify: justification,
                    defaultY: pageLayout.pageHeight - mmToTenths(mm, top),
                    fontSize: fontSize
                }],
                page: 1
            });
        }
    }
}

export default ScoreHeaderModel;
