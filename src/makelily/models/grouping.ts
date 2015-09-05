/**
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

import {Feature, StartStopSingle, Grouping, serialize as serializeToXML} from "musicxml-interfaces";
import {forEach} from "lodash";

import {ICursor, IModel, ISegment} from "../engine";
import {cloneObject} from "../engine/util";

class GroupingModel implements Export.IGroupingModel {

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
        // todo

        return new GroupingModel.Layout(this, cursor$);
    }

    /*---- I.2 Grouping -------------------------------------------------------------------------*/

    features: Feature[];
    number: number;
    type: StartStopSingle;
    memberOf: string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: Grouping) {
        forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return serializeToXML.grouping(this);
    }

    inspect() {
        return this.toXML();
    }
}

GroupingModel.prototype.divCount = 0;
GroupingModel.prototype.frozenness = IModel.FrozenLevel.Warm;

module GroupingModel {
    export class Layout implements Export.ILayout {
        constructor(model: GroupingModel, cursor$: ICursor) {
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

        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
    }

    Layout.prototype.expandPolicy = IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = IModel.Type.Grouping;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function deepAssign<T>(a: T, b: T):T {
    if (a instanceof Array || b instanceof Array) {
        let retArr: any[] = [];
        let aArr: any[] = (<any>a);
        let bArr: any[] = (<any>b);
        for (let i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        let ret: T = a ? cloneObject(a) : (<T>{});
        for (let key in b) {
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
    constructors[IModel.Type.Grouping] = GroupingModel;
}

module Export {
    export interface IGroupingModel extends IModel, Grouping {
    }

    export interface ILayout extends IModel.ILayout {
    }
}

export default Export;
