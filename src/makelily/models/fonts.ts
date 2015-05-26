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

import Opentype                 = require("opentype.js");
import invariant                = require("react/lib/invariant");

let fonts: {[font: string]: Opentype.Font} = {};

export function loadAll(cb: (err?: Error) => void) {
    let remaining = 0;

    doLoad("Alegreya", "./vendor/alegreya/Alegreya-Regular.ttf");
    doLoad("Alegreya Bold", "./vendor/alegreya/Alegreya-Bold.ttf");

    function doLoad(name: string, url: string) {
        ++remaining;
        loadFont(name, url, goOn);
    }
    function goOn(err: Error) {
        if (err) {
            cb(err);
        } else if (!--remaining) {
            cb();
        }
    }
}

export function loadFont(name: string, url: string, cb: (err?: Error) => void) {
    Opentype.load(url, (err, font) => {
        if (err) {
            cb(err);
        }
        fonts[name] = font;
        cb();
    });
}

export function getTextBB(url: string, text: string, fontSize: number) {
    let font = fonts[url];
    invariant(!!font, "The font at %s is not loaded", url);
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
        left: minX,
        right: maxX,
        top: minY,
        bottom: maxY
    };
}