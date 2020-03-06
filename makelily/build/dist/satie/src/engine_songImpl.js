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
import { Component } from "react";
import { forEach, isEqual, throttle, find, extend } from "lodash";
import { createElement } from "react";
import { invert } from "musicxml-interfaces/operations";
import invariant from "invariant";
import { specIsDocBuilder, specIsPartBuilder, specIsRaw, } from "./document";
import createPatch from "./engine_createPatch";
import { pitchForClef } from "./private_chordUtil";
import { get as getByPosition } from "./private_views_metadata";
import PatchImpl from "./private_patchImpl";
import { importXML } from "./engine_import";
import { exportXML } from "./engine_export";
import applyOp from "./engine_applyOp";
var NOT_READY_ERROR = "The document is not yet initialized.";
var SATIE_ELEMENT_RX = /SATIE([0-9]*)_(\w*)_(\w*)_(\w*)_(\w*)_(\w*)/;
/**
 * Represents a song as:
 *  - some MusicXML, as a string
 *  - a series of patches applied on top of the MusicXML.
 *
 * The class can be used:
 *  - as a React component, to render to the DOM.
 *  - as a simple class (in this case call song.run() to load or update the document) to
 *    export to MusicXML (toMusicXML()) or SVG (toSVG()).
 *
 * Note: toMusicXML and toSVG can also be used when Song is used as a React component
 * (e.g., <Song ... ref={song => console.log(song.toMusicXML())} />)
 */
