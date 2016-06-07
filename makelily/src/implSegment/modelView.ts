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

import {createFactory as $, Component, PropTypes} from "react";

import Type from "../document/types";
import ILayout from "../private/layout";
import {Targetable} from "../private/views/metadata";

import AttributesView from "../implAttributes/attributesView";
import BarlineView from "../implBarline/barlineView";
import ChordView from "../implChord/chordView";
import DirectionView from "../implDirection/directionView";

const $AttributesView = $(AttributesView);
const $BarlineView = $(BarlineView);
const $ChordView = $(ChordView);
const $DirectionView = $(DirectionView);

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

export interface IProps {
    layout: ILayout;
    version: number;
    key?: string | number;
    originX: number;
}

export interface IState {
}

@Targetable()
export default class ModelView extends Component<IProps, IState> {
    static childContextTypes = {
        originY: PropTypes.number,
    } as any;

    static contextTypes = {
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
    } as any;

    context: {
        originYByPartAndStaff: {[key: string]: number[]};
    };

    render(): any {
        let layout = <any> this.props.layout;
        switch (layout.renderClass) {
            case Type.Attributes:
                return $AttributesView({layout});
            case Type.Barline:
                return $BarlineView({layout});
            case Type.Chord:
                return $ChordView({layout});
            case Type.Direction:
                return $DirectionView({layout});
            default:
                return null;
        }
    }

    getChildContext() {
        const layout = this.props.layout;
        return {
            originY: this.context.originYByPartAndStaff[layout.part][layout.model.staffIdx || 1] || 0
        };
    }

    shouldComponentUpdate(nextProps: IProps, nextState: IState) {
        if (nextProps.version > this.props.version) {
            return true;
        }

        if (this.props.layout.renderClass === Type.Attributes &&
                (<any>this.props.layout).staffWidth !== (<any>nextProps.layout).staffWidth) {
            return true;
        }

        return false;
    }
}
