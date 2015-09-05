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

"use strict";

import {createFactory as $, Component, DOM, PropTypes} from "react";
import {map} from "lodash";

import DirectionModel from "../models/direction";
import Dynamics from "./directions/dynamics";
import Words from "./directions/words";
import Glyph from "./primitives/glyph";
import {Targetable} from "./metadata"

@Targetable()
class Direction extends Component<{layout: DirectionModel.ILayout}, {}> {
    render() {
        const model = this.props.layout.model;
        let childContext = this.getChildContext();
        let children = map(model.directionTypes, (type, idx) => {
            switch(true) {
                case !!type.accordionRegistration:
                    return null;
                case !!type.bracket:
                    return null;
                case !!type.codas:
                    return null;
                case !!type.damp:
                    return null;
                case !!type.dampAll:
                    return null;
                case !!type.dashes:
                    return null;
                case !!type.dynamics:
                    return $(Dynamics)({
                        key: `d_${idx}`,
                        layout: this.props.layout
                    });
                case !!type.eyeglasses:
                    return null;
                case !!type.harpPedals:
                    return null;
                case !!type.image:
                    return null;
                case !!type.metronome:
                    return null;
                case !!type.octaveShift:
                    return null;
                case !!type.otherDirection:
                    return null;
                case !!type.otherDirection:
                    return null;
                case !!type.pedal:
                    return null;
                case !!type.percussions:
                    return null;
                case !!type.principalVoice:
                    return null;
                case !!type.rehearsals:
                    return null;
                case !!type.scordatura:
                    return null;
                case !!type.segnos:
                    return DOM.g(null,
                        map(type.segnos, (segno, segnoIdx) => $(Glyph)({
                            glyphName: "segno",
                            key: segnoIdx,
                            x: childContext.originX + segno.defaultX + (segno.relativeX||0),
                            y: this.context.originY - segno.defaultY - (segno.relativeY||0),
                            fill: segno.color
                        })));
                case !!type.stringMute:
                    return null;
                case !!type.wedge:
                    return null;
                case !!type.words:
                    return $(Words)({
                        key: `d_${idx}`,
                        layout: this.props.layout
                    });
            };
        }).filter(el => !!el);

        switch(children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return DOM.g(null,
                    children
                );
        }
    }

    getChildContext() {
        return {
            originX: this.context.originX + this.props.layout.overrideX
        };
    }
};

module Direction {
    export let childContextTypes = <any> {
        originX: PropTypes.number.isRequired
    };
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default Direction;
