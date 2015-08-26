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

import {ScoreHeader, Print} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, MouseEvent, PropTypes} from "react";
import {map, filter, forEach} from "lodash";
import invariant = require("invariant");

import Credit from "./credit";
import {ILineLayoutResult, RenderTarget, RenderUtil, key$} from "../engine";
import MeasureView from "./measureView";

class Page extends Component<Page.IProps, Page.IState> {
    render(): any {

        /*--- General ---------------------------------------------*/

        const print = this.props.print;
        const page = print.pageNumber;
        const pageNum = parseInt(page, 10);
        invariant(!!page, "Page %s isn't a valid page number.", pageNum);
        const defaults = this.props.scoreHeader.defaults;
        const credits = filter(this.props.scoreHeader.credits, cr =>
                                (cr.page === parseInt(page, 10)));
        const scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        const widthMM = this.props.renderTarget === RenderTarget.SvgExport ?
                                RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageWidth) + "mm" :
                                "100%";
        const heightMM = this.props.renderTarget === RenderTarget.SvgExport ?
                                RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageHeight) + "mm" :
                                "100%";

        /*--- Staves ----------------------------------------------*/

        const lineLayouts = this.props.lineLayouts;

        /*--- Credits ---------------------------------------------*/

        // Make sure our credits are keyed.
        forEach(credits, key$);

        /*--- Render ----------------------------------------------*/

        return DOM.svg(
            {
                className: this.props.className,
                "data-page": this.props.renderTarget === RenderTarget.SvgExport ?
                    undefined : print.pageNumber,
                height: heightMM,
                onClick: this.props.onClick,
                onMouseDown: this.props.onMouseDown,
                onMouseLeave: this.props.onMouseLeave,
                onMouseMove: this.props.onMouseMove,
                onMouseUp: this.props.onMouseUp,
                ref: "svg" + print.pageNumber,
                viewBox: `0 0 ${print.pageLayout.pageWidth} ${print.pageLayout.pageHeight}`,
                width: widthMM
            },
            map(credits, <any> $(Credit)),
            map(lineLayouts, (lineLayout, lineIdx) =>
                map(lineLayout, measureLayout =>
                    $(MeasureView)({
                        key: (<any>measureLayout).key,
                        layout: measureLayout
                    })
                )
            )
        );
    }

    getChildContext() {
        const defaults = this.props.scoreHeader.defaults;
        const print = this.props.print;
        const scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;

        return {
            originY: print.pageLayout.pageHeight,
            renderTarget: this.props.renderTarget,
            scale40: scale40
        };
    }
}

module Page {
    export let childContextTypes = <any> {
        originY: PropTypes.number.isRequired,
        renderTarget: PropTypes.number.isRequired, // Page.RenderTarget
        scale40: PropTypes.number.isRequired
    };

    export interface IProps {
        scoreHeader: ScoreHeader;
        print: Print;
        lineLayouts: ILineLayoutResult[];
        renderTarget: RenderTarget;
        className: string;

        onClick?: (evt: MouseEvent) => void;
        onMouseDown?: (evt: MouseEvent) => void;
        onMouseLeave?: (evt: MouseEvent) => void;
        onMouseMove?: (evt: MouseEvent) => void;
        onMouseUp?: (evt: MouseEvent) => void;
    }
    export interface IState {
    }
}

export default Page;
