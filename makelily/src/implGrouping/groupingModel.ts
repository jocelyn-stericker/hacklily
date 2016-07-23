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

import {Feature, StartStopSingle, Grouping, serializeGrouping} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {forEach} from "lodash";

import IModel from "../document/model";
import FrozenLevel from "../document/frozenLevels";
import Type from "../document/types";
import ExpandPolicy from "../document/expandPolicies";

import ICursor from "../private/cursor";
import ILayout from "../private/layout";
import IBoundingRect from "../private/boundingRect";
import {cloneObject} from "../private/util";

class GroupingModel implements Export.IGroupingModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** @prototype only */
    divisions: number;

    /** defined externally */
    staffIdx: number;

    /** @prototype */
    frozenness: FrozenLevel;

    /*---- I.2 Grouping -------------------------------------------------------------------------*/

    features: Feature[];
    number: number;
    type: StartStopSingle;
    memberOf: string;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(spec: Grouping) {
        forEach<any>(spec, (value, key) => {
            (this as any)[key] = value;
        });
    }

    checkSemantics(cursor: ICursor): IAny[] {
        return [];
    }

    __validate(cursor$: ICursor): void {
        // todo
    }

    __layout(cursor$: ICursor): Export.IGroupingLayout {
        // todo

        return new GroupingModel.Layout(this, cursor$);
    }

    toXML(): string {
        return `${serializeGrouping(this)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    inspect() {
        return this.toXML();
    }
}

GroupingModel.prototype.divCount = 0;
GroupingModel.prototype.divisions = 0;
GroupingModel.prototype.frozenness = FrozenLevel.Warm;

module GroupingModel {
    export class Layout implements Export.IGroupingLayout {
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

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: ExpandPolicy;
    }

    Layout.prototype.expandPolicy = ExpandPolicy.None;
    Layout.prototype.renderClass = Type.Grouping;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function deepAssign<T>(a: T, b: T): T {
    if (a instanceof Array || b instanceof Array) {
        let retArr: any[] = [];
        let aArr: any[] = (<any>a);
        let bArr: any[] = (<any>b);
        for (let i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        let ret: T = cloneObject(a) || (<T>{});
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
    constructors[Type.Grouping] = GroupingModel;
}

module Export {
    export interface IGroupingModel extends IModel, Grouping {
    }

    export interface IGroupingLayout extends ILayout {
    }
}

export default Export;
