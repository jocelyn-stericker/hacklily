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

import Cola                     = require("webcola");
import _                        = require("lodash");

import Engine                   = require("../engine");

interface IVPSCLayoutRect extends Cola.vpsc.Rectangle {
    mxmlBox: Engine.IModel.IBoundingRect;
    parent: Engine.IModel.ILayout;
}

function colaRemoveOverlapsSomeFixed(rs: IVPSCLayoutRect[]): void {
    // Prefer y
    let vs = rs.map(function (r) {
        return new Cola.vpsc.Variable(r.cy(), r.mxmlBox.fixed ? Number.POSITIVE_INFINITY : 1);
    });
    let cs = Cola.vpsc.generateYConstraints(rs, vs);
    let solver = new Cola.vpsc.Solver(vs, cs);
    solver.solve();
    vs.forEach((v, i) => rs[i].setYCentre(v.position()));

    // Move x if needed
    vs = rs.map(r => new Cola.vpsc.Variable(r.cx(), r.mxmlBox.fixed ? Number.POSITIVE_INFINITY : 1));
    cs = Cola.vpsc.generateXConstraints(rs, vs);
    solver = new Cola.vpsc.Solver(vs, cs);
    solver.solve();
    vs.forEach((v, i) => rs[i].setXCentre(v.position()));
}

function removeOverlaps(options: Engine.Options.ILayoutOptions, bounds: Engine.Options.ILineBounds,
        measures: Engine.Measure.IMeasureLayout[]): Engine.Measure.IMeasureLayout[] {

    let measures$: Engine.Measure.IMeasureLayout[] = measures; // FIXME We should detach
    let boxes: IVPSCLayoutRect[] = [];

    _.forEach(measures$, function centerThings(measure, idx) {
        _.forEach(measure.elements, function(segment, si) {
            _.forEach(segment, function(element, j) {
                _.forEach(element.boundingBoxes$, box => {
                    if (box.left >= box.right) {
                        console.warn("Invalid left >= right (%s >= %s)", box.left, box.right);
                        box.right = box.left + 0.01;
                    }
                    if (box.top >= box.bottom) {
                        console.warn("Invalid top >= bottom (%s >= %s)", box.top, box.bottom);
                        box.bottom = box.top + 0.01;
                    }
                    if (isNaN(box.top) || isNaN(box.bottom) || isNaN(box.left) || isNaN(box.right)) {
                        console.warn("Invalid box.{top, bottom, left, right} = {%s, %s, %s, %s}", box.top, box.bottom, box.left, box.right);
                        return;
                    }
                    let rect: IVPSCLayoutRect = <any> new Cola.vpsc.Rectangle(
                        element.overrideX + box.defaultX + box.left,
                        element.overrideX + box.defaultX + box.right,
                        box.defaultY + box.top,
                        box.defaultY + box.bottom);
                    rect.mxmlBox = box;
                    rect.parent = element;
                    boxes.push(rect);
                });
            });
        });
    });

    colaRemoveOverlapsSomeFixed(boxes);
    _.forEach(boxes, box => {
        let expectedX = box.parent.overrideX + box.mxmlBox.defaultX + box.mxmlBox.left;
        let expectedY = box.mxmlBox.defaultY + box.mxmlBox.top;
        let actualX = box.x;
        let actualY = box.y;
        box.mxmlBox.relativeX = actualX - expectedX;
        box.mxmlBox.relativeY = actualY - expectedY;
    });

    return measures$;
}

export = removeOverlaps;
