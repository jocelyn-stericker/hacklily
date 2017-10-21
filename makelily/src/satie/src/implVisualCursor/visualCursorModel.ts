/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Joshua Netterfield <joshua@nettek.ca> 2016 - present.
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

import Type from "../document/types";
import IModel from "../document/model";
import ILayout from "../private/layout";
import {ICursor} from "../private/cursor";

import ExpandPolicy from "../document/expandPolicies";
import IBoundingRect from "../private/boundingRect";

class VisualCursorModel implements Export.IVisualCursorModel {
    _class = "VisualCursor";

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** @prototype only */
    divisions: number;

    staffIdx: number = 1;

    static _lastIdx = 1;
    _myIdx = ++VisualCursorModel._lastIdx;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(spec: VisualCursorModel) {
        // no-op
    }

    validate(cursor$: ICursor): void {
        cursor$.document._visualCursor = this;
    }

    getLayout(cursor$: ICursor): Export.IVisualCursorLayout {
        return new VisualCursorModel.Layout(this, cursor$);
    }

    toXML(): string {
        return `<!-- visual cursor -->\n`;
    }

    toJSON(): any {
        let {
            _class,
        } = this;

        return {
            _class,
        };
    }

    inspect() {
        return this.toXML();
    }
}

VisualCursorModel.prototype.divCount = 0;
VisualCursorModel.prototype.divisions = 0;

module VisualCursorModel {
    export class Layout implements Export.IVisualCursorLayout {
        constructor(origModel: VisualCursorModel, cursor$: ICursor) {
            this.model = origModel;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
            this.renderedWidth = 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: VisualCursorModel;
        x$: number;
        division: number;

        renderedWidth: number;

        // Prototype:

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: ExpandPolicy;
    }

    Layout.prototype.expandPolicy = ExpandPolicy.None;
    Layout.prototype.renderClass = Type.VisualCursor;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers VisualCursor in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.VisualCursor] = VisualCursorModel;
}

module Export {
    export interface IVisualCursorModel extends IModel {
    }

    export interface IVisualCursorLayout extends ILayout {
        renderedWidth: number;
    }
}

export default Export;
