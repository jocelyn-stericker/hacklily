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

import {Component, DOM} from "react";

import {IDocument, RenderTarget, ILinesLayoutMemo} from "./engine";
import {getPage, getPrint, getTop} from "./views";

class Viewer extends Component<{document: IDocument, pageClassName?: string}, void> {
    render(): any {
        let {document} = this.props;
        let className = this.props.pageClassName || "";
        let print = getPrint(document, 0);
        let top = getTop(print, 0);
        let memo$ = ILinesLayoutMemo.create(top);
        let page1 = getPage(this.props.document, 0, memo$, RenderTarget.SvgWeb, className);
        return DOM.div({},
            page1
        );
    }
}

export default Viewer;
