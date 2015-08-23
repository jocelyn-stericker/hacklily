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

/**
 * See engine/README.md
 */

"use strict";

export * from "./engine/options";
export * from "./engine/measure";

export {default as Context} from "./engine/context";
export {default as IAttributes} from "./engine/iattributes";
export {default as IBeam} from "./engine/ibeam";
export {default as IChord} from "./engine/ichord";
export {default as ICursor} from "./engine/icursor";
export {default as IModel} from "./engine/imodel";
export {default as IPart} from "./engine/ipart";
export {default as IPrint} from "./engine/iprint";

export {default as RenderUtil} from "./engine/renderUtil";
export {default as defaultsDeep} from "./engine/defaultsDeep";

export {default as validate} from "./engine/processors/validate";
export {default as layout} from "./engine/processors/layout";
export {getCurrentMeasureList} from "./engine/escapeHatch";

if (!process.browser) {
    // Let's get TypeScript stack traces.

    /* tslint:disable */
    require("source-map-support").install();
    /* tslint:enable */
}

