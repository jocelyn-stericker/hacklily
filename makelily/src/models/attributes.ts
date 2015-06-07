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

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("./engine");

const CLEF_INDENTATION = 7; // Gould(6): "A clef is indented into the stave by one stave-space or a little less"

class AttributesModel implements Export.IAttributesModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        this._measure           = cursor$.measure.idx;
        this._parent            = <any> cursor$.staff.attributes;

        for (let a = this._parent; !!a; a = a._parent) {
            invariant(a !== this, "Internal error. " +
                "AttributesModel.validate$() must not be called in a context with " +
                "itself as an ancestor.");
        }

        if (!this.divisions) {
            this.divisions = 1;
        }

        cursor$.staff.attributes = this;

        // Defaults

        this._validateClef$(cursor$);
        this._validateTime$();
        this._validateKey$();
        this._validateStaves$(cursor$);

        this._setTotalDivisions(cursor$);
        this._updateMultiRest(cursor$);
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        cursor$.staff.attributes = this;

        this._setTotalDivisions(cursor$);
        this._updateMultiRest(cursor$);

        // mutates cursor$ as required.
        return new AttributesModel.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.Attributes ------------------------------------------------------------*/

    _parent:            AttributesModel;

    _divisions:         number;
    get divisions()     { return this._divisions === undefined && this._parent ? this._parent.divisions : this._divisions; }
    set divisions       (m: number) { this._divisions = m; }

    _partSymbol:        MusicXML.PartSymbol;
    get partSymbol()    { return this._partSymbol === undefined && this._parent ? this._parent.partSymbol : this._partSymbol; }
    set partSymbol      (m: MusicXML.PartSymbol) { this._partSymbol = m; }

    _measureStyle:      MusicXML.MeasureStyle;
    get measureStyle()  { return this._measureStyle; }
    set measureStyle    (m: MusicXML.MeasureStyle) { this._measureStyle = m; }

    _staffDetails:      MusicXML.StaffDetails[];
    get staffDetails()  { return this._staffDetails === undefined && this._parent ? this._parent.staffDetails : this._staffDetails; }
    set staffDetails    (m: MusicXML.StaffDetails[]) { this._staffDetails = m; }

    _transposes:        MusicXML.Transpose[];
    get transposes()    { return this._transposes === undefined && this._parent ? this._parent.transposes : this._transposes; }
    set transposes      (m: MusicXML.Transpose[]) { this._transposes = m; }

    _staves:            number;
    get staves()        { return this._staves === undefined && this._parent ? this._parent.staves : this._staves; }
    set staves          (m: number) { this._staves = m; }

    _instruments:       string;
    get instruments()   { return this._instruments === undefined && this._parent ? this._parent.instruments : this._instruments; }
    set instruments     (m: string) { this._instruments = m; }

    _directives:        MusicXML.Directive[];
    get directives()    { return this._directives === undefined && this._parent ? this._parent.directives : this._directives; }
    set directives      (m: MusicXML.Directive[]) { this._directives = m; }

    _clefs:             MusicXML.Clef[];
    get clefs()         { return this._clefs === undefined && this._parent ? this._parent.clefs : this._clefs; }
    set clefs           (m: MusicXML.Clef[]) { this._clefs = m; }

    _times:             MusicXML.Time[];
    get times()         { return this._times === undefined && this._parent ? this._parent.times : this._times; }
    set times           (m: MusicXML.Time[]) { this._times = m; }

    _keySignatures:     MusicXML.Key[];
    get keySignatures() { return this._keySignatures === undefined && this._parent ? this._parent.keySignatures : this._keySignatures; }
    set keySignatures   (m: MusicXML.Key[]) { this._keySignatures = m; }

    /*---- I.3 C.MusicXML.Editorial -------------------------------------------------------------*/

    footnote:           MusicXML.Footnote;
    level:              MusicXML.Level;

    /*---- I.4 Satie Ext ------------------------------------------------------------------------*/

    _measure:           number;
    get oMeasureStyle(): MusicXML.MeasureStyle
                        { return this._measureStyle === undefined && this._parent ? this._parent.oMeasureStyle : this._measureStyle; }
    get mMeasureStyle(): number
                        { return this._measureStyle === undefined && this._parent ? this._parent.mMeasureStyle : this._measure; }

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(spec: MusicXML.Attributes) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.serialize.attributes(this);
    }

    inspect() {
        return this.toXML();
    }

    private _validateClef$(cursor$: Engine.ICursor) {
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
        this._clefs = this._clefs || [];
        let sClefs = this._clefs.slice();
        let pClefs = this._parent && this._parent.clefs || [];
        sClefs.length = Math.max(sClefs.length, pClefs.length);
        _.forEach(sClefs, (clef, idx) => {
            if (clef) {
                this.clefs[clef.number || idx + 1] = clef;
                this.clefs[clef.number || idx + 1].number = clef.number || idx + 1;
                sClefs[clef.number || idx + 1] = this.clefs[clef.number || idx + 1];
            }

            if (pClefs[idx] && !sClefs[idx - 1]) {
                this._clefs[idx] = Object.create(pClefs[idx]);
                (<any>this._clefs[idx]).__inherited__ = true;
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
                    _.find(Export.Clef.standardClefs,
                        stdClef => clef.sign.toUpperCase() === stdClef.sign.toUpperCase()) ||
                    { line: 2 } // fallback on treble clef
                ).line;
        }

        const parentClef = this._parent && this._parent.clefs && this._parent.clefs.length ?
            this._parent.clefs[staffIdx] : null;

        const thisClef = clef;
        if (parentClef && parentClef.sign === thisClef.sign && parentClef.line === thisClef.line &&
                parentClef.clefOctaveChange === thisClef.clefOctaveChange) {
            // Clef is redundant
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
            const parentTime = this._parent ? this._parent.times[0] : null;
            _.forEach(this.times[0].beats, function(beat) {
                invariant(typeof beat === "string", "Attributes validation error: beats must " +
                    "be strings, but %s is not a string", beat);
            });
            if (parentTime && JSON.stringify(this.times[0].beats) === JSON.stringify(parentTime.beats) &&
                    JSON.stringify(this.times[0].beatTypes) === JSON.stringify(parentTime.beatTypes) &&
                    !!this.times[0].senzaMisura === !!parentTime.senzaMisura &&
                    this.times[0].symbol === this.times[0].symbol) {
                // TS is redundant
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
            const parentKS = this._parent ? this._parent.keySignatures[0] : null;
            if (parentKS && this.keySignatures[0].fifths === parentKS.fifths &&
                    this.keySignatures[0].keySteps === parentKS.keySteps &&
                    this.keySignatures[0].keyAccidentals === parentKS.keyAccidentals &&
                    this.keySignatures[0].keyAlters === parentKS.keyAlters &&
                    this.keySignatures[0].mode === parentKS.mode) {
                // Key signature is redundant
                delete this._keySignatures;
            }
        }
    }

    private _validateStaves$(cursor$: Engine.ICursor) {
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
    }

    _setTotalDivisions(cursor$: Engine.ICursor): void {
        cursor$.staff.totalDivisions = Engine.IChord.barDivisions(this);
    }

    private _updateMultiRest(cursor$: Engine.ICursor): void {
        if (!this._measureStyle && this.oMeasureStyle &&
                this.oMeasureStyle.multipleRest &&
                this.oMeasureStyle.multipleRest.count > this._measure - this.mMeasureStyle) {
            cursor$.staff.multiRestRem = this.oMeasureStyle.multipleRest.count - (this._measure - this.mMeasureStyle);
        }
    }

    shouldRenderClef(owner: number, isFirstInLine: boolean) {
        return this._clefs && this._clefs[owner] && !(<any>this._clefs[owner]).__inherited__ || isFirstInLine;
    }
}

AttributesModel.prototype.divCount = 0;
AttributesModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module AttributesModel {
    export class Layout implements Export.ILayout {
        constructor(origModel: AttributesModel, cursor$: Engine.ICursor) {
            let model = Object.create(origModel);
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
            this.staffIdx = cursor$.staff.idx;

            const isFirstInLine = cursor$.line && cursor$.line.barOnLine$ === 0 && !this.division;
            const next = Engine.ICursor.next(cursor$);
            const nextIsNote = cursor$.factory.modelHasType(next, Engine.IModel.Type.Chord);

            this.ksVisible = !!model._keySignatures && !!model._keySignatures.length || isFirstInLine;
            this.tsVisible = !!model._times && !!model._times.length; // TODO: || isFirstInPage;
            this.clefVisible = model.shouldRenderClef(cursor$.segment.owner, isFirstInLine);
            this.partSymbolVisible = isFirstInLine && this.model.partSymbol &&
                this.model.partSymbol.bottomStaff === cursor$.staff.idx;

            // Measure number
            if (!cursor$.measure.implicit && parseInt(cursor$.measure.number, 10) !== 1) {
                let shouldShowNumber =
                    (isFirstInLine && (!cursor$.print$ || cursor$.print$.measureNumbering.data === "system")) ||
                    (this.division === 0 && cursor$.print$ &&
                        (!this.model._parent || this.model._parent._measure !== this.model._measure) &&
                        cursor$.print$.measureNumbering.data === "measure");

                if (shouldShowNumber) {
                    this.measureNumberVisible = cursor$.measure.number;
                }
            }

            /*---- Clef layout ------------------------------------*/

            const chord = nextIsNote ? Engine.IChord.fromModel(next) : null;

            if (this.clefVisible) {
                this.x$ += CLEF_INDENTATION;
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
                    if (Engine.IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 15;
                    } else {
                        contextualSpacing$ = 25;
                    }
                } else {
                    contextualSpacing$ = 12.5;
                }

                if (!isFirstInLine) {
                    this.clefSpacing = 4.2 + contextualSpacing$;
                } else {
                    this.clefSpacing = 24 + contextualSpacing$;
                }
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
                    if (Engine.IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 25;
                    } else {
                        contextualSpacing$ = 15;
                    }
                } else {
                    contextualSpacing$ = 10;
                }

                const keySignature = model.keySignatures[0];

                const fifths: number = Math.min(7, Math.abs(keySignature.fifths));
                if (fifths) {
                    this.ksSpacing = contextualSpacing$ + 10.4 * fifths;
                } else {
                    this.ksSpacing = contextualSpacing$ - 5;
                }
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
                    if (Engine.IChord.hasAccidental(chord, cursor$)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing$ = 25;
                    } else {
                        contextualSpacing$ = 15;
                    }
                } else {
                    contextualSpacing$ = 12.5;
                }

                if (origModel.times[0].beatTypes) {
                    let numeratorSegments = _.reduce(origModel.times[0].beats, (memo, beats) => memo + beats.split("+").length, 0);
                    this.tsSpacing = contextualSpacing$ + Export.NUMBER_SPACING*numeratorSegments +
                        (origModel.times[0].beatTypes.length - 1)*Export.PLUS_SPACING;
                } else {
                    this.tsSpacing = 0;
                }
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

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        renderClass: Engine.IModel.Type;
        expandPolicy: Engine.IModel.ExpandPolicy;

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

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = Engine.IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = Engine.IModel.Type.Attributes;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Attributes in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Attributes] = AttributesModel;
}

module Export {
    export interface IAttributesModel extends Engine.IModel, MusicXML.Attributes {
    }

    export interface ILayout extends Engine.IModel.ILayout {
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

    export module Clef {
        export const standardClefs: MusicXML.Clef[] = [
            {
                // Treble
                line:               2,
                sign:               "G",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:           16,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }, {
                // bass
                line:               4,
                sign:               "F",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:             4,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }, {
                // tenor
                line:               3,
                sign:               "C",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:             0,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }, {
                // alto
                line:               4,
                sign:               "C",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:           8,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            },
            {
                line:               3,
                sign:               "percussion",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:           8,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            },
            {
                line:               5,
                sign:               "tab",
                additional:         false,
                afterBarline:       false,
                clefOctaveChange:   null,
                color:              "#000000",
                defaultX:           -16,
                defaultY:           8,
                fontFamily:         "",
                fontSize:           "small",
                fontStyle:          0,
                fontWeight:         0,
                number:             1,
                printObject:        true,
                relativeX:          0,
                relativeY:          0,
                size:               1
            }
        ];
    }
    export const NUMBER_SPACING     = 28;
    export const PLUS_SPACING       = 12;
}

export = Export;
