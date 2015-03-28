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

import React            = require("react");
var $                   = React.createFactory;

import Attributes       = require("./attributes");
import Chord            = require("./chord");
import Engine           = require("../models/engine");

class ModelView extends React.Component<{layout: Engine.IModel.ILayout}, void> {
    render(): any {
        let layout = <any> this.props.layout;
        switch(layout.renderClass) {
        case Engine.IModel.Type.Attributes:
            return $(Attributes)({layout: layout});
        case Engine.IModel.Type.Chord:
            return $(Chord)({layout: layout});
        default:
            return null;
        }
    }
}

export = ModelView;
