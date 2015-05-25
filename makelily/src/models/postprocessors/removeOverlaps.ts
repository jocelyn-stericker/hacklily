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
    var vs = rs.map(r => new Cola.vpsc.Variable(r.cx(), r.mxmlBox.fixed ? Number.POSITIVE_INFINITY : 1));
    var cs = Cola.vpsc.generateXConstraints(rs, vs);
    var solver = new Cola.vpsc.Solver(vs, cs);
    solver.solve();
    vs.forEach((v, i) => rs[i].setXCentre(v.position()));
    vs = rs.map(function (r) {
        return new Cola.vpsc.Variable(r.cy());
    });
    cs = Cola.vpsc.generateYConstraints(rs, vs);
    solver = new Cola.vpsc.Solver(vs, cs);
    solver.solve();
    vs.forEach((v, i) => rs[i].setYCentre(v.position()));
}

function removeOverlaps(options: Engine.Options.ILayoutOptions, bounds: Engine.Options.ILineBounds,
        measures: Engine.Measure.IMeasureLayout[]): Engine.Measure.IMeasureLayout[] {

    let measures$: Engine.Measure.IMeasureLayout[] = measures; // FIXME We should detach
    let boxes: IVPSCLayoutRect[] = [];

    _.forEach(measures$, function centerThings(measure, idx) {
        _.forEach(measure.elements, function(segment, si) {
            _.forEach(segment, function(element, j) {
                _.forEach(element.boundingBoxes$, box => {
                    let rect: IVPSCLayoutRect = <any> new Cola.vpsc.Rectangle(
                        element.barX + box.defaultX, element.barX + box.defaultX + box.w,
                        box.defaultY - box.h, box.defaultY);
                    rect.mxmlBox = box;
                    rect.parent = element;
                    boxes.push(rect);
                });
            });
        });
    });

    colaRemoveOverlapsSomeFixed(boxes);
    _.forEach(boxes, box => {
        let expectedX = box.parent.barX + box.mxmlBox.defaultX;
        let expectedY = box.mxmlBox.defaultY - box.mxmlBox.h;
        let actualX = box.x;
        let actualY = box.y;
        box.mxmlBox.relativeX = actualX - expectedX;
        box.mxmlBox.relativeY = expectedY - actualY;
    });

    return measures$;
}

export = removeOverlaps;
