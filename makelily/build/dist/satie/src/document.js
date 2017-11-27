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
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var server_1 = require("react-dom/server");
var lodash_1 = require("lodash");
var engine_processors_validate_1 = require("./engine_processors_validate");
var engine_processors_layout_1 = require("./engine_processors_layout");
var implPage_pageView_1 = require("./implPage_pageView");
var document_types_1 = require("./document_types");
var $PageView = react_1.createFactory(implPage_pageView_1.default);
var document_measure_1 = require("./document_measure");
exports.getMeasureSegments = document_measure_1.getMeasureSegments;
exports.reduceToShortestInSegments = document_measure_1.reduceToShortestInSegments;
var document_model_1 = require("./document_model");
exports.generateModelKey = document_model_1.generateModelKey;
exports.detach = document_model_1.detach;
var document_song_1 = require("./document_song");
exports.specIsRaw = document_song_1.specIsRaw;
exports.specIsDocBuilder = document_song_1.specIsDocBuilder;
exports.specIsPartBuilder = document_song_1.specIsPartBuilder;
var document_types_2 = require("./document_types");
exports.Type = document_types_2.default;
/**
 * Models a document in a certain state. Songs wrap documents to support change tracking.
 * Songs should not be mutated by user code.
 */
var Document = /** @class */ (function () {
    function Document(header, measures, parts, internalFactory, error) {
        this.cleanlinessTracking = {
            measures: {},
            lines: [],
            linePlacementHints: null,
        };
        if (error) {
            this.error = error;
            return;
        }
        this.header = header;
        this.measures = measures;
        this._factory = internalFactory;
    }
    Document.prototype.modelHasType = function (model) {
        var modelTypes = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            modelTypes[_i - 1] = arguments[_i];
        }
        return (_a = this._factory).modelHasType.apply(_a, [model].concat(modelTypes));
        var _a;
    };
    Document.prototype.search = function (models, idx) {
        var types = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            types[_i - 2] = arguments[_i];
        }
        return (_a = this._factory).search.apply(_a, [models, idx].concat(types));
        var _a;
    };
    Document.prototype.getPrint = function (startMeasure) {
        var _this = this;
        var firstMeasure = this.measures[startMeasure];
        if (!firstMeasure) {
            throw new Error("No such measure " + startMeasure);
        }
        var partWithPrint = lodash_1.find(firstMeasure.parts, function (part) { return !!part.staves[1] &&
            _this.search(part.staves[1], 0, document_types_1.default.Print).length; });
        if (partWithPrint) {
            return this.search(partWithPrint.staves[1], 0, document_types_1.default.Print)[0]._snapshot;
        }
        throw new Error("Part does not contain a Print element at division 0. Is it validated?");
    };
    Document.prototype.renderToStaticMarkup = function (startMeasure) {
        var core = server_1.renderToStaticMarkup(this.__getPage(startMeasure, false, "svg-export", null, false));
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>" + core.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
            .replace(/class="tn_"/g, "font-family='Alegreya'")
            .replace(/class="mmn_"/g, "font-family='Alegreya' " +
            "font-style='italic' stroke='#7a7a7a'")
            .replace(/class="bn_"/g, "font-family='Alegreya' " +
            "font-style='italic' text-anchor='end' stroke='#7a7a7a'")
            .replace(/<noscript><\/noscript>/g, "");
    };
    /**
     * INTERNAL. Renders a page. Instead, use renderToStaticMarkup() or the
     * functions provided in Song.
     *
     * Invariant: document must be validated.
     */
    Document.prototype.__getPage = function (startMeasure, preview, renderTarget, pageClassName, singleLineMode, fixedMeasureWidth, onOperationsAppended, ref, onPageHeightChanged) {
        var opts = {
            document: this,
            attributes: {},
            debug: true,
            header: this.header,
            lineCount: NaN,
            lineIndex: NaN,
            measures: this.measures,
            modelFactory: this._factory,
            postprocessors: this._factory.postprocessors,
            preprocessors: [],
            print: this.getPrint(startMeasure),
            preview: preview,
            singleLineMode: singleLineMode,
            fixedMeasureWidth: fixedMeasureWidth,
            fixup: onOperationsAppended ? function (segment, patch) {
                onOperationsAppended(patch);
            } : null,
        };
        engine_processors_validate_1.default(opts);
        // Print snapshot may have been changed.
        opts.print = this.getPrint(startMeasure);
        var lineLayouts = engine_processors_layout_1.default(opts);
        return $PageView({
            className: pageClassName,
            lineLayouts: lineLayouts,
            print: opts.print,
            renderTarget: renderTarget,
            scoreHeader: this.header,
            singleLineMode: singleLineMode,
            svgRef: ref,
            onPageHeightChanged: onPageHeightChanged,
        });
    };
    return Document;
}());
exports.Document = Document;
//# sourceMappingURL=document.js.map