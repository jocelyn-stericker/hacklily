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

import {vpsc as VPSC} from "webcola";
import {forEach} from "lodash";

import {IBoundingRect} from "./private_boundingRect";
import {ILayout} from "./document_model";
import {IMeasureLayout} from "./private_measureLayout";
import {ILayoutOptions} from "./private_layoutOptions";
import {ILineBounds} from "./private_lineBounds";

interface IVPSCLayoutRect extends VPSC.Rectangle {
    mxmlBox: IBoundingRect;
    parent: ILayout;
}

function colaRemoveOverlapsSomeFixed(rs: IVPSCLayoutRect[]): void {
    // Prefer y
    let vs = rs.map(function (r) {
        return new VPSC.Variable(r.cy(), r.mxmlBox.fixed ? Number.POSITIVE_INFINITY : 1);
    });
    let cs = VPSC.generateYConstraints(rs, vs);
    let solver = new VPSC.Solver(vs, cs);
    solver.solve();
    vs.forEach((v, i) => rs[i].setYCentre(v.position()));

    // Move x if needed
    vs = rs.map(r => new VPSC.Variable(r.cx(), r.mxmlBox.fixed ? Number.POSITIVE_INFINITY : 1));
    cs = VPSC.generateXConstraints(rs, vs);
    solver = new VPSC.Solver(vs, cs);
    solver.solve();
    vs.forEach((v, i) => rs[i].setXCentre(v.position()));
}

function removeOverlaps(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {

    forEach(measures, function centerThings(measure, idx) {
        let boxes: IVPSCLayoutRect[] = [];
        forEach(measure.elements, function(segment, si) {
            forEach(segment, function(element, j) {
                forEach(element.boundingBoxes$, box => {
                    if (box.left >= box.right) {
                        console.warn("Invalid left >= right (%s >= %s)", box.left, box.right);
                        box.right = box.left + 0.01;
                    }
                    if (box.top >= box.bottom) {
                        console.warn("Invalid top >= bottom (%s >= %s)", box.top, box.bottom);
                        box.bottom = box.top + 0.01;
                    }
                    if (isNaN(box.top) || isNaN(box.bottom) || isNaN(box.left) || isNaN(box.right)) {
                        console.warn(
                            "Invalid box.{top, bottom, left, right} = {%s, %s, %s, %s}",
                            box.top, box.bottom, box.left, box.right);
                        return;
                    }
                    let rect: IVPSCLayoutRect = <any> new VPSC.Rectangle(
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
        colaRemoveOverlapsSomeFixed(boxes);
        forEach(boxes, box => {
            let expectedX = box.parent.overrideX + box.mxmlBox.defaultX + box.mxmlBox.left;
            let expectedY = box.mxmlBox.defaultY + box.mxmlBox.top;
            let actualX = box.x;
            let actualY = box.y;
            box.mxmlBox.relativeX = actualX - expectedX;
            box.mxmlBox.relativeY = actualY - expectedY;
        });
    });

    return measures;
}

export default removeOverlaps;
