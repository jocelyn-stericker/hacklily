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

import {Articulations, Placement, Notations, AboveBelow, UprightInverted,
    PrintStyle} from "musicxml-interfaces";
import {forEach} from "lodash";

import {IModel} from "../../engine";
import {bboxes} from "../smufl";

export function articulationDirectionMatters(model: Articulations): boolean {
    return !model.breathMark && !model.caesura;
}

export function articulationGlyph(model: Articulations, direction: string): string {
    if (model.accent) {
        return `articAccent${direction}`;
    }
    if (model.breathMark) {
        return `breathMarkComma`;
    }
    if (model.caesura) {
        return `caesura`;
    }
    if (model.detachedLegato) {
        return `articTenutoStaccato${direction}`;
    }
    if (model.doit) {
        return null;
    }
    if (model.falloff) {
        return null;
    }
    if (model.plop) {
        return null;
    }
    if (model.scoop) {
        return null;
    }
    if (model.spiccato) {
        return `articStaccatissimoWedge${direction}`;
    }
    if (model.staccatissimo) {
        return `articStaccatissimo${direction}`;
    }
    if (model.staccato) {
        return `articStaccato${direction}`;
    }
    if (model.stress) {
        return `articStress${direction}`;
    }
    if (model.strongAccent) {
        return `articMarcato${direction}`;
    }
    if (model.tenuto) {
        return `articTenuto${direction}`;
    }
    if (model.unstress) {
        return `articUnstress${direction}`;
    }
    console.warn("Unknown articulation...");
    return null;
}

export interface IGeneralNotation extends PrintStyle, Placement {
}

export function getBoundingRects(model: Notations): IModel.IBoundingRect[] {
    let boxes: IModel.IBoundingRect[] = [];

    forEach(model.accidentalMarks, accidentalMark => {
        // TODO
    });

    forEach(model.arpeggiates, arpeggiate => {
        // TODO
    });

    forEach(model.articulations, (articulation, idx) => {
        forEach(["accent", "breathMark", "caesura", "detachedLegato", "doit", "falloff", "plop",
                    "scoop", "spiccato", "staccatissimo", "staccato", "stress", "strongAccent",
                    "tenuto", "unstress"], type => {
            // TODO: Could this be done any less efficiently?
            if ((<any>model.articulations[idx])[type]) {
                let glyph = articulationGlyph(articulation,
                    (<any>model.articulations[idx])[type].placement ===
                        AboveBelow.Below ? "Below" : "Above");
                (<any>model.articulations[idx])[type] = push(glyph,
                        (<any>model.articulations[idx])[type]);
            }
        });
    });

    forEach(model.dynamics, dynamic => {
        // TODO
    });

    forEach(model.fermatas, (fermata, idx) => {
        if (fermata.type === UprightInverted.Inverted) {
            (<any>fermata).placement = AboveBelow.Below;
        } else {
            (<any>fermata).placement = AboveBelow.Above;
        }
        model.fermatas[idx] = <any> push("fermataAbove", fermata);
    });

    forEach(model.glissandos, glissando => {
        // TODO
    });

    forEach(model.nonArpeggiates, nonArpeggiate => {
        // TODO
    });

    forEach(model.ornaments, ornament => {
        // TODO
    });

    forEach(model.slides, slide => {
        // TODO
    });

    forEach(model.slurs, slur => {
        // TODO
    });

    forEach(model.technicals, technical => {
        // TODO
    });

    forEach(model.tieds, tied => {
        // TODO
    });

    forEach(model.tuplets, tuplet => {
        // TODO
    });

    function push(glyphName: string, notation: IGeneralNotation): IGeneralNotation {
        let box = bboxes[glyphName];
        if (!box) {
            console.warn("Unknown glyph", glyphName);
            return;
        }

        const PADDING = 1.5;

        let printStyle: PrintStyle | IModel.IBoundingRect = Object.create(notation);
        let boundingRect = <IModel.IBoundingRect> printStyle;

        boundingRect.top = box[3]*10;
        boundingRect.bottom = box[1]*10;
        boundingRect.left = box[2]*10;
        boundingRect.right = box[0]*10;
        boundingRect.defaultX = 0;
        if (notation.placement === AboveBelow.Below) {
            boundingRect.defaultY = -30 + box[3]*10*PADDING;
        } else if (notation.placement === AboveBelow.Above) {
            boundingRect.defaultY = 60 + box[3]*10*PADDING;
        } else {
            console.warn("TODO: Set default above/below");
            // above: "fermata", "breathMark", "caesura", "strings"
            // below: "dynamic"
            boundingRect.defaultY = 0;
        }
        boxes.push(<IModel.IBoundingRect> printStyle);

        return printStyle;
    }

    return boxes;
}
