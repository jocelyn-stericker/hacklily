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
import {buildClef, buildTime, buildKey} from "musicxml-interfaces/builders";
import {find, forEach, times} from "lodash";
import * as invariant from "invariant";

import IModel from "../document/model";
import Type from "../document/types";
import ExpandPolicy from "../document/expandPolicies";

import ILayout from "../private/layout";
import IBoundingRect from "../private/boundingRect";
import IAttributesSnapshot from "../private/attributesSnapshot";
import {ICursor} from "../private/cursor";
import {barDivisions, fromModel as chordFromModel, hasAccidental} from "../private/chord";
import {groupsForPart} from "../private/part";
import {create as createSnapshot} from "../private/attributesSnapshot";

import {standardClefs} from "./clefData";
import {CLEF_INDENTATION, clefWidth, keyWidth, timeWidth} from "./attributesData";

class AttributesModel implements Export.IAttributesModel {
    _class = "Attributes";

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    private _divCount = 0;
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

    validate(cursor$: ICursor): void {
        if (this._parent && this._parent !== cursor$.staff.attributes) {
            // STOPSHIP: This will break when a model is inserted in the middle of nowhere.
            cursor$.staff.attributes = this._parent;
        }
        this._parent = cursor$.staff.attributes || <IAttributesSnapshot> {};

        if (!this._parent.divisions) {
            this.divisions = this.divisions || 1;
        }

        this._validateClef$(cursor$);
        this._validateTime$();
        this._validateKey$();
        this._validateStaves$(cursor$);
        this._validateStaffDetails$(cursor$);

        this._validateMeasureStyles(cursor$);

        this._snapshot = cursor$.staff.attributes = createSnapshot({
            before: cursor$.staff.attributes || <IAttributesSnapshot> {},
            current: this,
            staff: cursor$.staff.idx,
            measure: cursor$.measure.idx
        });

        this._setTotalDivisions(cursor$);
    }

