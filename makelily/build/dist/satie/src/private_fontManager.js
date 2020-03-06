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
/// <reference path="./opentypedist.d.ts" />
import { parse as parseFont } from "opentype.js/dist/opentype.js";
import { memoize, forEach } from "lodash";
var IS_BROWSER = "browser" in process;
var NO_PATH_DATA = {};
/*---- PRIVATE ------------------------------------------------------------------------*/
var State = {
    fonts: {},
    cbs: [],
    remaining: 0,
    err: null,
    canvasContext: IS_BROWSER
        ? (document.createElement("canvas").getContext("2d"))
        : null,
    root: IS_BROWSER
        ? location.protocol + "//" + location.host + "/vendor/"
        : "./vendor/",
};
function getFullName(name, style) {
    name = name.toLowerCase();
    style = style && style.toLowerCase();
    return "" + name + (style ? "_" + style : "");
}
function loadFont(name, url, style, full) {
    ++State.remaining;
    var fullName = getFullName(name, style);
    url = getNativeURL(url);
    if (!full && IS_BROWSER) {
        var styleSheet = document.createElement("style");
        styleSheet.appendChild(document.createTextNode("@font-face{\n            font-family: " + name + ";\n            src: url(" + url + ") format('truetype');\n            " + (style && style.toLowerCase() === "bold"
            ? "font-weight: bold;"
            : "") + "\n        }"));
        document.head.appendChild(styleSheet);
        State.fonts[fullName] = State.fonts[fullName] || NO_PATH_DATA;
        goOn();
    }
    else {
        (IS_BROWSER ? loadFromUrl : loadFromFile)(url, function (err, buffer) {
            if (err) {
                return goOn(err);
            }
            var font = parseFont(buffer);
            State.fonts[fullName] = font;
            if (IS_BROWSER) {
                var styleSheet = document.styleSheets[0];
                var fontFaceStyle = "@font-face{\n                    font-family: " + name + ";\n                    src: url(data:font/truetype;charset=utf-8;base64," + toBase64(buffer) + ") format('truetype');\n                    " + (style && style.toLowerCase() === "bold"
                    ? "font-weight: bold;"
                    : "") + "\n                }";
                styleSheet.insertRule(fontFaceStyle, 0);
            }
            goOn();
        });
    }
    function goOn(_err) {
        --State.remaining;
        if (!State.remaining) {
            forEach(State.cbs, function (cb) { return cb(State.err); });
            State.cbs = [];
        }
    }
}
/*---- SUPPORT ------------------------------------------------------------------------*/
function toArrayBuffer(buffer) {
    var arrayBuffer = new ArrayBuffer(buffer.length);
    var data = new Uint8Array(arrayBuffer);
    for (var i = 0; i < buffer.length; i += 1) {
        data[i] = buffer[i];
    }
    return arrayBuffer;
}
function loadFromFile(path, callback) {
    var fs = require("fs");
    fs.readFile(path, function (err, buffer) {
        if (err) {
            return callback(err);
        }
        callback(null, toArrayBuffer(buffer));
    });
}
function loadFromUrl(url, callback) {
    var request = new XMLHttpRequest();
    request.open("get", url, true);
    request.responseType = "arraybuffer";
    request.onload = function () {
        if (request.status !== 200) {
            return callback(new Error("Font could not be loaded: " + request.statusText));
        }
        return callback(null, request.response);
    };
    request.send();
}
function getNativeURL(url) {
    return url.replace("root://", State.root);
}
var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var len = bytes.length, base64 = "";
    for (var i = 0; i < len; i += 3) {
        /* tslint:disable */
        base64 += CHARS[bytes[i] >> 2];
        base64 += CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += CHARS[bytes[i + 2] & 63];
        /* tslint:enable */
    }
    if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + "=";
    }
    else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + "==";
    }
    return base64;
}
/*---- PUBLIC -------------------------------------------------------------------------*/
export function requireFont(name, url, style, full) {
    var fullName = getFullName(name, style);
    if (full && State.fonts[fullName] === NO_PATH_DATA) {
        delete State.fonts[fullName];
    }
    if (!(fullName in State.fonts)) {
        State.fonts[fullName] = null; // Indicate it's pending
        loadFont(name, url, style, full);
    }
}
export function setRoot(root) {
    State.root = root;
}
export function markPreloaded(name, style) {
    State.fonts[getFullName(name, style)] = NO_PATH_DATA;
}
export function whenReady(cb) {
    if (!State.remaining) {
        cb();
        return;
    }
    State.cbs.push(cb);
}
export function getTextBB(name, text, fontSize, style) {
    var fullName = getFullName(name, style);
    var font = State.fonts[fullName];
    if (State.canvasContext && font === NO_PATH_DATA) {
        State.canvasContext.font = (style || "") + " " + fontSize + "px " + name;
        // We want to be consistent between web browsers. Many browsers only support measuring
        // width, so even if we are in Chrome and have better information, we ignore that.
        // Of course that this information is wrong, but it's good enough to place text.
        return {
            bottom: fontSize,
            left: -fontSize / 18,
            right: State.canvasContext.measureText(text).width,
            top: (-4 * fontSize) / 18,
        };
    }
    if (font === NO_PATH_DATA) {
        // TODO: get width by canvas if this is the browser
        console.warn(fullName + " was loaded without path data");
        return {
            bottom: 1,
            left: 0,
            right: 1,
            top: 0,
        };
    }
    if (!font) {
        console.warn(fullName + " is not loaded");
        return {
            bottom: 1,
            left: 0,
            right: 1,
            top: 0,
        };
    }
    var minX = 10000;
    var minY = 10000;
    var maxX = 0;
    var maxY = 0;
    font.forEachGlyph(text, 0, 0, fontSize, { kerning: true }, function (glyph, x, y, fontSize) {
        var scale = (1 / font.unitsPerEm) * fontSize;
        minX = Math.min(x, minX);
        maxX = Math.max(x, maxX);
        minY = Math.min(y + glyph.yMin * scale, minY);
        maxY = Math.max(y + glyph.yMax * scale, maxY);
    });
    return {
        bottom: maxY,
        left: minX,
        right: maxX,
        top: minY,
    };
}
var _toPathData = memoize(function (name, text, x, y, fontSize, style) {
    var fullName = getFullName(name, style);
    var font = State.fonts[fullName];
    if (!font) {
        console.warn(fullName + " is not loaded");
        return "";
    }
    if (font === NO_PATH_DATA) {
        console.warn(fullName + " was loaded without path data");
        return "";
    }
    return font.getPath(text, x, y, fontSize, { kerning: true }).toPathData(3);
}, resolvePDKey);
export function toPathData(name, text, x, y, fontSize, style) {
    return _toPathData(name, text, x, y, fontSize, style);
}
function resolvePDKey(name, text, x, y, fontSize, style) {
    return (name + "_" + text + "_" + x + "_" + y + "_" + fontSize + "_" + (style || ""));
}
//# sourceMappingURL=private_fontManager.js.map