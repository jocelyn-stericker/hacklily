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

import Engine           = require("./engine");
import Fonts            = require("./fonts");

class DirectionModel implements Export.IDirectionModel {

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
        // todo
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        return new DirectionModel.Layout(this, cursor$);
    }

    /*---- I.2 MusicXML.Direction ---------------------------------------------------------------*/

    directionTypes:     MusicXML.DirectionType[];
    staff:              number;
    offset:             MusicXML.Offset;
    sound:              MusicXML.Sound;

    /*---- I.2.1 MusicXML.Placement -------------------------------------------------------------*/

    placement:          MusicXML.AboveBelow;

    /*---- I.2.2 MusicXML.EditorialVoice --------------------------------------------------------*/

    voice:              number;
    footnote:           MusicXML.Footnote;
    level:              MusicXML.Level;

    /*---- I.2.3 MusicXML.Directive -------------------------------------------------------------*/

    data:               string;

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
DirectionModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module DirectionModel {
    export class Layout implements Export.ILayout {
        constructor(model: DirectionModel, cursor$: Engine.ICursor) {
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
                    type.words[idx] = Object.create(origModel);
                    type.words[idx].fontSize = type.words[idx].fontSize || "18";
                    type.words[idx].defaultX = 0;
                    type.words[idx].defaultY = defaultY;
                    // TODO support more than just Alegreya and Alegreya Bold!
                    let fontBox = Fonts.getTextBB(type.words[idx].fontWeight === MusicXML.NormalBold.Normal ?
                        "Alegreya" : "Alegreya Bold", type.words[idx].data, parseInt(type.words[idx].fontSize, 10));
                    const scale40 = cursor$.header.defaults.scaling.millimeters / cursor$.header.defaults.scaling.tenths * 40;
                    let boundingBox: Engine.IModel.IBoundingRect = <any> type.words[idx];

                    // Vertical coordinates are flipped (argh!)
                    boundingBox.top = -Engine.RenderUtil.mmToTenths(scale40, fontBox.bottom/Engine.RenderUtil.ptPerMM)*1.1;
                    boundingBox.bottom = -Engine.RenderUtil.mmToTenths(scale40, fontBox.top/Engine.RenderUtil.ptPerMM)*1.1;

                    boundingBox.left = Engine.RenderUtil.mmToTenths(scale40, fontBox.left/Engine.RenderUtil.ptPerMM)*1.1;
                    boundingBox.right = Engine.RenderUtil.mmToTenths(scale40, fontBox.right/Engine.RenderUtil.ptPerMM)*1.1;
                    this.boundingBoxes$.push(boundingBox);
                });
                if (type.dynamics) {
                    let origDynamics = type.dynamics;
                    type.dynamics = Object.create(origDynamics);
                    type.dynamics.defaultX = 0;
                    type.dynamics.defaultY = defaultY;
                    let boundingBox: Engine.IModel.IBoundingRect = <any> type.dynamics;
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

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        renderClass: Engine.IModel.Type;
        expandPolicy: Engine.IModel.ExpandPolicy;
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = Engine.IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = Engine.IModel.Type.Direction;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Direction] = DirectionModel;
}

module Export {
    export interface IDirectionModel extends Engine.IModel, MusicXML.Direction {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: IDirectionModel;
    }
}

export = Export;
