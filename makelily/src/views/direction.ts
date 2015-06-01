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

import React                = require("react");
import _                    = require("lodash");
let $                       = React.createFactory;

import DirectionModel       = require("../models/direction");
import Dynamics             = require("./directions/dynamics");
import Words                = require("./directions/words");

class Direction extends React.Component<{layout: DirectionModel.ILayout}, void> {
    render(): any {
        const model = this.props.layout.model;
        let children = _.map(model.directionTypes, (type, idx) => {
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
                    return $(Dynamics)({layout: this.props.layout, key: `d_${idx}`});
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
                    return null;
                case !!type.stringMute:
                    return null;
                case !!type.wedge:
                    return null;
                case !!type.words:
                    return $(Words)({layout: this.props.layout, key: `d_${idx}`});
            };
        }).filter(el => !!el);

        switch(children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return React.DOM.g(null,
                    children
                );
        }
    }

    getChildContext() {
        return {
            originX:        this.context.originX + this.props.layout.overrideX
        };
    }
};

module Direction {
    export var childContextTypes = <any> {
        originX:            React.PropTypes.number.isRequired
    };
    export var contextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
}

export = Direction;
