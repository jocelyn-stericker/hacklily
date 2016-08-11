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

import {createFactory, ReactElement, Component, DOM, PropTypes} from "react";
import {map} from "lodash";

import Glyph from "../private/views/glyph";
import Dynamics from "./dynamicsView";
import Words from "./wordsView";

import DirectionModel from "./directionModel";

const $Glyph = createFactory(Glyph);
const $Dynamics = createFactory(Dynamics);
const $Words = createFactory(Words);

export default class Direction extends Component<{layout: DirectionModel.IDirectionLayout}, {}> {
    static contextTypes = {
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
    };

    render(): ReactElement<any> {
        const model = this.props.layout.model;
        let children = map(model.directionTypes, (type, idx) => {
            switch (true) {
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
                    return $Dynamics({
                        key: `d_${idx}`,
                        layout: this.props.layout,
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
                        map(type.segnos, (segno, segnoIdx) => $Glyph({
                            glyphName: "segno",
                            key: segnoIdx,
                            x: this.props.layout.overrideX + segno.defaultX + (segno.relativeX || 0),
                            y: this.context.originY - segno.defaultY - (segno.relativeY || 0),
                            fill: segno.color
                        })));
                case !!type.stringMute:
                    return null;
                case !!type.wedge:
                    return null;
                case !!type.words:
                    return $Words({
                        key: `d_${idx}`,
                        layout: this.props.layout,
                    });
                default:
                    throw new Error("Invalid direction in " + type);
            };
        }).filter(el => !!el);

        switch (children.length) {
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
};

