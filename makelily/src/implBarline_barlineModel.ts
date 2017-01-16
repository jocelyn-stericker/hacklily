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

import {Barline, Segno, Coda, BarlineLocation, WavyLine, Fermata, BarStyle, Ending, Repeat,
    Footnote, Level, BarStyleType, PartGroup, PartSymbol,
    serializeBarline} from "musicxml-interfaces";
import {buildBarStyle} from "musicxml-interfaces/builders";
import {some, forEach, last} from "lodash";
import * as invariant from "invariant";

import {IModel} from "./document_model";
import Type from "./document_types";

import {ICursor} from "./private_cursor";
import {IBoundingRect} from "./private_boundingRect";
import {ILayout} from "./document_model";
import {groupsForPart} from "./private_part";
import {bravura} from "./private_smufl";

import Attributes from "./implAttributes_attributesModel";
import {needsWarning, clefsEqual, CLEF_INDENTATION} from "./implAttributes_attributesData";

class BarlineModel implements Export.IBarlineModel {
    _class = "Barline";

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** defined externally */
    staffIdx: number;

    /*---- I.2 Barline --------------------------------------------------------------------------*/

    segno: Segno;
    coda: Coda;
    location: BarlineLocation;
    codaAttrib: string;
    wavyLine: WavyLine;
    fermatas: Fermata[];
    segnoAttrib: string;
    divisions: number;
    barStyle: BarStyle;
    ending: Ending;
    repeat: Repeat;

    /*---- I.3 Editorial ------------------------------------------------------------------------*/

    footnote: Footnote;
    level: Level;

    /*---- II. BarlineModel (extension) ---------------------------------------------------------*/

    defaultX: number;
    defaultY: number;
    satieAttributes: Attributes.IAttributesLayout;
    satieAttribsOffset: number;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(spec: Barline) {
        forEach<any>(spec, (value, key) => {
            (this as any)[key] = value;
        });
    }

    toJSON() {
        let {_class, segno, coda, location, codaAttrib,
            wavyLine, fermatas, segnoAttrib, divisions,
            barStyle, ending, repeat, footnote} = this;
        return {_class, segno, coda, location, codaAttrib,
            wavyLine, fermatas, segnoAttrib, divisions,
            barStyle, ending, repeat, footnote};
    }

    validate(cursor$: ICursor): void {
        if (!this.barStyle) {
            cursor$.patch(staff => staff
                .barline(barline => barline
                    .barStyle(buildBarStyle(barStyle => barStyle
                        .data(BarStyleType.Regular)
                        .color("black")
                    ))
                )
            );
        }
        let divsToAdvance = cursor$.staff.totalDivisions - cursor$.division$;
        if (divsToAdvance > 0) {
            cursor$.advance(divsToAdvance);
        }
        if (!isFinite(this.barStyle.data) || this.barStyle.data === null) {
            let lastBarlineInSegment = !some(cursor$.segment.slice(cursor$.idx$ + 1),
                    model => cursor$.factory.modelHasType(model, Type.Barline));
            let isLast = cursor$.measure.uuid === last(cursor$.document.measures).uuid &&
                    lastBarlineInSegment;

            cursor$.patch(staff => staff
                .barline(barline => barline
                    .barStyle({
                        data: isLast ? BarStyleType.LightHeavy : BarStyleType.Regular,
                    })
                )
            );
        }
        if (!this.barStyle.color) {
            cursor$.patch(staff => staff
                .barline(barline => barline
                    .barStyle(barStyle => barStyle
                        .color("black")
                    )
                )
            );
        }
    }

    getLayout(cursor$: ICursor): Export.IBarlineLayout {
        // mutates cursor$ as required.
        return new BarlineModel.Layout(this, cursor$);
    }

