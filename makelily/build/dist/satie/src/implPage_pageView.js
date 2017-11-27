"use strict";
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
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var DOM = require("react-dom-factories");
var PropTypes = require("prop-types");
var lodash_1 = require("lodash");
var invariant = require("invariant");
var document_1 = require("./document");
var private_renderUtil_1 = require("./private_renderUtil");
var private_print_1 = require("./private_print");
var implMeasure_measureView_1 = require("./implMeasure_measureView");
var implPage_creditView_1 = require("./implPage_creditView");
var $MeasureView = react_1.createFactory(implMeasure_measureView_1.default);
var $CreditView = react_1.createFactory(implPage_creditView_1.default);
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
        var credits = lodash_1.filter(this.props.scoreHeader.credits, function (cr) {
            return (cr.page === pageNum);
        });
        var scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        var pageLayout = print.pageLayout;
        var widthMM = this.props.renderTarget === "svg-export" ?
            private_renderUtil_1.tenthsToMM(scale40, pageLayout.pageWidth) + "mm" : "100%";
        var heightMM = this.props.renderTarget === "svg-export" ?
            private_renderUtil_1.tenthsToMM(scale40, pageLayout.pageHeight) + "mm" : "100%";
        var pageWidth = this.props.singleLineMode ?
            lodash_1.last(lineLayouts[0]).originX + lodash_1.last(lineLayouts[0]).width +
                private_print_1.getPageMargins(pageLayout.pageMargins, 0).rightMargin :
            pageLayout.pageWidth;
        var pageHeight = pageLayout.pageHeight;
        if (pageHeight !== this._pageHeight && this.props.onPageHeightChanged) {
            this._pageHeight = pageHeight;
            setTimeout(function () {
                _this.props.onPageHeightChanged(pageHeight);
            });
        }
        /*--- Credits ---------------------------------------------*/
        // Make sure our credits are keyed.
        lodash_1.forEach(credits, document_1.generateModelKey);
        /*--- Render ----------------------------------------------*/
        return DOM.svg({
            className: this.props.className,
            style: this.props.renderTarget === "svg-export" ? undefined : {
                width: "auto",
            },
            "data-page": this.props.renderTarget === "svg-export" ?
                undefined :
                print.pageNumber,
            height: heightMM,
            ref: this._setSVG,
            viewBox: "0 0 " + pageWidth + " " + pageHeight,
            width: widthMM
        }, !this.props.singleLineMode && lodash_1.map(credits, $CreditView), lodash_1.map(lineLayouts, function (lineLayout, lineIdx) {
            return lodash_1.map(lineLayout, function (measureLayout) {
                return $MeasureView({
                    key: measureLayout.uuid,
                    layout: measureLayout,
                    version: measureLayout.getVersion(),
                });
            });
        }));
    };
    Page.prototype.getChildContext = function () {
        var defaults = this.props.scoreHeader.defaults;
        var print = this.props.print;
        var scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
        return {
            originY: print.pageLayout.pageHeight,
            renderTarget: this.props.renderTarget,
            scale40: scale40
        };
    };
    Page.childContextTypes = {
        originY: PropTypes.number.isRequired,
        renderTarget: PropTypes.oneOf(["svg-web", "svg-export"]).isRequired,
        scale40: PropTypes.number.isRequired
    };
    return Page;
}(react_1.Component));
exports.default = Page;
//# sourceMappingURL=implPage_pageView.js.map