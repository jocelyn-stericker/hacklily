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

import {IAny} from "musicxml-interfaces/operations";

export default class PatchImpl {
    isPatches = true;

    content: IAny[];
    isPreview: boolean; // MUTABLE

    constructor(content: IAny[], isPreview: boolean) {
        this.content = content.slice();
        this.isPreview = isPreview;
        Object.freeze(this.content);
        this.content.forEach(item => {
            Object.freeze(item);
            Object.freeze(item.p);
            // Note: We don't deep freeze ld, li, od, or oi. Should we?
            Object.freeze(item.ld);
            Object.freeze(item.li);
            Object.freeze(item.od);
            Object.freeze(item.oi);
            Object.seal(item);
        });
        Object.seal(this);
    }
}