    getLayout(cursor$: ICursor): Export.IAttributesLayout {
        cursor$.staff.attributes = this._snapshot;

        this._setTotalDivisions(cursor$);
        this._validateMeasureStyles(cursor$);

        // mutates cursor$ as required.
        return new AttributesModel.Layout(this, cursor$);
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
        return `${serializeAttributes(this)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    toJSON(): any {
        let {
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

    shouldRenderClef(owner: number, isFirstInLine: boolean) {
        if (isFirstInLine) {
            return true;
        }

        if (!this.clefs) {
            return false;
        }

        if (!this.clefs[owner]) {
            return false;
        }

        return true;
    }

    private _setTotalDivisions(cursor$: ICursor): void {
        cursor$.staff.totalDivisions = barDivisions(this._snapshot);
    }

    private _validateClef$(cursor$: ICursor) {
        const staffIdx = cursor$.staff.idx;

        // Clefs must be an array
        this.clefs = this.clefs || [];

        // Clefs must have a staff number
        this.clefs.forEach(clef => {
            if (clef) {
                clef.number = clef.number || 1;
            }
        });

        // Clefs must be indexed by staff
        this.clefs = this.clefs.reduce((clefs, clef) => {
            if (clef) {
                clefs[clef.number] = clef;
            };
            return clefs;
        }, []);

        // A clef is mandatory (we haven't implemented clef-less staves yet)
        if (!this._parent.clef && !this.clefs[staffIdx]) {
            this.clefs[staffIdx] = buildClef(clef => clef
                .number(staffIdx)
                .sign("G")
                .line(2));
        }

        // Validate the given clef
        let clef = this.clefs[staffIdx];
        if (clef) {
            clef.sign = clef.sign.toUpperCase();
            clef.line = parseInt("" + clef.line, 10);

            // Clef lines can be inferred.
            if (!clef.line) {
                let {sign} = clef;
                let standardClef = find(standardClefs, {sign});
                clef.line = standardClef ? standardClef.line : 2;
            }
        }
    }

    private _validateTime$() {
        // Times must be an array
        this.times = this.times || [];

        // A time signature is mandatory.
        if (!this._parent.time && !this.times[0]) {
            this.times[0] = buildTime(time => time
                .symbol(TimeSymbolType.Common)
                .beats(["4"])
                .beatTypes([4]));
        }
    }

    private _validateKey$() {
        // Key signatures must be an array
        this.keySignatures = this.keySignatures || [];

        if (!this._parent.keySignature && !this.keySignatures[0]) {
            this.keySignatures[0] = buildKey(key => key
                .fifths(0)
                .mode("major"));
        }

        let ks = this.keySignatures[0];
        if (ks && (ks.keySteps || ks.keyAlters || ks.keyOctaves)) {
            if (ks.keySteps.length !== ks.keyAlters.length) {
                console.warn(
                    "Expected the number of steps to equal the number of alterations. " +
                    "Ignoring key.");
                this.keySignatures = [{
                    fifths: 0,
                    keySteps: null,
                    keyAccidentals: null,
                    keyAlters: null
                }];
            }
            if (ks.keyAccidentals && ks.keyAccidentals.length !== ks.keySteps.length) {
                if (ks.keyAccidentals.length) {
                    console.warn(
                        "Currently, if `key-accidentals` are specified, they must be " +
                        "specified for all steps in a key signature due to a limitation " +
                        "in musicxml-interfaces. Ignoring `key-accidentals`");
                }
                ks.keyAccidentals = null;
            }
            if (ks.keyOctaves) {
                // Let's sort them (move to prefilter?)
                let keyOctaves: KeyOctave[] = [];
                forEach(ks.keyOctaves, octave => {
                   keyOctaves[octave.number - 1] = octave;
                });
                ks.keyOctaves = keyOctaves;
            }
        }
    }

    private _validateStaffDetails$(cursor$: ICursor) {
        // Staff details must be an array
        this.staffDetails = this.staffDetails || [];

        // Staff details must have a staff number
        this.staffDetails.forEach(staffDetails => {
            if (staffDetails) {
                staffDetails.number = staffDetails.number || 1;
            }
        });

        // Staff details must be indexed by staff
        this.staffDetails = this.staffDetails.reduce((staffDetails, staffDetail) => {
            if (staffDetail) {
                staffDetails[staffDetail.number] = staffDetail;
            };
            return staffDetails;
        }, []);

        // Staff details are required. Staff lines are required
        if (!this.staffDetails[cursor$.staff.idx]) {
            this.staffDetails[cursor$.staff.idx] = {
                number: cursor$.staff.idx
            };
        }

        if ((!this._parent.staffDetails || !this._parent.staffDetails.staffLines) &&
                !this.staffDetails[cursor$.staff.idx].staffLines) {
            this.staffDetails[cursor$.staff.idx].staffLines = 5;
        }
    }

    private _validateStaves$(cursor$: ICursor) {
        this.staves = this.staves || 1; // FIXME!
        let currentPartId = cursor$.segment.part;
        let currentPart = cursor$.measure.parent.parts[currentPartId];
        times(this.staves, staffMinusOne => {
            let staff = staffMinusOne + 1;
            if (!currentPart.staves[staff]) {
                throw new Error("A staff is missing. The code to add it is not implemented.");
            }
        });
        if (this.staves > 1 && !this._parent.partSymbol && !this.partSymbol) {
            this.partSymbol = {
                bottomStaff: 1,
                topStaff: this.staves,
                type: PartSymbolType.Brace
            };
        }

        // HACK: Convert part group symbols to part symbols.
        // Obviously, this won't fly when we have multiple part groups
        let groups = groupsForPart(cursor$.header.partList, cursor$.segment.part);
        if (groups.length && !this._parent.partSymbol && !this.partSymbol) {
            this.partSymbol = {
                bottomStaff: 1,
                topStaff: 1,
                type: PartSymbolType.Bracket
            };
        }
    }

    private _validateMeasureStyles(cursor$: ICursor): void {
        if (!this.measureStyles) {
            this.measureStyles = [];
        }
    }
}

module AttributesModel {
    export class Layout implements Export.IAttributesLayout {
        constructor(origModel: AttributesModel, cursor$: ICursor) {
            invariant(!!origModel, "Layout must be passed a model");

            let model = Object.create(cursor$.factory.identity(origModel)) as AttributesModel;
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
            this.staffIdx = cursor$.staff.idx;

            let isFirstInLine = cursor$.line && cursor$.line.barOnLine$ === 0 && !this.division;
            let next = cursor$.segment[cursor$.idx$ + 1];
            let nextIsNote = cursor$.factory.modelHasType(next, Type.Chord);
            let parent = this.model._parent;

            let keySignatures = model.keySignatures;
            let ksVisible = keySignatures && !!keySignatures.length || isFirstInLine;

            let tsVisible = !!model.times && !!model.times.length; // TODO: || isFirstInPage;

            let clefVisible = model.shouldRenderClef(cursor$.segment.owner, isFirstInLine);
            let partSymbolVisible = isFirstInLine && this.model.partSymbol &&
                this.model.partSymbol.bottomStaff === cursor$.staff.idx;

            // Measure number
            if (!cursor$.measure.implicit && parseInt(cursor$.measure.number, 10) !== 1) {
                let measureNumbering = cursor$.print$ ?
                    cursor$.print$.measureNumbering.data : "system";

                let firstInMeasure = !parent ||
                    parent.measure !== parseInt(cursor$.measure.number, 10);

                let showNumberBecauseOfSystem = isFirstInLine && measureNumbering === "system";

                let showNumberBecauseOfMeasure =
                    this.division === 0 && measureNumbering === "measure" && firstInMeasure;

                let shouldShowNumber = showNumberBecauseOfSystem || showNumberBecauseOfMeasure;

                if (shouldShowNumber) {
                    this.measureNumberVisible = cursor$.measure.number;
                }
            }

            /*---- Clef layout ------------------------------------*/

            const chord = nextIsNote ? chordFromModel(next) : null;

            this.snapshotClef = cursor$.staff.attributes.clef;
            if (clefVisible) {
                let {clef} = cursor$.staff.attributes;
                this.x$ += CLEF_INDENTATION;
                cursor$.x$ = this.x$;

                let contextualSpacing$ = 0;
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

                if (nextIsNote && !ksVisible && !tsVisible) {
                    if (hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 15;
                    } else {
                        contextualSpacing$ = 25;
                    }
                } else {
                    contextualSpacing$ = 12.5;
                }

                if (!isFirstInLine) {
                    contextualSpacing$ -= 19.8;
                }

                this.clefSpacing = clefWidth(model._snapshot, this.staffIdx) +
                    contextualSpacing$;
            } else {
                this.clefSpacing = 0;
            }

            /*---- KS layout --------------------------------------*/

            if (ksVisible) {
                let {keySignature} = cursor$.staff.attributes;
                let contextualSpacing$ = 0;
                this.keySignature = Object.create(keySignature, {
                    defaultX: {
                        get: () => {
                            return this.overrideX + this.clefSpacing;
                        }
                    }
                });
                this.keySignature.defaultY = 0;
                if (nextIsNote && !tsVisible) {
                    if (hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 25;
                    } else {
                        contextualSpacing$ = 15;
                    }
                } else {
                    contextualSpacing$ = 10;
                }

                this.ksSpacing = contextualSpacing$ + keyWidth(model._snapshot, 0);
            } else {
                this.ksSpacing = 0;
            }

            /*---- TS layout --------------------------------------*/

            if (tsVisible) {
                let {time} = cursor$.staff.attributes;
                let contextualSpacing$ = 0;
                this.time = Object.create(time, {
                    defaultX: {
                        get: () => {
                            return this.overrideX + this.clefSpacing + this.ksSpacing;
                        }
                    }
                });
                this.time.defaultY = 0;
                if (nextIsNote) {
                    if (hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 25;
                    } else {
                        contextualSpacing$ = 15;
                    }
                } else {
                    contextualSpacing$ = 12.5;
                }

                if (!origModel.times[0].beatTypes) {
                    contextualSpacing$ = 0;
                }

                this.tsSpacing = contextualSpacing$ + timeWidth(model._snapshot, 0);
            } else {
                this.tsSpacing = 0;
            }

            /*---- Part symbol ------------------------------------*/

            if (partSymbolVisible) {
                let {partSymbol} = cursor$.staff.attributes;
                this.partSymbol = Object.create(partSymbol, {
                    defaultX: {
                        get: () => {
                            return 0;
                        }
                    }
                });
            }

            this.staffDetails = cursor$.staff.attributes.staffDetails;

            /*---- Geometry ---------------------------------------*/

            cursor$.x$ += this.clefSpacing + this.tsSpacing + this.ksSpacing;
            this.renderedWidth = cursor$.x$ - this.x$ - 8;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: AttributesModel;
        x$: number;
        division: number;
        staffIdx: number;

        /**
         * Set by layout engine.
         */
        overrideX: number;

        // Prototype:

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: ExpandPolicy;
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

    Layout.prototype.expandPolicy = ExpandPolicy.None;
    Layout.prototype.renderClass = Type.Attributes;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
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
        model: IAttributesModel;

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

    export function createWarningLayout$(cursor$: ICursor, nextAttributes: Attributes) {
        let oldAttributes = cursor$.staff.attributes;
        cursor$.staff.attributes = (<any>nextAttributes)._snapshot;

        let warningLayout: IAttributesLayout =
            new AttributesModel.Layout(
                nextAttributes as any,
                cursor$
            );

        cursor$.staff.attributes = oldAttributes;
        return warningLayout;
    }
}

export default Export;
