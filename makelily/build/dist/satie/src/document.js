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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { find } from "lodash";
import validate from "./engine_processors_validate";
import layoutSong from "./engine_processors_layout";
import PageView from "./implPage_pageView";
import Type from "./document_types";
export * from "./document_measure";
export * from "./document_model";
export * from "./document_song";
export { default as Type } from "./document_types";
/**
 * Models a document in a certain state. Songs wrap documents to support change tracking.
 * Songs should not be mutated by user code.
 */
var Document = /** @class */ (function () {
    function Document(header, measures, _parts, internalFactory, error) {
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
        var _a;
        var modelTypes = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            modelTypes[_i - 1] = arguments[_i];
        }
        return (_a = this._factory).modelHasType.apply(_a, __spreadArrays([model], modelTypes));
    };
    Document.prototype.search = function (models, idx) {
        var _a;
        var types = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            types[_i - 2] = arguments[_i];
        }
        return (_a = this._factory).search.apply(_a, __spreadArrays([models, idx], types));
    };
    Document.prototype.getPrint = function (startMeasure) {
        var _this = this;
        var firstMeasure = this.measures[startMeasure];
        if (!firstMeasure) {
            throw new Error("No such measure " + startMeasure);
        }
        var partWithPrint = find(firstMeasure.parts, function (part) {
            return !!part.staves[1] &&
                _this.search(part.staves[1], 0, Type.Print).length > 0;
        });
        if (partWithPrint) {
            return this.search(partWithPrint.staves[1], 0, Type.Print)[0]._snapshot;
        }
        throw new Error("Part does not contain a Print element at division 0. Is it validated?");
    };
    Document.prototype.renderToStaticMarkup = function (startMeasure) {
        var core = renderToStaticMarkup(this.__getPage(startMeasure, false, "svg-export", null, false));
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>" + core
            .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
            .replace(/class="tn_"/g, "font-family='Alegreya'")
            .replace(/class="mmn_"/g, "font-family='Alegreya' " + "font-style='italic' stroke='#7a7a7a'")
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
            fixup: onOperationsAppended
                ? function (_segment, patch) {
                    onOperationsAppended(patch);
                }
                : null,
        };
        validate(opts);
        // Print snapshot may have been changed.
        opts.print = this.getPrint(startMeasure);
        var lineLayouts = layoutSong(opts);
        return (React.createElement(PageView, { className: pageClassName, lineLayouts: lineLayouts, print: opts.print, renderTarget: renderTarget, scoreHeader: this.header, singleLineMode: singleLineMode, svgRef: ref, onPageHeightChanged: onPageHeightChanged }));
    };
    return Document;
}());
export { Document };
//# sourceMappingURL=document.js.map