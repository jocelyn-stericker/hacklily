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

import MusicXML = require("musicxml-interfaces");
import React = require("react");
import _ = require("lodash");
import invariant = require("react/lib/invariant");
var $ = React.createFactory;

import Credit = require("./credit");
import Engine = require("../models/engine");
import MeasureView = require("./measureView");
import StaveLines = require("./staveLines");

class Page extends React.Component<Page.IProps, Page.IState> {
    render() {

        /*--- General ---------------------------------------------*/

        const print = this.props.print;
        const page = print.pageNumber;
        const pageNum = parseInt(page, 10);
        invariant(!!page, "Page %s isn't a valid page number.", pageNum);
        const defaults = this.props.scoreHeader.defaults;
        const credits = _.filter(this.props.scoreHeader.credits, cr =>
                                (cr.page === parseInt(page, 10)));
        const scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        const widthMM = this.props.renderTarget === Engine.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageWidth) + "mm" :
                                "100%";
        const heightMM = this.props.renderTarget === Engine.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageHeight) + "mm" :
                                "100%";

        /*--- Staves ----------------------------------------------*/

        const lineLayouts = this.props.lineLayouts;

        const pageMarginsAll = print.pageLayout.pageMargins;
        const pageMargins = Engine.IPrint.getPageMargins(pageMarginsAll, pageNum);
        let systemMargins = print.systemLayout.systemMargins;

        let origins = _.map(lineLayouts, extractOriginsFromLayouts);
        let staveTops: number[][] = <any> _.flatten(_.map(origins, tops => _.values(tops)));

        // TODO: Move to Engine & IModel, generalize
        let staveLefts = _.flatten(_.map(lineLayouts, (measureLayouts, idx) => {
            let partCount = _.flatten(_.values(origins[idx])).length - _.keys(origins[idx]).length;
            return _.times(partCount, () => systemMargins.leftMargin + pageMargins.leftMargin);
        }));

        let staveWidths = _.flatten(_.map(lineLayouts, (layout, idx) => {
            let partCount = _.flatten(_.values(origins[idx])).length - _.keys(origins[idx]).length;
            let width = _.reduce(layout, (width, measure) => width + measure.width, 0);
            return _.times(partCount, () => width);
        }));

        let staveLineProps = _.map(_.zip(staveTops, staveLefts, staveWidths), (d, i) =>
            _.map(d[0/* top */], (top: number, j: number) => {
                return {
                    key: `stave_${i}_${j}`,

                    lines: 5,
                    width: d[2 /* width */],
                    x: d[1 /* left */],
                    y: top
                };
            }).slice(1)
        );
        /*--- Credits ---------------------------------------------*/

        // Make sure our credits are keyed.
        _.forEach(credits, credit => Engine.key$(credit));

        /*--- Render ----------------------------------------------*/

        return React.DOM.svg(
            {
                "data-page": this.props.renderTarget === Engine.RenderTarget.SvgExport ?
                                    undefined : print.pageNumber,
                ref: "svg" + print.pageNumber,
                className: this.props.className,

                height: heightMM,
                width: widthMM,
                viewBox: `0 0 ${print.pageLayout.pageWidth} ${print.pageLayout.pageHeight}`,

                onClick: this.props.onClick,
                onMouseDown: this.props.onMouseDown,
                onMouseLeave: this.props.onMouseLeave,
                onMouseMove: this.props.onMouseMove,
                onMouseUp: this.props.onMouseUp
            },
            _.map(credits, <any> $(Credit)),
            _.map(staveLineProps, staveLineProps => _.map(staveLineProps, <any> $(StaveLines))),
            _.map(lineLayouts, (lineLayout, lineIdx) =>
                _.map(lineLayout, measureLayout =>
                    $(MeasureView)({
                        layout: measureLayout,
                        key: (<any>measureLayout).key
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
            scale40: scale40,
            originY: print.pageLayout.pageHeight,
            renderTarget: this.props.renderTarget
        };
    }
}

function extractOriginsFromLayouts(measureLayouts: Engine.Measure.IMeasureLayout[]):
        {[key: string]: number[]} {

    if (!measureLayouts[0]) {
        return {};
    }
    return measureLayouts[0].originY;
}

module Page {
    export var childContextTypes = <any> {
        scale40: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired,
        renderTarget: React.PropTypes.number.isRequired // Page.RenderTarget
    };

    export interface IProps {
        scoreHeader: MusicXML.ScoreHeader;
        print: MusicXML.Print;
        lineLayouts: Engine.Options.ILineLayoutResult[];
        renderTarget: Engine.RenderTarget;
        className: string;

        onClick?: (evt: React.MouseEvent) => void;
        onMouseDown?: (evt: React.MouseEvent) => void;
        onMouseLeave?: (evt: React.MouseEvent) => void;
        onMouseMove?: (evt: React.MouseEvent) => void;
        onMouseUp?: (evt: React.MouseEvent) => void;
    }
    export interface IState {
    }
}

export = Page;
