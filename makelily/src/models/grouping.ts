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

class GroupingModel implements Export.IGroupingModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    get fields() {
        return [
            "features",
            "number",
            "type",
            "memberOf"
        ];
    }

    modelDidLoad$(segment$: Engine.Measure.ISegmentRef): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        // todo
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        // todo

        return new GroupingModel.Layout(this, cursor$);
    }

    /*---- I.2 MusicXML.Grouping ----------------------------------------------------------------*/

    features:       MusicXML.Feature[];
    number:         number;
    type:           MusicXML.StartStopSingle;
    memberOf:       string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: MusicXML.Grouping) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.groupingToXML(this);
    }

    inspect() {
        return this.toXML();
    }
}

GroupingModel.prototype.divCount = 0;
GroupingModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module GroupingModel {
    export class Layout implements Export.ILayout {
        constructor(model: GroupingModel, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: GroupingModel;
        x$: number;
        division: number;

        // Prototype:

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        priority: Engine.IModel.Type;
        expandable: boolean;
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandable = false;
    Layout.prototype.priority = Engine.IModel.Type.Grouping;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function deepAssign<T>(a: T, b: T):T {
    if (a instanceof Array || b instanceof Array) {
        var retArr: any[] = [];
        var aArr:   any[] = (<any>a);
        var bArr:   any[] = (<any>b);
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        var ret: T = a ? Engine.Util.cloneObject(a) : (<T>{});
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                (<any>ret)[key] = deepAssign((<any>ret)[key], (<any>b)[key]);
            }
        }
        return ret;
    } else {
        return (a === undefined) ? b : a;
    }
}

/**
 * Registers Grouping in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Grouping] = GroupingModel;
}

module Export {
    export interface IGroupingModel extends Engine.IModel, MusicXML.Grouping {
    }

    export interface ILayout extends Engine.IModel.ILayout {
    }
}

export = Export;
