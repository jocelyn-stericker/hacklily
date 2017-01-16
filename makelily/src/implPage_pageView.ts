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

import {ScoreHeader, Print} from "musicxml-interfaces";
import {createFactory, Component, DOM, MouseEvent, PropTypes} from "react";
import {map, filter, forEach, last} from "lodash";
import * as invariant from "invariant";

import {IModel, generateKey} from "./document_model";

import {tenthsToMM} from "./private_renderUtil";
import {getPageMargins} from "./private_print";
import {calculate as calculateLineBounds} from "./private_lineBounds";
import {IMeasureLayout} from "./private_measureLayout";

import MeasureView from "./implMeasure_measureView";
import CreditView from "./implPage_creditView";

const $MeasureView = createFactory(MeasureView);
const $CreditView = createFactory(CreditView);

export interface IProps {
    scoreHeader: ScoreHeader;
    print: Print;
    lineLayouts: IMeasureLayout[][];
    renderTarget: "svg-web" | "svg-export";
    className: string;
    singleLineMode?: boolean;

    onClick?: (evt: MouseEvent<SVGSVGElement>) => void;
    onMouseDown?: (evt: MouseEvent<SVGSVGElement>) => void;
    onMouseLeave?: (evt: MouseEvent<SVGSVGElement>) => void;
    onMouseMove?: (evt: MouseEvent<SVGSVGElement>) => void;
    onMouseUp?: (evt: MouseEvent<SVGSVGElement>) => void;
    svgRef?: (svg: SVGSVGElement) => void;
}

export default class Page extends Component<IProps, void> {
    static childContextTypes = {
        originY: PropTypes.number.isRequired,
        renderTarget: PropTypes.oneOf(["svg-web", "svg-export"]).isRequired,
        scale40: PropTypes.number.isRequired
    } as any;

    render(): any {

        /*--- Staves ----------------------------------------------*/

        const lineLayouts = this.props.lineLayouts;

        /*--- General ---------------------------------------------*/

        const print = this.props.print;
        const page = print.pageNumber;
        const pageNum = parseInt(page, 10);
        invariant(!!page, "Page %s isn't a valid page number.", pageNum);
        const defaults = this.props.scoreHeader.defaults;
        const credits = filter(this.props.scoreHeader.credits, cr =>
                                (cr.page === parseInt(page, 10)));
        const scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        const widthMM = this.props.renderTarget === "svg-export" ?
                                tenthsToMM(scale40, print.pageLayout.pageWidth) + "mm" : "100%";
        const heightMM = this.props.renderTarget === "svg-export" ?
                                tenthsToMM(scale40, print.pageLayout.pageHeight) + "mm" : "100%";

        const firstLineBounds = calculateLineBounds(print, 0);

        const pageWidth = this.props.singleLineMode ?
            last(lineLayouts[0]).originX + last(lineLayouts[0]).width +
                getPageMargins(print.pageLayout.pageMargins, 0).rightMargin :
            print.pageLayout.pageWidth;

        const pageHeight = this.props.singleLineMode ?
            firstLineBounds.systemLayout.topSystemDistance +
                firstLineBounds.systemLayout.systemDistance*2 :
            print.pageLayout.pageHeight;

        /*--- Credits ---------------------------------------------*/

        // Make sure our credits are keyed.
        forEach<IModel>(credits as any as IModel[], generateKey);

        /*--- Render ----------------------------------------------*/

        return DOM.svg(
            {
                className: this.props.className,
                style: this.props.renderTarget === "svg-export" ? undefined : {
                    width: "auto",
                },
                "data-page": this.props.renderTarget === "svg-export" ?
                    undefined :
                    print.pageNumber,
                height: heightMM,
                onClick: this.props.onClick,
                onMouseDown: this.props.onMouseDown,
                onMouseLeave: this.props.onMouseLeave,
                onMouseMove: this.props.onMouseMove,
                onMouseUp: this.props.onMouseUp,
                ref: this._setSVG,
                viewBox: `0 0 ${pageWidth} ${pageHeight}`,
                width: widthMM
            } as any,
            !this.props.singleLineMode && map(credits, $CreditView),
            map(lineLayouts, (lineLayout, lineIdx) =>
                map(lineLayout, measureLayout =>
                    $MeasureView({
                        key: measureLayout.uuid,
                        layout: measureLayout,
                        version: measureLayout.getVersion(),
                    })
                )
            )
        );
    }

    private _setSVG: (svg: SVGSVGElement) => void = (svg) => {
        if (this.props.svgRef) {
            this.props.svgRef(svg);
        };
    };

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
