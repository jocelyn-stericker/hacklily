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
                default:
                    defaultY = 70;
                    break;
            }

            _.forEach(model.directionTypes, (type, idx) => {
                model.directionTypes[idx] = Object.create(model.directionTypes[idx]);
                _.forEach(type.words, (word, idx) => {
                    let origModel = type.words[idx];
                    type.words[idx] = Object.create(origModel, this._createPositionDescriptor(origModel, defaultY));
                    type.words[idx].fontSize = type.words[idx].fontSize || "24";
                });
                if (type.dynamics) {
                    let origDynamics = type.dynamics;
                    type.dynamics = Object.create(origDynamics, this._createPositionDescriptor(origDynamics, defaultY));
                }
            });
        }

        private _createPositionDescriptor(origModel: MusicXML.Position, defaultY: number): PropertyDescriptorMap {
            return {
                defaultX: {
                    get: () => {
                        throw new Error("Please use barX instead");
                    }
                },
                defaultY: {
                    get: () => {
                        return isNaN(origModel.defaultY) ? defaultY : origModel.defaultY;
                    }
                },
            }
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
