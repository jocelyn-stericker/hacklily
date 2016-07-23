/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
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

import {defer, forEach, isEqual, isObject, isFunction, isString, throttle, find} from "lodash";
import {createElement, ReactElement} from "react";
import {Pitch} from "musicxml-interfaces";
import {IAny, invert} from "musicxml-interfaces/operations";
import * as invariant from "invariant";

import IModel from "../document/model";
import IDocument, {Document} from "../document/document";
import ISong from "../document/song";

import RenderTarget from "../private/renderTargets";
import {newLayoutState} from "../private/linesLayoutState";
import {pitchForClef} from "../private/chord";
import {get as getByPosition} from "../private/views/metadata";
import IFactory from "../private/factory";

import {importXML} from "./import";
import {exportXML} from "./export";
import applyOp from "./applyOp";

export type IHandler = (path: (string|number)[], pitch: Pitch) => void;

const NOT_READY_ERROR = "The document is not yet initialized.";
const INVALID_OPTIONS_ERROR = `new Song(...) expects the following options in an Object:
    {
        errorHandler: (error: Error) => void,
        changeHandler: () => void,
        mouseMoveHandler: (path: (string|number)[], pitch: Pitch) => void;
        mouseClickHandler: (path: (string|number)[], pitch: Pitch) => void;

        musicXML: string,
        pageClassName: string   // optional
    }`;
const SATIE_ELEMENT_RX = /SATIE([0-9]*)_(\w*)_(\w*)_(\w*)_(\w*)_(\w*)/;

export default class Song implements ISong {
    /**
     * The document represented by the song.
     * Do not modify or cache. To update the document, use setOperations() or previewOperations().
     */
    getDocument = (): IDocument => {
        throw new Error(NOT_READY_ERROR);
    };

    /**
     * The operations applied to the song since the song was created.
     * Do not modify. To update the document, use setOperations() or previewOperations()
     */
    getOperations = (): IAny[] => {
        throw new Error(NOT_READY_ERROR);
    };

    /**
     * Sets the operations to that specified. If the result is not stable, more operations
     * may be added.
     */
    setOperations = (operations: IAny[]): IAny[] => {
        throw new Error(NOT_READY_ERROR);
    };

    /**
     * Sets the operations to those specified, without adjusting the layout. The operations may
     * give an unstable state.
     */
    previewOperations = (operations: IAny[]): IAny[] => {
        throw new Error(NOT_READY_ERROR);
    };

    toReactElement = (height?: number): ReactElement<any> => {
        throw new Error(NOT_READY_ERROR);
    };

    toSVG = (cb: (error: Error, svg: string) => void) => {
        cb(new Error(NOT_READY_ERROR), null);
    };

    toMusicXML = (cb: (error: Error, xml: string) => void) => {
        exportXML(this.getDocument(), cb);
    };

