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
import _                = require("lodash");
import invariant        = require("react/lib/invariant");
var $                   = React.createFactory;

import Attributes       = require("../models/attributes");
import Engine           = require("../models/engine");

class AttributesView extends React.Component<{layout: Attributes.ILayout}, void> {
    render(): any {
        let layout = this.props.layout;
        let model = layout.model;
        console.log(layout.staffIdx, layout.clefVisible, layout.tsVisible, layout.ksVisible);
        return null;
    }
}

export = AttributesView;
