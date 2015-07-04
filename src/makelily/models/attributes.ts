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

import {Clef, PartSymbol, MeasureStyle, StaffDetails, Transpose, Directive,
    Time, Key, Footnote, Level, Attributes, KeyOctave, PartSymbolType, SymbolSize,
    parse as parseFromXML, serialize as serializeToXML} from "musicxml-interfaces";
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import {IAttributes, IChord, ICursor, IModel, IPart, ISegment} from "../engine";
import {create as createSnapshot} from "./attributesSnapshot";

class AttributesModel implements Export.IAttributesModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** defined externally */
    staffIdx: number;

    /** @prototype */
    frozenness: IModel.FrozenLevel;

    modelDidLoad$(segment$: ISegment): void {
        // todo
    }

    _snapshot: IAttributes.ISnapshot;
    validate$(cursor$: ICursor): void {
        this._parent = cursor$.staff.attributes || <IAttributes.ISnapshot> {};

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
            before: cursor$.staff.attributes || <IAttributes.ISnapshot> {},
            current: this,
            staff: cursor$.staff.idx,
            measure: cursor$.measure.idx
        });

        this._setTotalDivisions(cursor$);
    }

    layout(cursor$: ICursor): Export.ILayout {
        cursor$.staff.attributes = this._snapshot;

        this._setTotalDivisions(cursor$);
        this._validateMeasureStyles(cursor$);

        // mutates cursor$ as required.
        return new AttributesModel.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.Attributes ------------------------------------------------------------*/

    _parent: IAttributes.ISnapshot;

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

    /*---- I.3 C.MusicXML.Editorial -------------------------------------------------------------*/

    footnote: Footnote;
    level: Level;

    /*---- I.4 Satie Ext ------------------------------------------------------------------------*/

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor({divisions, partSymbol, measureStyles, staffDetails, transposes, staves, instruments,
            directives, clefs, times, keySignatures, footnote, level}: Attributes = {}) {
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
        return serializeToXML.attributes(this);
    }

    inspect() {
        return this.toXML();
    }

    private _validateClef$(cursor$: ICursor) {
        const staffIdx = cursor$.staff.idx;

        // Clefs must be an array
        this.clefs = this.clefs || [];

        // Clefs must have a staff number
        this.clefs.forEach(clef => clef.number = clef.number || 1);

        // Clefs must be indexed by staff
        this.clefs = this.clefs.reduce((clefs, clef) => {
            if (clef) {
                clefs[clef.number] = clef;
            };
            return clefs;
        }, []);

        // A clef is mandatory (we haven't implemented clef-less staves yet)
        if (!this._parent.clef && !this.clefs[staffIdx]) {
            this.clefs[staffIdx] = parseFromXML.clef(`
                <clef>
                    <number>${staffIdx}</number>
                    <sign>G</sign>
                    <line>2</line>
                </clef>
            `);
        }

        // Validate the given clef
        let clef = this.clefs[staffIdx];
        if (clef) {
            clef.sign = clef.sign.toUpperCase();
            clef.line = parseInt("" + clef.line, 10);

            // Clef lines can be inferred.
            if (!clef.line) {
                let {sign} = clef;
                let standardClef = _.find(IAttributes.Clef.standardClefs, {sign});
                clef.line = standardClef ? standardClef.line : 2;
            }
        }
    }
    private _validateTime$() {
        // Times must be an array
        this.times = this.times || [];

        // A time signature is mandatory.
        if (!this._parent.time && !this.times[0]) {
            this.times[0] = parseFromXML.time(`
                <time symbol="common">
                  <beats>4</beats>
                  <beat-type>4</beat-type>
                </time>
            `);
        }
    }

    private _validateKey$() {
        // Key signatures must be an array
        this.keySignatures = this.keySignatures || [];

        if (!this._parent.keySignature && !this.keySignatures[0]) {
            this.keySignatures[0] = parseFromXML.key(`
                <key>
                  <fifths>0</fifths>
                  <mode>major</mode>
                </key>
            `);
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
                    keyAlters: null,
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
                _.forEach(ks.keyOctaves, octave => {
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
        this.staffDetails.forEach(staffDetails => staffDetails.number = staffDetails.number || 1);

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
        _.times(this.staves, staffMinusOne => {
            let staff = staffMinusOne + 1;
            if (!currentPart.staves[staff]) {
                throw new Error("A staff is missing. The code to add it is not implemented.");
            }
        });
        if (this.staves > 1 && !this._parent.partSymbol && !this.partSymbol) {
            this.partSymbol = {
                bottomStaff: 1,
                topStaff: this.staves,
                type: PartSymbolType.Brace,
            };
        }

        // HACK: Convert part group symbols to part symbols.
        // Obviously, this won't fly when we have multiple part groups
        let groups = IPart.groupsForPart(cursor$.header.partList, cursor$.segment.part);
        if (groups.length && !this._parent.partSymbol && !this.partSymbol) {
            this.partSymbol = {
                bottomStaff: 1,
                topStaff: 1,
                type: PartSymbolType.Bracket,
            };
        }
    }

    _setTotalDivisions(cursor$: ICursor): void {
        cursor$.staff.totalDivisions = IChord.barDivisions(this._snapshot);
    }

    private _validateMeasureStyles(cursor$: ICursor): void {
        if (!this.measureStyles) {
            this.measureStyles = [];
        }
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
}

AttributesModel.prototype.divCount = 0;
AttributesModel.prototype.frozenness = IModel.FrozenLevel.Warm;

module AttributesModel {
    export class Layout implements Export.ILayout {
        constructor(origModel: AttributesModel, cursor$: ICursor) {
            invariant(!!origModel, "Layout must be passed a model");

            let model: AttributesModel = Object.create(cursor$.factory.identity(origModel));
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
            this.staffIdx = cursor$.staff.idx;

            let isFirstInLine = cursor$.line && cursor$.line.barOnLine$ === 0 && !this.division;
            let next = ICursor.next(cursor$);
            let nextIsNote = cursor$.factory.modelHasType(next, IModel.Type.Chord);
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

            const chord = nextIsNote ? IChord.fromModel(next) : null;

            this.snapshotClef = cursor$.staff.attributes.clef;
            if (clefVisible) {
                let {clef} = cursor$.staff.attributes;
                this.x$ += IAttributes.CLEF_INDENTATION;
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
                    if (IChord.hasAccidental(chord, cursor$)) {
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

                this.clefSpacing = IAttributes.clefWidth(model._snapshot, this.staffIdx) +
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
                    if (IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 25;
                    } else {
                        contextualSpacing$ = 15;
                    }
                } else {
                    contextualSpacing$ = 10;
                }

                this.ksSpacing = contextualSpacing$ + IAttributes.keyWidth(model._snapshot, 0);
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
                    if (IChord.hasAccidental(chord, cursor$)) {
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

                this.tsSpacing = contextualSpacing$ + IAttributes.timeWidth(model._snapshot, 0);
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

        mergePolicy: IModel.HMergePolicy;
        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
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

    Layout.prototype.mergePolicy = IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = IModel.Type.Attributes;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Attributes in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Attributes] = AttributesModel;
}

module Export {
    export interface IAttributesModel extends Attributes, IModel {
    }
    export interface ILayout extends IModel.ILayout {
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
        let warningLayout = <ILayout> new AttributesModel.Layout(<any> nextAttributes, cursor$);
        cursor$.staff.attributes = oldAttributes;
        return warningLayout;
    }
}

export default Export;
