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

import {createFactory, Component, ReactElement, PropTypes} from "react";

import Line from "./private_views_line";
import VisualCursorModel from "./implVisualCursor_visualCursorModel";

const $Line = createFactory(Line);

export interface IProps {
    layout: VisualCursorModel.IVisualCursorLayout;
}

export default class VisualCursorView extends Component<IProps, void> {
    static contextTypes = {
        originY: PropTypes.number.isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
        systemBottom: number;
        systemTop: number;
    };

    render(): ReactElement<any> {
        const layout = this.props.layout;
        const x = layout.x$;

        const yTop = this.context.systemTop;
        const yBottom = this.context.systemBottom;
        const height = yTop - yBottom;

        return $Line({
            stroke: "#428bca",
            strokeWidth: 2,
            x1: x - 4,
            x2: x - 4,
            y1: yTop + height * 0.5,
            y2: yBottom - height * 0.5
        });
    }
}
