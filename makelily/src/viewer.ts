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

import React                = require("react");

import Engine               = require("./models/engine");
import Views                = require("./views");
import Page                 = require("./views/page");

class Viewer extends React.Component<{document: Engine.IDocument, pageClassName?: string}, void> {
    render() {
        let page1 = Views.getPage(this.props.document, 0, Page.RenderTarget.SvgWeb, this.props.pageClassName||"");
        return React.DOM.div({},
            page1
        );
    }
}

export = Viewer;
