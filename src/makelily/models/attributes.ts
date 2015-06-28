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

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import {IAttributes, IChord, ICursor, IModel, IPart, ISegment} from "../engine";

interface IClef extends MusicXML.Clef {
    __inherited__?: boolean;
}

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

    validate$(cursor$: ICursor): void {
        this._measure = cursor$.measure.idx;
        this._parent = <any> cursor$.staff.attributes[cursor$.segment.part];

        for (let a = this._parent; !!a; a = a._parent) {
            invariant(a !== this, "Internal error. " +
                "AttributesModel.validate$() must not be called in a context with " +
                "itself as an ancestor.");
        }

        if (!this.divisions) {
            this.divisions = 1;
        }

        cursor$.staff.attributes = _.clone(cursor$.staff.attributes);
        cursor$.staff.attributes[cursor$.segment.part] = this;

        // Defaults

        this._validateClef$(cursor$);
        this._validateTime$();
        this._validateKey$();
        this._validateStaves$(cursor$);
        this._validateStaffDetails$();

        this._setTotalDivisions(cursor$);
        this._validateMeasureStyles(cursor$);
    }

    layout(cursor$: ICursor): Export.ILayout {
        cursor$.staff.attributes = cursor$.staff.attributes ? _.clone(cursor$.staff.attributes) : {};
        cursor$.staff.attributes[cursor$.segment.part] = this;

        this._setTotalDivisions(cursor$);
        this._validateMeasureStyles(cursor$);

        // mutates cursor$ as required.
        return new AttributesModel.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.Attributes ------------------------------------------------------------*/

    _parent: AttributesModel;

    _divisions: number;
    get divisions() {
        return this._divisions === undefined && this._parent ?
            this._parent.divisions :
            this._divisions;
    }
    set divisions (m: number) {
        this._divisions = m;
    }

    _partSymbol: MusicXML.PartSymbol;
    get partSymbol() {
        return this._partSymbol === undefined && this._parent ?
            this._parent.partSymbol :
            this._partSymbol;
    }
    set partSymbol (m: MusicXML.PartSymbol) {
        this._partSymbol = m;
    }

    _measureStyles: MusicXML.MeasureStyle[];
    get measureStyles() {
        return this._measureStyles === undefined && this._parent ?
            this._parent._measureStyles :
            this._measureStyles;
    }
    set measureStyles (m: MusicXML.MeasureStyle[]) {
        this._measureStyles = m;
    }

    satieMeasureStyle: MusicXML.MeasureStyle;

    _staffDetails: MusicXML.StaffDetails[];
    get staffDetails() {
        return this._staffDetails === undefined && this._parent ?
            this._parent.staffDetails :
            this._staffDetails;
    }
    set staffDetails (m: MusicXML.StaffDetails[]) {
        this._staffDetails = m;
    }

    _transposes: MusicXML.Transpose[];
    get transposes() {
        return this._transposes === undefined && this._parent ?
            this._parent.transposes :
            this._transposes;
    }
    set transposes (m: MusicXML.Transpose[]) {
        this._transposes = m;
    }

    _staves: number;
    get staves() {
        return this._staves === undefined && this._parent ?
            this._parent.staves :
            this._staves;
    }
    set staves (m: number) {
        this._staves = m;
    }

    _instruments: string;
    get instruments() {
        return this._instruments === undefined && this._parent ?
            this._parent.instruments :
            this._instruments;
    }
    set instruments (m: string) {
        this._instruments = m;
    }

    _directives: MusicXML.Directive[];
    get directives() {
        return this._directives === undefined && this._parent ?
            this._parent.directives :
            this._directives;
    }
    set directives (m: MusicXML.Directive[]) {
        this._directives = m;
    }

    _clefs: IClef[];
    get clefs(): MusicXML.Clef[] {
        return this._clefs === undefined && this._parent ?
            this._parent.clefs :
            this._clefs;
    }
    set clefs (m: MusicXML.Clef[]) {
        this._clefs = m;
    }

    _times: MusicXML.Time[];
    get times() {
        return this._times === undefined && this._parent ?
            this._parent.times :
            this._times;
    }
    set times (m: MusicXML.Time[]) {
        this._times = m;
    }

    _keySignatures: MusicXML.Key[];
    get keySignatures() {
        return this._keySignatures === undefined && this._parent ?
            this._parent.keySignatures :
            this._keySignatures;
    }
    set keySignatures (m: MusicXML.Key[]) {
        this._keySignatures = m;
    }

    /*---- I.3 C.MusicXML.Editorial -------------------------------------------------------------*/

    footnote: MusicXML.Footnote;
    level: MusicXML.Level;

    /*---- I.4 Satie Ext ------------------------------------------------------------------------*/

    _measure: number;
    get multipleRestMeasureStyle(): MusicXML.MultipleRest {
        let multipleRest = _.find(this._measureStyles, style => style.multipleRest);
        return !multipleRest && this._parent ?
            this._parent.multipleRestMeasureStyle :
            (multipleRest ? multipleRest.multipleRest : null);
    }
    get measureStyleStartMeasure(): number {
        return !_.find(this._measureStyles, style => style.multipleRest) && this._parent ?
            this._parent.measureStyleStartMeasure :
            this._measure;
    }

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(spec: MusicXML.Attributes) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        let copy = Object.create(this);
        copy.measureStyles = this._measureStyles;
        return MusicXML.serialize.attributes(copy);
    }

    inspect() {
        return this.toXML();
    }

    private _validateClef$(cursor$: ICursor) {
        const staffIdx = cursor$.staff.idx;

        // clefs must be an array
        if (!this._clefs) {
            this._clefs = [];
        }

        // Remove clefs copied from parents
        _.forEach(this._clefs, (clef, idx) => {
            if (clef && (<any>clef).__inherited__) {
                delete this._clefs[idx];
            }
        });

        // Fix the clef sorting
        let previousClefs = this._parent && this._parent.clefs || [];
        _.forEach(this._clefs.slice(), (clef, idx) => {
            if (!clef) {
                return;
            }
            clef.number = clef.number || idx + 1;
            this._clefs[clef.number] = clef;
        });
        _.forEach(previousClefs, clef => {
            if (!clef) {
                return;
            }
            if (!this._clefs[clef.number]) {
                this._clefs[clef.number] = Object.create(previousClefs[clef.number]);
                (<any>this._clefs[clef.number]).__inherited__ = true;
            }
        });

        // A clef is mandatory (we haven't implemented clef-less staves yet)
        if (!this.clefs[staffIdx]) {
            this.clefs[staffIdx] = {
                sign: "G",
                line: 2,
                clefOctaveChange: null,
                number: staffIdx
            };
        }

        let clef = this.clefs[staffIdx];

        // Clef signs are normalized to be uppercase.
        if (clef) {
            clef.sign = clef.sign.toUpperCase();
        }

        // Clef lines can be inferred.
        if (isNaN(clef.line)) {
            clef.line = (
                    _.find(IAttributes.Clef.standardClefs,
                        stdClef => clef.sign.toUpperCase() === stdClef.sign.toUpperCase()) ||
                    { line: 2 } // fallback on treble clef
                ).line;
        }

        if (IAttributes.clefsEqual(this._parent, this, staffIdx)) {
            this._clefs[staffIdx] = Object.create(this._clefs[staffIdx]);
            (<any>this._clefs[staffIdx]).__inherited__ = true;
            delete this._clefs;
        }
    }
    private _validateTime$() {
        if (!this.times) {
            // A time signature is mandatory.

            this.times = <MusicXML.Time[]> [{
                beats: ["4"],
                beatTypes: [4],
                symbol: MusicXML.TimeSymbolType.Common,
                senzaMisura: null
            }];
        } else if (!!this._times && this._times.length) {
            _.forEach(this.times[0].beats, function(beat) {
                invariant(typeof beat === "string", "Attributes validation error: beats must " +
                    "be strings, but %s is not a string", beat);
            });
            if (IAttributes.timesEqual(this._parent, this, 0)) {
                delete this._times;
            }
        }
    }

    private _validateKey$() {
        if (!this.keySignatures || !this.keySignatures.length) {
            // A key signature is mandatory.

            this.keySignatures = [{
                fifths: 0,
                keySteps: null,
                keyAccidentals: null,
                keyAlters: null
            }];
        } else if (!!this._keySignatures && this._keySignatures.length) {
            if (IAttributes.keysEqual(this._parent, this, 0)) {
                delete this._keySignatures;
            }
        }

        let ks = this.keySignatures[0];
        if (ks.keySteps || ks.keyAlters || ks.keyOctaves) {
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
                let keyOctaves: MusicXML.KeyOctave[] = [];
                _.forEach(ks.keyOctaves, octave => {
                   keyOctaves[octave.number - 1] = octave;
                });
                ks.keyOctaves = keyOctaves;
            }
        }
    }

    private _validateStaffDetails$() {
        // Fix the staff details sorting
        let newStaffDetails: MusicXML.StaffDetails[] = [];
        let previousStaffDetails = this._parent && this._parent.staffDetails || [];
        _.forEach(this._staffDetails, (staff, idx) => {
            if (!staff) {
                return;
            }
            staff.number = staff.number || 1;
            newStaffDetails[staff.number] = staff;
        });

        // Staff details are required. Staff lines are required
        _.times(this.staves, staffIndexMinusOne => {
            let staffIndex = staffIndexMinusOne + 1;
            if (!newStaffDetails[staffIndex]) {
                if (previousStaffDetails[staffIndex]) {
                    // TODO: __inherit__ from parent?
                    newStaffDetails[staffIndex] = Object.create(previousStaffDetails[staffIndex]);
                } else {
                    newStaffDetails[staffIndex] = {
                        number: staffIndex
                    };
                }
            }
            if (!newStaffDetails[staffIndex].staffLines) {
                newStaffDetails[staffIndex].staffLines = 5;
            }
        });
        this._staffDetails = newStaffDetails;
    }

    private _validateStaves$(cursor$: ICursor) {
        this.staves = this.staves || 1;
        let currentPartId = cursor$.segment.part;
        let currentPart = cursor$.measure.parent.parts[currentPartId];
        _.times(this.staves, staffMinusOne => {
            let staff = staffMinusOne + 1;
            if (!currentPart.staves[staff]) {
                throw new Error("A staff is missing. The code to add it is not implemented.");
            }
        });
        if (this.staves > 1 && !this.partSymbol) {
            this.partSymbol = {
                bottomStaff: 1,
                topStaff: this.staves,
                type: MusicXML.PartSymbolType.Brace,
            };
        }

        // HACK: Convert part group symbols to part symbols.
        // Obviously, this won't fly when we have multiple part groups
        let groups = IPart.groupsForPart(cursor$.header.partList, cursor$.segment.part);
        if (groups.length && !this.partSymbol) {
            this.partSymbol = {
                bottomStaff: 1,
                topStaff: 1,
                type: MusicXML.PartSymbolType.Bracket,
            };
        }
    }

    _setTotalDivisions(cursor$: ICursor): void {
        cursor$.staff.totalDivisions = IChord.barDivisions(this);
    }

    private _validateMeasureStyles(cursor$: ICursor): void {
        let multipleRestStyleIdx = _.findIndex(this.measureStyles, style => style.multipleRest);
        if (this.multipleRestMeasureStyle) {
            let multipleRestCount = this.multipleRestMeasureStyle.count;
            let measuresAfterStyleChange = this._measure - this.measureStyleStartMeasure;
            if (multipleRestCount < 2) {
                this.measureStyles.splice(multipleRestStyleIdx, 1);
            } else {
                if (multipleRestCount > measuresAfterStyleChange) {
                    cursor$.staff.hiddenMeasuresRemaining =
                        multipleRestCount - measuresAfterStyleChange;
                }
            }
        }
        this.satieMeasureStyle = {};
        _.forEach(this.measureStyles, measureStyle => {
            if (measureStyle.slash) {
                if (measureStyle.slash.type === MusicXML.StartStop.Stop) {
                    this.satieMeasureStyle.slash = null;
                } else {
                    this.satieMeasureStyle.slash = measureStyle.slash;
                }
            }
        });
        let multipleRestDefinedHere = !!_.find(this._measureStyles,
            measureStyle => measureStyle.multipleRest);
        if (multipleRestDefinedHere) {
            this.satieMeasureStyle.multipleRest = this.multipleRestMeasureStyle;
        } else {
            this.satieMeasureStyle.multipleRest = null;
        }
    }

    shouldRenderClef(owner: number, isFirstInLine: boolean) {
        if (isFirstInLine) {
            return true;
        }

        if (!this._clefs) {
            return false;
        }

        if (!this._clefs[owner]) {
            return false;
        }

        if (this._clefs[owner].__inherited__) {
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

            let model = Object.create(cursor$.factory.identity(origModel));
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
            this.staffIdx = cursor$.staff.idx;

            let isFirstInLine = cursor$.line && cursor$.line.barOnLine$ === 0 && !this.division;
            let next = ICursor.next(cursor$);
            let nextIsNote = cursor$.factory.modelHasType(next, IModel.Type.Chord);
            let parent = this.model._parent;

            let keySignatures = model._keySignatures;
            this.ksVisible = keySignatures && !!keySignatures.length || isFirstInLine;

            this.tsVisible = !!model._times && !!model._times.length; // TODO: || isFirstInPage;

            this.clefVisible = model.shouldRenderClef(cursor$.segment.owner, isFirstInLine);
            this.partSymbolVisible = isFirstInLine && this.model.partSymbol &&
                this.model.partSymbol.bottomStaff === cursor$.staff.idx;

            // Measure number
            if (!cursor$.measure.implicit && parseInt(cursor$.measure.number, 10) !== 1) {
                let measureNumbering = cursor$.print$ ?
                    cursor$.print$.measureNumbering.data : "system";

                let firstInMeasure = !parent || parent._measure !== this.model._measure;

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

            if (this.clefVisible) {
                this.x$ += IAttributes.CLEF_INDENTATION;
                cursor$.x$ = this.x$;

                let contextualSpacing$ = 0;
                model._clefs = Object.create(model.clefs);
                invariant(model.clefs[this.staffIdx], "Clef must be defined if visible.");
                model._clefs[this.staffIdx] = Object.create(model.clefs[this.staffIdx], {
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
                model._clefs[this.staffIdx].defaultY = model._clefs[this.staffIdx].defaultY || 0;
                model._clefs[this.staffIdx].size =
                    isFirstInLine ? MusicXML.SymbolSize.Full : MusicXML.SymbolSize.Cue;

                if (nextIsNote && !this.ksVisible && !this.tsVisible) {
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

                this.clefSpacing = IAttributes.clefWidth(model, this.staffIdx) +
                    contextualSpacing$;
            } else {
                this.clefSpacing = 0;
            }

            /*---- KS layout --------------------------------------*/

            if (this.ksVisible) {
                let contextualSpacing$ = 0;
                model._keySignatures = Object.create(model.keySignatures);
                model._keySignatures[0] = Object.create(model.keySignatures[0], {
                    defaultX: {
                        get: () => {
                            return this.overrideX + this.clefSpacing;
                        }
                    }
                });
                model._keySignatures[0].defaultY = 0;
                if (nextIsNote && !this.tsVisible) {
                    if (IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 25;
                    } else {
                        contextualSpacing$ = 15;
                    }
                } else {
                    contextualSpacing$ = 10;
                }

                this.ksSpacing = contextualSpacing$ + IAttributes.keyWidth(model, 0);
            } else {
                this.ksSpacing = 0;
            }

            /*---- TS layout --------------------------------------*/

            if (this.tsVisible) {
                let contextualSpacing$ = 0;
                model._times = Object.create(model.times);
                model._times[0] = Object.create(model.times[0], {
                    defaultX: {
                        get: () => {
                            return this.overrideX + this.clefSpacing + this.ksSpacing;
                        }
                    }
                });
                model._times[0].defaultY = 0;
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

                this.tsSpacing = contextualSpacing$ + IAttributes.timeWidth(model, 0);
            } else {
                this.tsSpacing = 0;
            }

            /*---- Part symbol ------------------------------------*/

            if (this.partSymbolVisible) {
                model._partSymbol = Object.create(model.partSymbol, {
                    defaultX: {
                        get: () => {
                            return 0;
                        }
                    }
                });
            }

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

        clefVisible: boolean;
        clefSpacing: number;

        tsVisible: boolean;
        tsSpacing: number;

        ksVisible: boolean;
        ksSpacing: number;

        /** undefined if no measure number should be displayed.  */
        measureNumberVisible: string;

        partSymbolVisible: boolean;
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
    export interface IAttributesModel extends IModel, IAttributes.IAttributesExt {
    }

    export interface ILayout extends IModel.ILayout {
        model: IAttributesModel;

        clefVisible: boolean;
        clefSpacing: number;

        tsVisible: boolean;
        tsSpacing: number;

        ksVisible: boolean;
        ksSpacing: number;

        measureNumberVisible: string;

        partSymbolVisible: boolean;

        staffIdx: number;
    }

    export function createWarningLayout$(
            cursor$: ICursor, nextAttributes: MusicXML.Attributes) {
        return <ILayout> new AttributesModel.Layout(<any> nextAttributes, cursor$);
    }
}

export default Export;
