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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");

import Engine               = require("../models/engine");

class Page extends React.Component<Page.IProps, Page.IState> {
    render() {
        const print         = this.props.print;
        const defaults      = this.props.scoreHeader.defaults;
        const scale40       = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        const widthMM       = this.props.renderTarget === Page.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageWidth) + "mm" :
                                "100%";
        const heightMM      = this.props.renderTarget === Page.RenderTarget.SvgExport ?
                                Engine.RenderUtil.tenthsToMM(
                                    scale40, print.pageLayout.pageHeight) + "mm" :
                                "100%";

        const lineLayouts   = this.props.lineLayouts;
        _.forEach(lineLayouts, (measureLayouts, idx) => {
            console.log(`Line ${idx} has ${measureLayouts.length} measures`);
            console.log(_.map(measureLayouts, measure => measure.width));
        });

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
            }
            /* TODO: credits */
            /* TODO: staves */
            /* TODO: models */
            /* TODO: lyric boxes */
            /* TODO: free boxes */
            /* TODO: slurs and ties */
        );
    }
}

module Page {
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
