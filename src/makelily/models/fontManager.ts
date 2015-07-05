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

import {Font, parse as parseFont} from "opentype.js";
import {memoize, forEach} from "lodash";

const IS_BROWSER = !!(<any>process).browser;
const NO_PATH_DATA = <Font> {};

/*---- PUBLIC -------------------------------------------------------------------------*/

export function requireFont(name: string, url: string, style?: string, full?: boolean) {
    let fullName = getFullName(name, style);
    if (full && State.fonts[fullName] === NO_PATH_DATA) {
        delete State.fonts[fullName];
    }
    if (!(fullName in State.fonts)) {
        State.fonts[fullName] = null; // Indicate it's pending
        loadFont(name, url, style, full);
    }
}

export function setRoot(root: string) {
    State.root = root;
}

export function markPreloaded(name: string, style?: string) {
    State.fonts[getFullName(name, style)] = NO_PATH_DATA;
}

export function whenReady(cb: (err?: Error) => void) {
    if (!State.remaining) {
        cb();
        return;
    }
    State.cbs.push(cb);
}

export function getTextBB(name: string, text: string, fontSize: number, style?: string) {
    let fullName = getFullName(name, style);
    let font = State.fonts[fullName];
    if (State.canvasContext && font === NO_PATH_DATA) {
        State.canvasContext.font = `${style || ""} ${fontSize}px ${name}`;

        // We want to be consistent between web browsers. Many browsers only support measuring
        // width, so even if we are in Chrome and have better information, we ignore that.
        // Of course that this information is wrong, but it's good enough to place text.
        return {
            bottom: fontSize,
            left: -fontSize/18,
            right: State.canvasContext.measureText(text).width,
            top: -4*fontSize/18
        };
    }

    if (font === NO_PATH_DATA) {
        // TODO: get width by canvas if this is the browser
        console.warn(`${fullName} was loaded without path data`);
        return {
            bottom: 1,
            left: 0,
            right: 1,
            top: 0,
        };
    }
    if (!font) {
        console.warn(`${fullName} is not loaded`);
        return {
            bottom: 1,
            left: 0,
            right: 1,
            top: 0
        };
    }

    let minX = 10000;
    let minY = 10000;
    let maxX = 0;
    let maxY = 0;

    font.forEachGlyph(text, 0, 0, fontSize, {kerning: true}, (glyph, x, y, fontSize) => {
        let scale = 1 / font.unitsPerEm * fontSize;
        minX = Math.min(x, minX);
        maxX = Math.max(x, maxX);
        minY = Math.min(y + glyph.yMin*scale, minY);
        maxY = Math.max(y + glyph.yMax*scale, maxY);
    });

    return {
        bottom: maxY,
        left: minX,
        right: maxX,
        top: minY,
    };
}

export let toPathData = memoize(function(name: string, text: string,
        x: number, y: number, fontSize: number, style?: string) {
    let fullName = getFullName(name, style);
    let font = State.fonts[fullName];
    if (!font) {
        console.warn(`${fullName} is not loaded`);
        return "";
    }
    if (font === NO_PATH_DATA) {
        console.warn(`${fullName} was loaded without path data`);
        return "";
    }
    return font.getPath(text, x, y, fontSize, {kerning: true}).toPathData(3);
}, resolvePDKey);

function resolvePDKey(name: string, text: string,
        x: number, y: number, fontSize: number, style?: string) {
    return name + "_" + text + "_" + x + "_" + y + "_" + fontSize + "_" + (style||"");
}

/*---- PRIVATE ------------------------------------------------------------------------*/

module State {
    export let fonts: {[font: string]: Font} = {};
    export let cbs: ((err?: Error) => void)[] = [];
    export let remaining = 0;
    export let err: Error;
    // TypeScript 1.5 is smart about this, but 1.5-beta isn't, so we have to explicitly cast this.
    export let canvasContext = IS_BROWSER ?
        <CanvasRenderingContext2D> document.createElement("canvas").getContext("2d") :
        null;
    export let root = IS_BROWSER ?
        location.protocol + "//" + location.host + "/vendor/" :
        "./vendor/";
}

function getFullName(name: string, style?: string) {
    name = name.toLowerCase();
    style = style && style.toLowerCase();
    return `${name}${style ? "_" + style : ""}`;
}

function loadFont(name: string, url: string, style: string, full?: boolean) {
    ++State.remaining;

    let fullName = getFullName(name, style);
    url = getNativeURL(url);

    if (!full && IS_BROWSER) {
        let styleSheet = document.createElement("style");
        styleSheet.appendChild(document.createTextNode(`@font-face{
            font-family: ${name};
            src: url(${url}) format('truetype');
            ${style && style.toLowerCase() === "bold" ? "font-weight: bold;" : ""}
        }`));
        document.head.appendChild(styleSheet);

        State.fonts[fullName] = State.fonts[fullName] || NO_PATH_DATA;
        goOn();
    } else {
        (IS_BROWSER ? loadFromUrl : loadFromFile)(url, (err, buffer) => {
            if (err) {
                return goOn(err);
            }
            let font = parseFont(buffer);
            State.fonts[fullName] = font;
            if (IS_BROWSER) {
                let styleSheet = <CSSStyleSheet> document.styleSheets[0];
                let fontFaceStyle = `@font-face{
                    font-family: ${name};
                    src: url(data:font/truetype;charset=utf-8;base64,${toBase64(buffer)
                        }) format('truetype');
                    ${style && style.toLowerCase() === "bold" ? "font-weight: bold;" : ""}
                }`;
                styleSheet.insertRule(fontFaceStyle, 0);
            }
            goOn();
        });
    }

    function goOn(err?: Error) {
        --State.remaining;

        if (!State.remaining) {
            forEach(State.cbs, cb => cb(State.err));
            State.cbs = [];
        }
    }
}

/*---- SUPPORT ------------------------------------------------------------------------*/

function toArrayBuffer(buffer: Uint8Array) {
    let arrayBuffer = new ArrayBuffer(buffer.length);
    let data = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; i += 1) {
        data[i] = buffer[i];
    }

    return arrayBuffer;
}

function loadFromFile(path: string, callback: (err: Error, buffer?: ArrayBuffer) => void) {
    let fs = require("fs");
    fs.readFile(path, function(err: Error, buffer: Uint8Array) {
        if (err) {
            return callback(err);
        }

        callback(null, toArrayBuffer(buffer));
    });
}

function loadFromUrl(url: string, callback: (err: Error, buffer?: ArrayBuffer) => void) {
    let request = new XMLHttpRequest();
    request.open("get", url, true);
    request.responseType = "arraybuffer";
    request.onload = function() {
        if (request.status !== 200) {
            return callback(new Error(`Font could not be loaded: ${request.statusText}`));
        }

        return callback(null, request.response);
    };

    request.send();
}

function getNativeURL(url: string) {
    return url.replace("root://", State.root);
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(buffer: ArrayBuffer) {
    let bytes = new Uint8Array(buffer);
    let len = bytes.length, base64 = "";

    for (let i = 0; i < len; i += 3) {
      base64 += CHARS[bytes[i] >> 2];
      base64 += CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += CHARS[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }

    return base64;
}