    toXML(): string {
        return `${serializeBarline(this)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    inspect() {
        return this.toXML();
    }
}

BarlineModel.prototype.divCount = 0;

module BarlineModel {
    export class Layout implements Export.IBarlineLayout {
        constructor(origModel: BarlineModel, cursor$: ICursor) {
            this.division = cursor$.division$;
            this.x$ = cursor$.x$;
            let {attributes} = cursor$.staff;
            let {measureStyle, partSymbol} = attributes;
            if (measureStyle.multipleRest && measureStyle.multipleRest.count > 1) {
                // TODO: removing this shows that measures are slightly misplaced
                return;
            }

            this.partGroups = groupsForPart(cursor$.header.partList, cursor$.segment.part);
            this.partSymbol = partSymbol;

            this.model = Object.create(origModel, {
                defaultX: {
                    get: () => this.overrideX
                }
            });

            let clefOffset = 0;

            if (!cursor$.approximate && cursor$.line.barsOnLine === cursor$.line.barOnLine$ + 1) {
                // TODO: Figure out a way to get this to work when the attributes on the next
                // line change
                let nextMeasure = cursor$.document.measures[cursor$.measure.idx + 1];
                let part = nextMeasure && nextMeasure.parts[cursor$.segment.part];
                let segment = part && part.staves[cursor$.staff.idx];
                let nextAttributes: IModel;
                if (segment) {
                    nextAttributes = cursor$.factory.search(segment, 0, Type.Attributes)[0];
                }
                let addWarning = nextAttributes && needsWarning(
                    attributes, (<any>nextAttributes)._snapshot, cursor$.staff.idx);

                if (addWarning) {
                    let clefsAreEqual = clefsEqual(
                        attributes, (<any>nextAttributes)._snapshot, cursor$.staff.idx);
                    clefOffset = clefsAreEqual ? 0 : CLEF_INDENTATION;
                    let warningLayout = Attributes.createWarningLayout$(cursor$, nextAttributes);
                    this.model.satieAttributes = warningLayout;
                }
            }

            this.model.defaultY = 0;

            this.yOffset = 0;   // TODO
            this.height = 20;   // TODO

            /*---- Geometry ---------------------------------------*/

            const lineWidths = cursor$.header.defaults.appearance.lineWidths;

            const barlineSep = bravura.engravingDefaults.barlineSeparation;

            let setLines$ = (lines: string[]) => {
                let x = 0;
                this.lineStarts = [];
                this.lineWidths = [];
                forEach(lines, (line, idx) => {
                    if (idx > 0) {
                        x += barlineSep * 10;
                    }
                    this.lineStarts.push(x);
                    const width = lineWidths[line].tenths;
                    this.lineWidths.push(width);
                    x += width;
                });
                this.model.satieAttribsOffset = x + 8 + clefOffset;
                cursor$.x$ += x;
            };

            switch (this.model.barStyle.data) {
                case BarStyleType.LightHeavy:
                    setLines$(["light barline", "heavy barline"]);
                    break;
                case BarStyleType.LightLight:
                    setLines$(["light barline", "light barline"]);
                    break;
                case BarStyleType.HeavyHeavy:
                    setLines$(["heavy barline", "heavy barline"]);
                    break;
                case BarStyleType.HeavyLight:
                    setLines$(["heavy barline", "light barline"]);
                    break;
                case BarStyleType.Regular:
                case BarStyleType.Dashed:
                case BarStyleType.Dotted:
                case BarStyleType.Short:
                case BarStyleType.Tick:
                    setLines$(["light barline"]);
                    break;
                case BarStyleType.Heavy:
                    setLines$(["heavy barline"]);
                    break;
                case BarStyleType.None:
                    setLines$([]);
                    break;
                default:
                    invariant(false, "Not implemented");
            }

            this.renderedWidth = cursor$.x$ - this.x$ + 8;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: BarlineModel;
        x$: number;
        division: number;
        height: number;
        yOffset: number;
        renderedWidth: number;

        /**
         * Set by layout engine.
         */
        overrideX: number;

        // Prototype:

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";

        /*---- Extensions ---------------------------------------------------*/

        lineStarts: number[];
        lineWidths: number[];

        partGroups: PartGroup[];
        partSymbol: PartSymbol;
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Barline;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Barline in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.Barline] = BarlineModel;
}

module Export {
    export interface IBarlineModel extends IModel, Barline {
        divisions: number;
        defaultX: number;
        defaultY: number;
        satieAttributes: Attributes.IAttributesLayout;
        satieAttribsOffset: number;
    }

    export interface IBarlineLayout extends ILayout {
        model: IBarlineModel;
        height: number;
        yOffset: number;

        lineStarts: number[];
        lineWidths: number[];

        partSymbol: PartSymbol;
        partGroups: PartGroup[];
    }
}

export default Export;
