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

import Engine           = require("./engine");

class BeamGroupModel implements Export.IBeamGroupModel {

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
        // mutates cursor$ as required.
        return new BeamGroup.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.BeamGroup -------------------------------------------------------------*/

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor() {
        // TODO
    }

    toXML(): string {
        return "<!-- BeamGroup -->\n";
    }

    inspect() {
        return this.toXML();
    }
}

BeamGroupModel.prototype.divCount = 0;
BeamGroupModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module BeamGroup {
    export class Layout implements Export.ILayout {
        constructor(model: BeamGroupModel, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            /*---- Geometry ---------------------------------------*/

            // cursor$.x$ += 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: BeamGroupModel;
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
    Layout.prototype.renderClass = Engine.IModel.Type.BeamGroup;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers BeamGroup in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.BeamGroup] = BeamGroup;
}

module Export {
    export interface IBeamGroupModel extends Engine.IModel {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: IBeamGroupModel;
    }
}

export = Export;
