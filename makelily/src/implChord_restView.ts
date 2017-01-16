/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 * 
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

import {MultipleRest, Note} from "musicxml-interfaces";
import {createFactory, Component, DOM, PropTypes} from "react";
import {map} from "lodash";
import * as invariant from "invariant";

import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";
import {bboxes} from "./private_smufl";

const $Dot = createFactory(Dot);
const $Glyph = createFactory(Glyph);

export interface IProps {
    multipleRest?: MultipleRest;
    notehead?: string;
    spec: Note;
}

/**
 * Renders a rest.
 */
export default class Rest extends Component<IProps, void> {
    static contextTypes = <any> {
        originY: PropTypes.number.isRequired
    };

    context: {
        originY: number;
    };

    render(): any {
        const spec = this.props.spec;
        if (spec.printObject === false) {
            return null;
        }
        const rest = spec.rest;
        invariant(!!spec.rest, "Attempting to render a non-rest with Rest");
        const notehead = this.props.notehead;

        const x = spec.defaultX + (spec.relativeX || 0);
        const y = this.context.originY - (spec.defaultY + (spec.relativeY || 0));
        const dotOffset = bboxes[notehead][0] * 10 + 6;

        return DOM.g(null,
            $Glyph({
                fill: spec.color,
                glyphName: notehead,
                key: "R",
                x: x,
                y: y
            }/* Glyph */),
            rest.measure && this.props.multipleRest && DOM.text({
                    className: "mmn_",
                    fontWeight: "bold",
                    fontSize: 48,
                    textAnchor: "middle",
                    x: x + bboxes[notehead][0] * 10 / 2,
                    y: y - 30
                } as any,
                this.props.multipleRest.count // TODO: useSymbols
            /* DOM.text */),
        spec.dots && spec.printDot !== false ? map(spec.dots, (dot, idx) => $Dot({
                fill: dot.color,
                key: idx + "d",
                radius: 2.4,
                x: x + dotOffset + 6 * idx,
                y: y - (dot.defaultY + (dot.relativeY || 0))
                // y: y + (line - 3)*10 + (((line * 2) % 2) ? 0 : 5)
            }/* Dot */)) : null
        /* DOM.g */);
    }
}
