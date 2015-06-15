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

import {ICursor, IModel, ISegment, RenderUtil} from "./../engine";
import {getTextBB} from "./fontManager";

class DirectionModel implements Export.IDirectionModel {

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
        // todo
    }

    layout(cursor$: ICursor): Export.ILayout {
        return new DirectionModel.Layout(this, cursor$);
    }

    /*---- I.2 MusicXML.Direction ---------------------------------------------------------------*/

    directionTypes: MusicXML.DirectionType[];
    staff: number;
    offset: MusicXML.Offset;
    sound: MusicXML.Sound;

    /*---- I.2.1 MusicXML.Placement -------------------------------------------------------------*/

    placement: MusicXML.AboveBelow;

    /*---- I.2.2 MusicXML.EditorialVoice --------------------------------------------------------*/

    voice: number;
    footnote: MusicXML.Footnote;
    level: MusicXML.Level;

    /*---- I.2.3 MusicXML.Directive -------------------------------------------------------------*/

    data: string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: MusicXML.Direction) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.serialize.direction(this);
    }

    inspect() {
        return this.toXML();
    }
}

DirectionModel.prototype.divCount = 0;
DirectionModel.prototype.frozenness = IModel.FrozenLevel.Warm;

module DirectionModel {
    export class Layout implements Export.ILayout {
        constructor(model: DirectionModel, cursor$: ICursor) {
            model = Object.create(model);

            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            let defaultY = 0;
            switch (model.placement) {
                case MusicXML.AboveBelow.Below:
                    defaultY = -60;
                    break;
                case MusicXML.AboveBelow.Above:
                case MusicXML.AboveBelow.Unspecified:
                    defaultY = 80;
                    break;
                default:
                    defaultY = 80;
                    break;
            }

            this.boundingBoxes$ = [];

            _.forEach(model.directionTypes, (type, idx) => {
                model.directionTypes[idx] = Object.create(model.directionTypes[idx]);
                _.forEach(type.words, (word, idx) => {
                    let origModel = type.words[idx];
                    let defaults = cursor$.header.defaults;
                    type.words[idx] = Object.create(origModel);
                    type.words[idx].fontSize = type.words[idx].fontSize || "18";
                    type.words[idx].defaultX = 0;
                    type.words[idx].defaultY = defaultY;
                    let fontBox = getTextBB(type.words[idx].fontFamily || "Alegreya",
                        type.words[idx].data,
                        parseInt(type.words[idx].fontSize, 10),
                        type.words[idx].fontWeight === MusicXML.NormalBold.Normal ? null : "bold");
                    const scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
                    let boundingBox: IModel.IBoundingRect = <any> type.words[idx];

                    // Vertical coordinates are flipped (argh!)
                    // We give 10% padding because elements touching isn't ideal.
                    boundingBox.top = -RenderUtil.mmToTenths(scale40,
                            fontBox.bottom/RenderUtil.ptPerMM)*1.1;
                    boundingBox.bottom = -RenderUtil.mmToTenths(scale40,
                            fontBox.top/RenderUtil.ptPerMM)*1.1;

                    boundingBox.left = RenderUtil.mmToTenths(scale40,
                            fontBox.left/RenderUtil.ptPerMM)*1.1;
                    boundingBox.right = RenderUtil.mmToTenths(scale40,
                            fontBox.right/RenderUtil.ptPerMM)*1.1;
                    this.boundingBoxes$.push(boundingBox);
                });
                if (type.dynamics) {
                    let origDynamics = type.dynamics;
                    type.dynamics = Object.create(origDynamics);
                    type.dynamics.defaultX = 0;
                    type.dynamics.defaultY = defaultY;
                    let boundingBox: IModel.IBoundingRect = <any> type.dynamics;
                    boundingBox.left = -10;
                    boundingBox.right = 30;
                    boundingBox.top = -10;
                    boundingBox.bottom = 30; // TODO
                    this.boundingBoxes$.push(boundingBox);
                }
            });
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: DirectionModel;
        x$: number;
        division: number;

        // Prototype:

        mergePolicy: IModel.HMergePolicy;
        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
    }

    Layout.prototype.mergePolicy = IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = IModel.Type.Direction;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Direction] = DirectionModel;
}

module Export {
    export interface IDirectionModel extends IModel, MusicXML.Direction {
    }

    export interface ILayout extends IModel.ILayout {
        model: IDirectionModel;
    }
}

export default Export;
