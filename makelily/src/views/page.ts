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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");
var $                       = React.createFactory;

import Credit               = require("./credit");
import Engine               = require("../models/engine");
import MeasureView          = require("./measureView");
import StaveLines           = require("./staveLines");

class Page extends React.Component<Page.IProps, Page.IState> {
    render() {

        /*--- General ---------------------------------------------*/

        const print         = this.props.print;
        const page          = print.pageNumber;
        const pageNum       = parseInt(page, 10);
        invariant(!!page, "Page %s isn't a valid page number.", pageNum);
        const defaults      = this.props.scoreHeader.defaults;
        const credits       = _.filter(this.props.scoreHeader.credits, cr =>
                                (cr.page === parseInt(page, 10)));
        const scale40       = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        const widthMM       = this.props.renderTarget === Page.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageWidth) + "mm" :
                                "100%";
        const heightMM      = this.props.renderTarget === Page.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageHeight) + "mm" :
                                "100%";

        /*--- Staves ----------------------------------------------*/

        const lineLayouts       = this.props.lineLayouts;

        const pageMarginsAll    = print.pageLayout.pageMargins;
        const pageMargins       = Engine.IPrint.getPageMargins(pageMarginsAll, pageNum);
        let systemMargins       = print.systemLayout.systemMargins;

        let staveTops           = _.map(lineLayouts, measureLayouts => measureLayouts[0] ? measureLayouts[0].originY : 0);

        // TODO: Move to Engine & IModel, generalize
        let staveLefts          = _.map(lineLayouts, () => {
            return systemMargins.leftMargin + pageMargins.leftMargin;
        });

        let staveWidths         = _.map(lineLayouts, layout =>
            _.reduce(layout, (width, measure) => width + measure.width, 0)
        );

        let staveLineProps      = _.map(_.zip(staveTops, staveLefts, staveWidths), (d, i) => {
            return {
                key:    "stave_" + i,

                lines:  5,
                width:  d[2 /* width */],
                x:      d[1 /* left */],
                y:      d[0 /* top */]
            };
        });

        /*--- Credits ---------------------------------------------*/

        // Make sure our credits are keyed.
        _.forEach(credits, credit => Engine.key$(credit));

        /*--- Render ----------------------------------------------*/

        return React.DOM.svg(
            {
                "data-page":    this.props.renderTarget === Page.RenderTarget.SvgExport ? undefined : print.pageNumber,
                ref:            "svg" + print.pageNumber,

                height:         heightMM,
                width:          widthMM,
                viewBox:        `0 0 ${print.pageLayout.pageWidth} ${print.pageLayout.pageHeight}`,

                onClick:        this.props.onClick,
                onMouseDown:    this.props.onMouseDown,
                onMouseLeave:   this.props.onMouseLeave,
                onMouseMove:    this.props.onMouseMove,
                onMouseUp:      this.props.onMouseUp
            },
            _.map(credits, (credit, idx) => $(Credit)(credit)),
            _.map(staveLineProps, staveLineProps => $(StaveLines)(staveLineProps)),
            _.map(lineLayouts, lineLayout =>
                _.map(lineLayout, measureLayout =>
                    $(MeasureView)({
                        layout:     measureLayout,
                        key:        (<any>measureLayout).key
                    })
                )
            )
        );
    }

    getChildContext() {
        const defaults      = this.props.scoreHeader.defaults;
        const print         = this.props.print;
        const scale40       = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        return {
            scale40:        scale40,
            originY:        print.pageLayout.pageHeight
        };
    }
}

module Page {
    export var childContextTypes = <any> {
        scale40:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };

    export interface IProps {
        scoreHeader:    MusicXML.ScoreHeader;
        print:          MusicXML.Print;
        lineLayouts:    Engine.Options.ILineLayoutResult[];
        renderTarget:   RenderTarget;

        onClick?:       (evt: React.MouseEvent) => void;
        onMouseDown?:   (evt: React.MouseEvent) => void;
        onMouseLeave?:  (evt: React.MouseEvent) => void;
        onMouseMove?:   (evt: React.MouseEvent) => void;
        onMouseUp?:     (evt: React.MouseEvent) => void;
    }
    export interface IState {
    }
    export enum RenderTarget {
        SvgWeb = 0,
        SvgExport = 1
    }
}

export = Page;