var SongImpl = /** @class */ (function (_super) {
    __extends(SongImpl, _super);
    function SongImpl() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            document: null,
            factory: null,
        };
        _this._docPatches = [];
        _this._page1 = null;
        /**
         * Returns the document represented by the song. The document represents the
         * current state of the song.
         *
         *  - The returned document is constant (i.e., do not modify the document)
         *  - The returned document is NOT immutable (i.e., the document may change
         *    after patches are applied), or the song is re-rendered.
         *  - The song may load a new document without warning after any operation.
         *    As such, do not cache the document.
         *  - The document's API is not finalized. If you depend on this function call,
         *    expect breakages.
         *  - This API call will eventually be removed and replaced with higher-level
         *    functions.
         */
        _this.getDocument = function (operations) {
            if (!_this.state.document) {
                throw new Error(NOT_READY_ERROR);
            }
            if (operations instanceof PatchImpl) {
                _this._rectify$(operations.content, operations.isPreview, function () { return (operations.isPreview = false); });
                return _this.state.document;
            }
            else if (!operations) {
                _this._rectify$([], false, function () { return void 0; });
                return _this.state.document;
            }
            throw new Error("Invalid operations element");
        };
        /**
         * Given a set of OT diffs, returns something the "patches" prop can be set to.
         */
        _this.createCanonicalPatch = function () {
            var patchSpecs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                patchSpecs[_i] = arguments[_i];
            }
            return _this._createPatch(false, patchSpecs);
        };
        /**
         * Given a set of operations, returns a set of operations that the "preview" prop can
         * be set to.
         */
        _this.createPreviewPatch = function () {
            var patchSpecs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                patchSpecs[_i] = arguments[_i];
            }
            return _this._createPatch(true, patchSpecs);
        };
        _this.toSVG = function () {
            var patches = _this.props.patches;
            if (patches instanceof PatchImpl) {
                invariant(patches.isPreview === false, "Cannot render an SVG with a previewed patch");
                _this._rectify$(patches.content, patches.isPreview, function () {
                    patches.isPreview = false;
                });
            }
            else if (!patches) {
                _this._rectify$([], false, function () { return void 0; });
            }
            else {
                throw new Error("Song.props.patches was not created through createPreviewPatch or createCanonicalPatch");
            }
            return _this.state.document.renderToStaticMarkup(0);
        };
        _this.toMusicXML = function () {
            var patches = _this.props.patches;
            if (patches instanceof PatchImpl) {
                invariant(patches.isPreview === false, "Cannot render MusicXML with a previewed patch");
                _this._rectify$(patches.content, patches.isPreview, function () { return (patches.preview = false); });
            }
            else if (!patches) {
                _this._rectify$([], false, function () { return void 0; });
            }
            else {
                throw new Error("Song.props.patches was not created through createPreviewPatch or createCanonicalPatch");
            }
            return exportXML(_this.state.document);
        };
        _this._rectifyAppendCanonical = function (ops) {
            _this._rectify$(_this._docPatches.concat(ops), false, function () { return void 0; });
        };
        _this._rectifyAppendPreview = function (ops) {
            _this._rectify$(_this._docPatches.concat(ops), true, function () { return void 0; });
        };
        _this._preRender = function (props) {
            if (props === void 0) { props = _this.props; }
            var patches = _this.props.patches;
            if (patches instanceof PatchImpl) {
                _this._update$(patches.content, patches.isPreview, props);
            }
            else if (!patches) {
                _this._update$([], false, props);
            }
            else {
                throw new Error("Internal error: preRender called, but the state is invalid.");
            }
        };
        _this._syncSVG = function (svg) {
            _this._svg = svg;
            _this._pt = svg ? svg.createSVGPoint() : null;
        };
        _this._handleCursorPosition = throttle(function (p, handler) {
            var match = getByPosition(p);
            var path = match && match.key.match(SATIE_ELEMENT_RX);
            if (!path) {
                handler({
                    path: [],
                    pitch: null,
                    pos: p,
                    matchedOriginY: null,
                    _private: null,
                });
                return;
            }
            path = path.slice(1);
            var measure = find(_this.state.document.measures, function (measure) { return 1 * measure.uuid === parseInt(path[0], 10); });
            var el = measure[path[1]][path[2]][path[3]][path[4]][path[5]];
            if (el) {
                var originY = match.originY;
                var clef = el._clef;
                var pitch = void 0;
                if (clef && originY) {
                    pitch = pitchForClef(originY - p.y, clef);
                }
                handler({
                    path: path,
                    pitch: pitch,
                    pos: p,
                    matchedOriginY: originY,
                    _private: match.obj,
                });
            }
        }, 18);
        _this._handleMouseMove = function (ev) {
            var p = _this._getPos(ev);
            if (p) {
                _this._handleCursorPosition(p, _this.props.onMouseMove);
            }
        };
        _this._handleClick = function (ev) {
            var p = _this._getPos(ev);
            if (p) {
                _this._handleCursorPosition(p, _this.props.onMouseClick);
            }
        };
        return _this;
    }
    SongImpl.prototype.render = function () {
        // Note: we rectify/render before this is called. We assume shouldComponentUpdate
        // stops temporary states from being rendered.
        return createElement("div", {
            onMouseMove: this.props.onMouseMove && this._handleMouseMove,
            onClick: this.props.onMouseClick && this._handleClick,
        }, this._page1);
    };
    SongImpl.prototype.shouldComponentUpdate = function (nextProps) {
        return (nextProps.baseSrc !== this.props.baseSrc ||
            nextProps.patches !== this.props.patches ||
            nextProps.pageClassName !== this.props.pageClassName ||
            nextProps.singleLineMode !== this.props.singleLineMode ||
            nextProps.fixedMeasureWidth !== this.props.fixedMeasureWidth);
    };
    SongImpl.prototype.UNSAFE_componentWillReceiveProps = function (nextProps) {
        if (nextProps.baseSrc !== this.props.baseSrc) {
            this._loadXML(nextProps.baseSrc);
        }
        else if (nextProps.pageClassName !== this.props.pageClassName ||
            nextProps.fixedMeasureWidth !== this.props.fixedMeasureWidth ||
            nextProps.singleLineMode !== this.props.singleLineMode) {
            this._preRender(nextProps);
        }
        else if (nextProps.patches !== this.props.patches) {
            var patches = nextProps.patches;
            if (patches instanceof PatchImpl) {
                this._update$(patches.content, patches.isPreview);
            }
            else if (!patches) {
                this._update$([], false);
            }
            else {
                throw new Error("Invalid patch.");
            }
        }
    };
    SongImpl.prototype.UNSAFE_componentWillMount = function () {
        this._loadXML(this.props.baseSrc);
    };
    Object.defineProperty(SongImpl.prototype, "header", {
        get: function () {
            if (this.state && this.state.document) {
                return this.state.document.header;
            }
            return null;
        },
        set: function (_header) {
            if (this.state) {
                throw new Error("Cannot set header. Use patches.");
            }
            // Do nothing -- makeExportsHot is running, probably.
        },
        enumerable: true,
        configurable: true
    });
    SongImpl.prototype.run = function () {
        var _this = this;
        this.setState = function (state, cb) {
            extend(_this.state, state);
            if (cb) {
                cb();
            }
        };
        this.forceUpdate = function () {
            // no-op
        };
        if (!this._isRunningWithoutDOM) {
            this.UNSAFE_componentWillMount();
        }
        this._isRunningWithoutDOM = true;
        this.UNSAFE_componentWillReceiveProps(this.props);
    };
    SongImpl.prototype._createPatch = function (isPreview, patchSpecs) {
        var _this = this;
        var patches = patchSpecs.reduce(function (array, spec) {
            if (specIsRaw(spec)) {
                return array.concat(spec.raw);
            }
            else if (specIsDocBuilder(spec)) {
                return array.concat(createPatch(isPreview, _this.state.document, spec.documentBuilder));
            }
            else if (specIsPartBuilder(spec)) {
                return array.concat(createPatch(isPreview, _this.state.document, spec.measure, spec.part, spec.partBuilder));
            }
            else if (spec instanceof PatchImpl) {
                return array.concat(spec.content);
            }
            else if (!spec) {
                return array;
            }
            throw new Error("Invalid patch spec.");
        }, []);
        this._update$(patches, isPreview);
        return new PatchImpl(this._docPatches.slice(), isPreview);
    };
    SongImpl.prototype._rectify$ = function (newPatches, preview, notEligableForPreview) {
        var _this = this;
        var docPatches = this._docPatches;
        var factory = this.state.factory;
        var commonVersion = function () {
            var maxPossibleCommonVersion = Math.min(docPatches.length, newPatches.length);
            for (var i = 0; i < maxPossibleCommonVersion; ++i) {
                if (!isEqual(docPatches[i], newPatches[i])) {
                    return i;
                }
            }
            return maxPossibleCommonVersion;
        };
        var initialCommon = commonVersion();
        // Undo actions not in common
        forEach(invert(docPatches.slice(initialCommon)), function (op) {
            applyOp(preview, _this.state.document.measures, factory, op, _this.state.document, notEligableForPreview);
            docPatches.pop();
        });
        // Perform actions that are expected.
        forEach(newPatches.slice(this._docPatches.length), function (op) {
            applyOp(preview, _this.state.document.measures, factory, op, _this.state.document, notEligableForPreview);
            docPatches.push(op);
        });
        invariant(docPatches.length === newPatches.length, "Something went wrong in _rectify. The current state is now invalid.");
    };
    SongImpl.prototype._update$ = function (patches, isPreview, props) {
        if (props === void 0) { props = this.props; }
        this._rectify$(patches, isPreview, function () { return (isPreview = false); });
        this._page1 = this.state.document.__getPage(0, isPreview, "svg-web", props.pageClassName || "", props.singleLineMode, props.fixedMeasureWidth, isPreview ? this._rectifyAppendPreview : this._rectifyAppendCanonical, this._syncSVG, props.onPageHeightChanged);
        this.forceUpdate();
    };
    SongImpl.prototype._getPos = function (ev) {
        if (!this._svg.contains(ev.target)) {
            return null;
        }
        // Get point in global SVG space
        this._pt.x = ev.clientX;
        this._pt.y = ev.clientY;
        return this._pt.matrixTransform(this._svg.getScreenCTM().inverse());
    };
    SongImpl.prototype._loadXML = function (xml) {
        var _this = this;
        this.setState({
            document: null,
            factory: null,
        });
        importXML(xml, function (error, loadedDocument, loadedFactory) {
            if (error) {
                _this.props.onError(error);
            }
            else {
                _this.setState({
                    document: loadedDocument,
                    factory: loadedFactory,
                }, _this._preRender);
            }
            invariant(!_this.props.patches, "Expected patches to be empty on document load.");
            if (_this.props.onLoaded) {
                _this.props.onLoaded();
            }
        });
    };
    return SongImpl;
}(Component));
export default SongImpl;
//# sourceMappingURL=engine_songImpl.js.map