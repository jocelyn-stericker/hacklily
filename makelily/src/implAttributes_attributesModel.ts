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

import {Clef, PartSymbol, MeasureStyle, StaffDetails, Transpose, Directive,
    Time, Key, Footnote, Level, Attributes, KeyOctave, PartSymbolType, SymbolSize,
    TimeSymbolType, serializeAttributes} from "musicxml-interfaces";
import {find, forEach, times, isEqual} from "lodash";
import * as invariant from "invariant";

import {IModel, Type, ILayout} from "./document";

import {IBoundingRect} from "./private_boundingRect";
import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";
import {hasAccidental} from "./private_chordUtil";
import {groupsForPart} from "./private_part";
import {createAttributesSnapshot as createSnapshot} from "./private_attributesSnapshot";

import {standardClefs} from "./implAttributes_clefData";
import {CLEF_INDENTATION, clefWidth, keyWidth, timeWidth,
    clefsEqual, timesEqual, keysEqual} from "./implAttributes_attributesData";

class AttributesModel implements Export.IAttributesModel {
    _class = "Attributes";

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    private _divCount = 0;
    private _layout: AttributesModel.Layout[];

    get divCount() {
        return this._divCount;
    }
    set divCount(count: number) {
        invariant(isFinite(count), "Count must be finite.");
        this._divCount = count;
    }

    /** defined externally */
    staffIdx: number;

    _snapshot: IAttributesSnapshot;

    /*---- I.2 Attributes -----------------------------------------------------------------------*/

    _parent: IAttributesSnapshot;

    divisions: number;

    partSymbol: PartSymbol;
    measureStyles: MeasureStyle[];
    staffDetails: StaffDetails[];
    transposes: Transpose[];
    staves: number;
    instruments: string;
    directives: Directive[];
    clefs: Clef[];
    times: Time[];
    keySignatures: Key[];

    /*---- I.3 Editorial ------------------------------------------------------------------------*/

    footnote: Footnote;
    level: Level;

    /*---- Implementation -----------------------------------------------------------------------*/

    refresh(cursor: IReadOnlyValidationCursor): void {
        this._parent = cursor.staffAttributes;

        if (!this._parent || !this._parent.divisions) {
            this.divisions = this.divisions || 1;
        }

        this._validateClef(cursor);
        this._validateTime(cursor);
        this._validateKey(cursor);
        this._validateStaves(cursor);
        this._validateStaffDetails(cursor);
        this._validateMeasureStyles(cursor);

        this._snapshot = createSnapshot({
            before: cursor.staffAttributes || <IAttributesSnapshot> {},
            current: this,
            staff: cursor.staffIdx,
            measure: cursor.measureInstance.idx
        });
    }

    getLayout(cursor: LayoutCursor): Export.IAttributesLayout {
        if (!this._layout) {
            this._layout = [];
        }
        if (!this._layout[cursor.segmentInstance.owner]) {
            this._layout[cursor.segmentInstance.owner] = new AttributesModel.Layout();
        }
        let layout = this._layout[cursor.segmentInstance.owner];
        layout._refresh(this, this._snapshot, this._parent, cursor);
        return layout;
    }

    constructor({divisions, partSymbol, measureStyles, staffDetails, transposes, staves, instruments,
            directives, clefs, times, keySignatures, footnote, level}: Attributes = {divisions: 0}) {
        this.divisions = divisions;
        this.partSymbol = partSymbol;
        this.measureStyles = measureStyles;
        this.staffDetails = staffDetails;
        this.transposes = transposes;
        this.staves = staves;
        this.instruments = instruments;
        this.directives = directives;
        this.clefs = clefs;
        this.times = times;
        this.keySignatures = keySignatures;
        this.footnote = footnote;
        this.level = level;
    }