    constructor(options: {

                errorHandler: (error: Error) => void,
                changeHandler: () => void,
                mouseMoveHandler: IHandler,
                mouseClickHandler: IHandler,
                singleLineMode?: boolean,

                musicXML: string,
                pageClassName?: string
            }) {

        invariant(arguments.length === 1, INVALID_OPTIONS_ERROR);
        invariant(isObject(options), INVALID_OPTIONS_ERROR);

        const {errorHandler, changeHandler, mouseMoveHandler, mouseClickHandler,
            musicXML, pageClassName, singleLineMode} = options;

        invariant(isFunction(errorHandler), INVALID_OPTIONS_ERROR);
        invariant(isString(musicXML), INVALID_OPTIONS_ERROR);
        invariant(!pageClassName || isString(pageClassName), INVALID_OPTIONS_ERROR);
        invariant(isFunction(changeHandler), INVALID_OPTIONS_ERROR);
        invariant(isFunction(mouseMoveHandler), INVALID_OPTIONS_ERROR);
        invariant(isFunction(mouseClickHandler), INVALID_OPTIONS_ERROR);

        let document: Document;
        let factory: IFactory;
        let operations: IAny[] = [];
        let memo = newLayoutState(NaN);
        let preview: boolean = false;

        const rectify = (newOperations: IAny[]) => {
            let commonVersion = () => {
                let commonVersion = 0;
                let maxPossibleCommonVersion = Math.min(
                    operations.length,
                    newOperations.length);
                for (let i = 0; i < maxPossibleCommonVersion; ++i) {
                    if (isEqual(operations[i], newOperations[i])) {
                        ++commonVersion;
                    } else {
                        break;
                    }
                }
                return commonVersion;
            };

            let initialCommon = commonVersion();
            // Undo actions not in common
            forEach(invert(operations.slice(initialCommon)), (op) => {
                applyOp(document.measures, factory, op, memo);
                operations.pop();
            });

            // Perform actions that are expected.
            forEach(newOperations.slice(operations.length), (op) => {
                applyOp(document.measures, factory, op, memo);
                operations.push(op);
            });

            invariant(operations.length === newOperations.length,
                "Something went wrong in _rectify. The current state is now invalid.");

            let top = document.getTop(0, 0);
            invariant(!!memo, "Internal error: trying to rectify a document that hasn't loaded.");
            memo.y$ = top;
        };

        let makeReactElement: () => ReactElement<any> = () => {
            const targetType = RenderTarget.SvgWeb;
            return document.__getPage(
                0,
                memo,
                preview,
                targetType,
                pageClassName || "",
                singleLineMode,
                (ops: IAny[]) => {
                    rectify(operations.concat(ops));
                });
        };
        let page1: ReactElement<any> = null;

        let setup = () => {
            this.getDocument = () => document;
            this.getOperations = () => operations;

            let _svg: any;
            let _pt: any;
            function _getPos(ev: any) {
                let element: Element = ev.target;
                while (element && element.tagName.toLowerCase() !== "svg") {
                    element = element.parentElement;
                }
                if (!element || element.tagName.toLowerCase() !== "svg") {
                    _svg = null;
                    return;
                }

                if (element !== _svg) {
                    _svg = element as SVGElement;
                    _pt = _svg.createSVGPoint();
                }

                // Get point in global SVG space
                _pt.x = ev.clientX;
                _pt.y = ev.clientY;

                return _pt.matrixTransform((_svg as any).getScreenCTM().inverse());
            }

            let _prevDebug: IModel = null;
            let _handleCursorPosition = throttle((p: {x: number; y: number}, handler: IHandler) => {
                let element = getByPosition(p);

                let path = element && element.key.match(SATIE_ELEMENT_RX);
                if (!path) {
                    if (_prevDebug !== null) {
                        _prevDebug = null;
                        handler([], null);
                    }
                    return;
                }

                path = path.slice(1);
                let measure: any = find(document.measures,
                    (measure) => 1 * measure.uuid === parseInt(path[0], 10));

                let el = measure[path[1]][path[2]][path[3]][path[4]][path[5]];
                if (el) {
                    _prevDebug = el;
                    let originY = element.originY;
                    let clef = el._clef;
                    let pitch: Pitch;
                    if (clef && originY) {
                        pitch = pitchForClef(originY - p.y, clef);
                    }
                    handler(path, pitch);
                }
                if (el) {
                    el.toXML();
                }
            }, 18);

            function handleMouseMove(ev: any) {
                let p = _getPos(ev);
                if (p) {
                    _handleCursorPosition(p, mouseMoveHandler);
                }
            };

            function handleClick(ev: any) {
                let p = _getPos(ev);
                if (p) {
                    _handleCursorPosition(p, mouseClickHandler);
                }
            };

            this.toReactElement = (height?: number) => {
                const style: any = singleLineMode ? {
                    height: height || "100%",
                    overflowX: "scroll",
                    overflowY: "hidden",
                }: {};
                return createElement("div", {
                        onMouseMove: handleMouseMove,
                        onClick: handleClick,
                        style,
                    } as any, page1);
            };

            this.toSVG = (cb: (err: Error, svg: string) => void) => {
                try {
                    cb(null, document.renderToStaticMarkup(0));
                } catch(err) {
                    cb(err, null);
                }
            };

            this.setOperations = (newOperations: IAny[]) => {
                preview = false;
                newOperations = newOperations.slice();
                rectify(newOperations);
                operations = newOperations;
                defer(changeHandler);
                page1 = makeReactElement();
                return newOperations.slice();
            };

            this.previewOperations = (newOperations: IAny[]) => {
                preview = true;
                newOperations = newOperations.slice();
                rectify(newOperations);
                defer(changeHandler);
                page1 = makeReactElement();
                return newOperations;
            };

            rectify([]);

            defer(changeHandler);
        };

        importXML(musicXML, memo, (error, loadedDocument, loadedFactory) => {
            if (error) {
                errorHandler(error);
            } else {
                document = loadedDocument;
                factory = loadedFactory;
                setup();
                page1 = makeReactElement();
            }
        });
    }
}
