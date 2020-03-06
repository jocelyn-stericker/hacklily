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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import * as React from "react";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { map, filter, forEach, last } from "lodash";
import invariant from "invariant";
import { generateModelKey } from "./document";
import { tenthsToMM } from "./private_renderUtil";
import { getPageMargins } from "./private_print";
import MeasureView from "./implMeasure_measureView";
import CreditView from "./implPage_creditView";
var Page = /** @class */ (function (_super) {
    __extends(Page, _super);
    function Page() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._pageHeight = NaN;
        _this._setSVG = function (svg) {
            if (_this.props.svgRef) {
                _this.props.svgRef(svg);
            }
        };
        return _this;
    }
    Page.prototype.render = function () {
        /*--- Staves ----------------------------------------------*/
        var _this = this;
        var lineLayouts = this.props.lineLayouts;
        /*--- General ---------------------------------------------*/
        var print = this.props.print;
        var pageNum = parseInt(print.pageNumber, 10);
        invariant(pageNum >= 1, "Page %s isn't a valid page number.", print.pageNumber);
        var defaults = this.props.scoreHeader.defaults;
        var credits = filter(this.props.scoreHeader.credits, function (cr) { return cr.page === pageNum; });
        var scale40 = (defaults.scaling.millimeters / defaults.scaling.tenths) * 40;
        var pageLayout = print.pageLayout;
        var widthMM = this.props.renderTarget === "svg-export"
            ? tenthsToMM(scale40, pageLayout.pageWidth) + "mm"
            : "100%";
        var heightMM = this.props.renderTarget === "svg-export"
            ? tenthsToMM(scale40, pageLayout.pageHeight) + "mm"
            : "100%";
        var pageWidth = this.props.singleLineMode
            ? last(lineLayouts[0]).originX +
                last(lineLayouts[0]).width +
                getPageMargins(pageLayout.pageMargins, 0).rightMargin
            : pageLayout.pageWidth;
        var pageHeight = pageLayout.pageHeight;
        if (pageHeight !== this._pageHeight && this.props.onPageHeightChanged) {
            this._pageHeight = pageHeight;
            setTimeout(function () {
                _this.props.onPageHeightChanged(pageHeight);
            });
        }
        /*--- Credits ---------------------------------------------*/
        // Make sure our credits are keyed.
        forEach(credits, generateModelKey);
        /*--- Render ----------------------------------------------*/
        return (React.createElement("svg", { className: this.props.className, style: this.props.renderTarget === "svg-export"
                ? undefined
                : {
                    width: "auto",
                }, "data-page": this.props.renderTarget === "svg-export"
                ? undefined
                : print.pageNumber, height: heightMM, ref: this._setSVG, viewBox: "0 0 " + pageWidth + " " + pageHeight, width: widthMM },
            !this.props.singleLineMode && map(credits, function (c) { return React.createElement(CreditView, __assign({}, c)); }),
            map(lineLayouts, function (lineLayout) {
                return map(lineLayout, function (measureLayout) { return (React.createElement(MeasureView, { key: measureLayout.uuid, layout: measureLayout, version: measureLayout.getVersion() })); });
            })));
    };
    Page.prototype.getChildContext = function () {
        var defaults = this.props.scoreHeader.defaults;
        var print = this.props.print;
        var scale40 = (defaults.scaling.millimeters / defaults.scaling.tenths) * 40;
        return {
            originY: print.pageLayout.pageHeight,
            renderTarget: this.props.renderTarget,
            scale40: scale40,
        };
    };
    Page.childContextTypes = {
        originY: PropTypes.number.isRequired,
        renderTarget: PropTypes.oneOf(["svg-web", "svg-export"]).isRequired,
        scale40: PropTypes.number.isRequired,
    };
    return Page;
}(Component));
export default Page;
//# sourceMappingURL=implPage_pageView.js.map