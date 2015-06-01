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

import _                        = require("lodash");
import invariant                = require("react/lib/invariant");

import Engine                   = require("../engine");

/** 
 * Centers elements marked as such
 * 
 * @returns new end of line
 */
function center(options: Engine.Options.ILayoutOptions, bounds: Engine.Options.ILineBounds,
        measures$: Engine.Measure.IMeasureLayout[]): Engine.Measure.IMeasureLayout[] {

    _.forEach(measures$, function(measure, measureIdx) {
        let maxIdx = _.max(_.map(measure.elements, el => el.length));
        _.times(maxIdx, function(j) {
            for (let i = 0; i < measure.elements.length; ++i) {
                if (measure.elements[i][j].expandPolicy === Engine.IModel.ExpandPolicy.Centered) {
                    let intrinsicWidth = measure.elements[i][j].renderedWidth;
                    let originX = measure.elements[i][j].x$;
                    invariant(isFinite(intrinsicWidth), "Intrinsic width must be set on centered items");
                    let measureSpaceRemaining = measure.width - originX;
                    if (measure.elements[i][j].renderClass === Engine.IModel.Type.Chord) {
                        let model: any = measure.elements[i][j].model;
                        if (model && model.satieNotehead && _.any(model.satieNotehead, n => n === "restWhole")) {
                            // There's some inherent spacing in whole rests to make them placed more naturally.
                            // We need to make up for that when centering!
                            // TODO(jnetterf): Calculate the exact amount here
                            measure.elements[i][j].x$ -= 16.0;
                        } else if (model && model.satieNotehead && _.any(model.satieNotehead, n => n === "restHBar")) {
                            // I have no idea where this comes from (!!)
                            measure.elements[i][j].x$ -= 7.0;
                        }
                    }
                    measure.elements[i][j].x$ += measureSpaceRemaining/2 - intrinsicWidth/2;
                }
            }
        });
    });

    return measures$;
}

export = center;

