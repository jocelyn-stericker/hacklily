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

"use strict";

import {MultipleRest, Note} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";
import {map} from "lodash";
import invariant = require("react/lib/invariant");

import Dot from "./primitives/dot";
import Glyph from "./primitives/glyph";
import {bboxes} from "../models/smufl";

/**
 * Renders a rest.
 */
class Rest extends Component<Rest.IProps, void> {
    render(): any {
        const spec = this.props.spec;
        if (spec.printObject === false) {
            return null;
        }
        const rest = spec.rest;
        invariant(!!spec.rest, "Attempting to render a non-rest with Rest");
        const notehead = this.props.notehead;

        const x = this.context.originX + spec.defaultX + (spec.relativeX || 0);
        const y = this.context.originY - (spec.defaultY + (spec.relativeY || 0));
        const dotOffset = bboxes[notehead][0]*10 + 6;

        return DOM.g(null,
            $(Glyph)({
                fill: spec.color,
                glyphName: notehead,
                key: "R",
                x: x,
                y: y
            }/* Glyph */),
            rest.measure && this.props.multipleRest && DOM.text({
                    className: "mmn_",
                    "font-weight": "bold",
                    fontSize: 48,
                    textAnchor: "middle",
                    x: x + bboxes[notehead][0]*10/2,
                    y: y - 30
                },
                this.props.multipleRest.count // TODO: useSymbols
            /* DOM.text */),
        spec.dots && spec.printDot !== false ? map(spec.dots, (dot, idx) => $(Dot)({
                fill: dot.color,
                key: idx + "d",
                radius: 2.4,
                x: x + dotOffset + 6*idx,
                y: y - (dot.defaultY + (dot.relativeY || 0))
                // y: y + (line - 3)*10 + (((line * 2) % 2) ? 0 : 5)
            }/* Dot */)): null
        /* DOM.g */);
    }
}

module Rest {
    export interface IProps {
        multipleRest?: MultipleRest;
        notehead?: string;
        spec: Note;
    }
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default Rest;