    toXML(): string {
        let j = this.toJSON();
        // Hack: we index staffDetails by 1-index staff, leaving a null at index 0, with MXML doesn't handle.
        j.staffDetails = j.staffDetails.filter(a => !!a);
        return `${serializeAttributes(j)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    toJSON(): Attributes {
        const {
            _class,
            divisions,
            partSymbol,
            measureStyles,
            staffDetails,
            transposes,
            staves,
            instruments,
            directives,
            clefs,
            times,
            keySignatures,
            footnote,
            level,
        } = this;

        return {
            _class,
            divisions,
            partSymbol,
            measureStyles,
            staffDetails,
            transposes,
            staves,
            instruments,
            directives,
            clefs,
            times,
            keySignatures,
            footnote,
            level,
        };
    }

    inspect() {
        return this.toXML();
    }

    calcWidth() {
        return 0; // TODO
    }

    private _validateClef(cursor: IReadOnlyValidationCursor) {
        const staffIdx = cursor.staffIdx;

        // Clefs must be an array
        if (!(this.clefs instanceof Array)) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.clefs([])
            ));
        }

        // Clefs must have a staff number and be sorted by staff number
        this.clefs.forEach((clef, clefIdx) => {
            if (!clef) {
                return;
            }
            if (clef.number !== clefIdx) {
                cursor.patch(staff => staff.attributes(attributes =>
                    attributes.clefsAt(clefIdx, clef =>
                        clef.number(clefIdx)
                    )
                ));
            }
        });

        // A clef is mandatory (we haven't implemented clef-less staves yet)
        if ((!this._parent || !this._parent.clef) && !this.clefs[staffIdx]) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes
                    .clefsAt(0, null) // XXX: HACK to fix splice
                    .clefsAt(staffIdx, clef =>
                        clef
                            .number(staffIdx)
                            .sign("G")
                            .line(2)
                )
            ));
        }

        // Validate the given clef
        let clef = this.clefs[staffIdx];
        if (clef) {
            if (clef.sign !== clef.sign.toUpperCase()) {
                cursor.patch(staff => staff.attributes(attributes =>
                    attributes.clefsAt(staffIdx, clefb =>
                        clefb.sign(clef.sign.toUpperCase())
                    )
                ));
            }
            if (clef.line && clef.line !== parseInt("" + clef.line, 10)) {
                cursor.patch(staff => staff.attributes(attributes =>
                    attributes.clefsAt(staffIdx, clefb =>
                        clefb.line(parseInt("" + clef.line, 10))
                    )
                ));
            }

            // Clef lines can be inferred.
            if (!clef.line) {
                let {sign} = clef;
                let standardClef = find(standardClefs, {sign});
                cursor.patch(staff => staff.attributes(attributes =>
                    attributes.clefsAt(staffIdx, clefb =>
                        clefb.line(standardClef ? standardClef.line : 2)
                    )
                ));
            }
        }
    }

    private _validateTime(cursor: IReadOnlyValidationCursor) {
        // Times must be an array
        this.times = this.times || [];

        // A time signature is mandatory.
        if ((!this._parent || !this._parent.time) && !this.times[0]) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.timesAt(0, time => time
                    .symbol(TimeSymbolType.Common)
                    .beats(["4"])
                    .beatTypes([4])
                )
            ));
        }
    }

    private _validateKey(cursor: IReadOnlyValidationCursor) {
        // Key signatures must be an array
        this.keySignatures = this.keySignatures || [];

        if ((!this._parent || !this._parent.keySignature) && !this.keySignatures[0]) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.keySignaturesAt(0, key => key
                    .fifths(0)
                    .mode("major")
                )
            ));
        }

        let ks = this.keySignatures[0];
        if (ks && (ks.keySteps || ks.keyAlters || ks.keyOctaves)) {
            if (ks.keySteps.length !== ks.keyAlters.length) {
                console.warn(
                    "Expected the number of steps to equal the number of alterations. " +
                    "Ignoring key.");
                cursor.patch(staff => staff.attributes(attributes =>
                    attributes.keySignaturesAt(0, key => key
                        .fifths(0)
                        .keySteps(null)
                        .keyAccidentals(null)
                        .keyAlters(null)
                    )
                ));
            }
            if (ks.keyAccidentals && ks.keyAccidentals.length !== ks.keySteps.length) {
                if (ks.keyAccidentals.length) {
                    console.warn(
                        "Currently, if `key-accidentals` are specified, they must be " +
                        "specified for all steps in a key signature due to a limitation " +
                        "in musicxml-interfaces. Ignoring `key-accidentals`");
                }
                cursor.patch(staff => staff.attributes(attributes =>
                    attributes.keySignaturesAt(0, key => key
                        .keyAccidentals(null)
                    )
                ));
            }
            if (ks.keyOctaves) {
                // Let's sort them (move to prefilter?)
                let keyOctaves: KeyOctave[] = [];
                forEach(ks.keyOctaves, octave => {
                   keyOctaves[octave.number - 1] = octave;
                });
                if (!isEqual(ks.keyOctaves, keyOctaves)) {
                    cursor.patch(staff => staff.attributes(attributes =>
                        attributes.keySignaturesAt(0, key => key
                            .keyOctaves(keyOctaves)
                        )
                    ));
                }
            }
        }
    }

    private _validateStaffDetails(cursor: IReadOnlyValidationCursor) {
        // Staff details must be an array
        this.staffDetails = this.staffDetails || [];

        // Staff details must have a staff number
        let sSoFar = 0;
        this.staffDetails.forEach((staffDetails, i) => {
            if (staffDetails) {
                ++sSoFar;
                if (!staffDetails.number) {
                    cursor.patch(staff => staff.attributes(attributes =>
                        attributes.staffDetailsAt(i, sd =>
                            sd.number(sSoFar)
                        )
                    ));
                }
            }
        });

        // Staff details must be indexed by staff
        const staffDetailsByNumber: StaffDetails[] = this.staffDetails.reduce((staffDetails, staffDetail) => {
            if (staffDetail) {
                staffDetails[staffDetail.number] = staffDetail;
            };
            return staffDetails;
        }, []);
        let needsSorting = this.staffDetails.length !== staffDetailsByNumber.length ||
            this.staffDetails.some((s, i) => {
                if (!s && !staffDetailsByNumber[i]) {
                    return false;
                }
                return !isEqual(s, staffDetailsByNumber[i]);
            });
        if (needsSorting) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.staffDetails(staffDetailsByNumber)
            ));
        }

        // Staff details are required. Staff lines are required
        if (!this.staffDetails[cursor.staffIdx]) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes
                    .staffDetailsAt(0, null) // XXX: HACK
                    .staffDetailsAt(cursor.staffIdx, {
                        number: cursor.staffIdx,
                    })
            ));
        }

        if ((!this._parent || !this._parent.staffDetails ||
                !this._parent.staffDetails[cursor.staffIdx] ||
                !this._parent.staffDetails[cursor.staffIdx].staffLines) &&
                (!this.staffDetails[cursor.staffIdx] ||
                    !this.staffDetails[cursor.staffIdx].staffLines)) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.staffDetailsAt(cursor.staffIdx, l => l.staffLines(5))
            ));
        }
    }

    private _validateStaves(cursor: IReadOnlyValidationCursor) {
        this.staves = this.staves || 1; // FIXME!
        let currentPartId = cursor.segmentInstance.part;
        let currentPart = cursor.measureInstance.parts[currentPartId];
        times(this.staves, staffMinusOne => {
            let staff = staffMinusOne + 1;
            if (!currentPart.staves[staff]) {
                throw new Error("A staff is missing. The code to add it is not implemented.");
            }
        });
        if (this.staves > 1 && (!this._parent || !this._parent.partSymbol) && !this.partSymbol) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.partSymbol({
                    bottomStaff: 1,
                    topStaff: this.staves,
                    type: PartSymbolType.Brace,
                })
            ));
        }

        // HACK: Convert part group symbols to part symbols.
        // Obviously, this won't fly when we have multiple part groups
        let groups = groupsForPart(cursor.header.partList, cursor.segmentInstance.part);
        if (groups.length && (!this._parent || !this._parent.partSymbol) && !this.partSymbol) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.partSymbol({
                    bottomStaff: 1,
                    topStaff: 1,
                    type: PartSymbolType.Bracket
                })
            ));
        }
    }

    private _validateMeasureStyles(cursor: IReadOnlyValidationCursor): void {
        if (!this.measureStyles) {
            cursor.patch(staff => staff.attributes(attributes =>
                attributes.measureStyles([])
            ));
        }
    }
}

module AttributesModel {
    export class Layout implements Export.IAttributesLayout {
        _refresh(model: IModel, attributes: Attributes, prevAttributes: Attributes, cursor: LayoutCursor) {
            this.model = model;
            invariant(!!attributes, "Layout must be passed a model");

            this.clef = null;
            this.snapshotClef = null;
            this.clefSpacing = null;
            this.time = null;
            this.tsSpacing = null;
            this.keySignature = null;
            this.ksSpacing = null;
            this.measureNumberVisible = null;
            this.partSymbol = null;
            this.staffDetails = null;

            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.staffIdx = cursor.staffIdx;

            let isFirstInLine = cursor.lineBarOnLine === 0 && !this.division;
            let next = cursor.segmentInstance[cursor.segmentPosition + 1];

            let ksVisible = !keysEqual(attributes, prevAttributes) || isFirstInLine;

            let tsVisible = !timesEqual(attributes, prevAttributes);

            let clefVisible = !clefsEqual(attributes, prevAttributes, cursor.segmentInstance.owner) || isFirstInLine;
            let partSymbolVisible = isFirstInLine && attributes.partSymbol &&
                attributes.partSymbol.bottomStaff === cursor.staffIdx;

            // Measure number
            if (!cursor.measureInstance.implicit && parseInt(cursor.measureInstance.number, 10) !== 1) {
                let measureNumbering = cursor.print ?
                    cursor.print.measureNumbering.data : "system";

                let firstInMeasure = cursor.segmentDivision === 0;

                let showNumberBecauseOfSystem = isFirstInLine && measureNumbering === "system";

                let showNumberBecauseOfMeasure =
                    this.division === 0 && measureNumbering === "measure" && firstInMeasure;

                let shouldShowNumber = showNumberBecauseOfSystem || showNumberBecauseOfMeasure;

                if (shouldShowNumber) {
                    this.measureNumberVisible = cursor.measureInstance.number;
                }
            }

            /*---- Clef layout ------------------------------------*/

            const nextChord = cursor.factory.modelHasType(next, Type.Chord) ? next : null;

            this.snapshotClef = cursor.staffAttributes.clef;
            if (clefVisible) {
                let clef = attributes.clefs[cursor.staffIdx];
                this.x += CLEF_INDENTATION;
                cursor.segmentX = this.x;

                let contextualSpacing = 0;
                this.clef = Object.create(clef, {
                    "defaultX": {
                        get: () => {
                            if (isFirstInLine) {
                                return this.overrideX;
                            } else {
                                return this.overrideX - 10.5;
                            }
                        }
                    }
                });
                this.clef.defaultY = this.clef.defaultY || 0;
                this.clef.size = isFirstInLine ? SymbolSize.Full : SymbolSize.Cue;

                if (nextChord && !ksVisible && !tsVisible) {
                    if (hasAccidental(nextChord, cursor)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 15;
                    } else {
                        contextualSpacing = 25;
                    }
                } else {
                    contextualSpacing = 12.5;
                }

                if (!isFirstInLine) {
                    contextualSpacing -= 19.8;
                }

                this.clefSpacing = clefWidth(attributes) + contextualSpacing;
            } else {
                this.clefSpacing = 0;
            }

            /*---- KS layout --------------------------------------*/

            if (ksVisible) {
                let keySignature = attributes.keySignatures[0];
                let contextualSpacing = 0;
                this.keySignature = Object.create(keySignature, {
                    defaultX: {
                        get: () => {
                            return this.overrideX + this.clefSpacing;
                        }
                    }
                });
                this.keySignature.defaultY = 0;
                if (nextChord && !tsVisible) {
                    if (hasAccidental(nextChord, cursor)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 25;
                    } else {
                        contextualSpacing = 15;
                    }
                } else {
                    contextualSpacing = 10;
                }

                this.ksSpacing = contextualSpacing + keyWidth(attributes);
            } else {
                this.ksSpacing = 0;
            }

            /*---- TS layout --------------------------------------*/

            if (tsVisible) {
                let time = attributes.times[0];
                let contextualSpacing = 0;
                this.time = Object.create(time, {
                    defaultX: {
                        get: () => {
                            return this.overrideX + this.clefSpacing + this.ksSpacing;
                        }
                    }
                });
                this.time.defaultY = 0;
                if (nextChord) {
                    if (hasAccidental(nextChord, cursor)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 25;
                    } else {
                        contextualSpacing = 15;
                    }
                } else {
                    contextualSpacing = 12.5;
                }

                if (!attributes.times[0].beatTypes) {
                    contextualSpacing = 0;
                }

                this.tsSpacing = contextualSpacing + timeWidth(attributes);
            } else {
                this.tsSpacing = 0;
            }

            /*---- Part symbol ------------------------------------*/

            if (partSymbolVisible) {
                let {partSymbol} = cursor.staffAttributes;
                this.partSymbol = Object.create(partSymbol, {
                    defaultX: {
                        get: () => {
                            return 0;
                        }
                    }
                });
            }

            this.staffDetails = cursor.staffAttributes.staffDetails[this.staffIdx];

            /*---- Geometry ---------------------------------------*/

            cursor.segmentX += this.clefSpacing + this.tsSpacing + this.ksSpacing;
            this.renderedWidth = cursor.segmentX - this.x - 8;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: IModel;
        x: number;
        division: number;
        staffIdx: number;

        /**
         * Set by layout engine.
         */
        overrideX: number;

        // Prototype:

        boundingBoxes: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";
        renderedWidth: number;

        /*---- AttributesModel ----------------------------------------------*/

        clef: Clef;
        snapshotClef: Clef;
        clefSpacing: number;

        time: Time;
        tsSpacing: number;

        keySignature: Key;
        ksSpacing: number;

        /** undefined if no measure number should be displayed.  */
        measureNumberVisible: string;

        partSymbol: PartSymbol;

        staffDetails: StaffDetails;
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Attributes;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
};

/**
 * Registers Attributes in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.Attributes] = AttributesModel;
}

module Export {
    export interface IAttributesModel extends Attributes, IModel {
        divisions: number;
    }

    export interface IAttributesLayout extends ILayout {
        model: IModel;

        clef: Clef;
        snapshotClef: Clef;
        clefSpacing: number;

        time: Time;
        tsSpacing: number;

        keySignature: Key;
        ksSpacing: number;

        measureNumberVisible: string;

        partSymbol: PartSymbol;

        staffIdx: number;

        staffDetails: StaffDetails;
    }

    export function createWarningLayout(cursor: LayoutCursor, prevAttributes: Attributes,
            nextAttributes: Attributes): IAttributesLayout {
        let warningLayout = new AttributesModel.Layout();
        console.log("Creating warning layout for ", nextAttributes);
        warningLayout._refresh(
            null,
            nextAttributes,
            prevAttributes,
            cursor,
        );

        return warningLayout;
    }
}

export default Export;
