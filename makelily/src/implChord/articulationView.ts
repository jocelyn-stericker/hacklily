/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {PrintStyle, Placement, Articulations, AboveBelow} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, ReactElement, PropTypes} from "react";

import Glyph from "../private/views/glyph";

type MXMLArticulation = PrintStyle | Placement;

export interface IProps {
    articulation: Articulations;
    key?: string | number;
    defaultX?: number;
}

export default class Articulation extends Component<IProps, void> {
    static contextTypes = {
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
    };

    render() {
        const model = this.props.articulation;
        let children: ReactElement<any>[] = [];
        // Articulations not in MusicXML:
        // "articAccentStaccatoAbove": "U+E4B0",
        // "articAccentStaccatoBelow": "U+E4B1",
        // "articLaissezVibrerAbove": "U+E4BA",
        // "articLaissezVibrerBelow": "U+E4BB",
        // "articMarcatoStaccatoAbove": "U+E4AE",
        // "articMarcatoStaccatoBelow": "U+E4AF",
        // "articStaccatissimoStrokeAbove": "U+E4AA",
        // "articStaccatissimoStrokeBelow": "U+E4AB",
        // "articTenutoAccentAbove": "U+E4B4",
        // "articTenutoAccentBelow": "U+E4B5",
        // "articTenutoStaccatoBelow": "U+E4B3",
        //
        // "breathMarkSalzedo": "U+E4D5",
        // "breathMarkTick": "U+E4CF",
        // "breathMarkUpbow": "U+E4D0",
        //
        // "caesuraCurved": "U+E4D4",
        // "caesuraShort": "U+E4D3",
        // "caesuraThick": "U+E4D2",

        let append = (type: MXMLArticulation, name: string, directioned = true) => {
            let printStyle = <PrintStyle> type;
            let placement = <Placement> type;
            let direction = (function() {
                if (!directioned) { return ""; }
                switch (placement.placement) {
                    case AboveBelow.Below:
                        return "Below";
                    case AboveBelow.Above:
                    case AboveBelow.Unspecified:
                        return "Above";
                    default:
                        return "Above";
                }
            }());
            children.push($(Glyph)({
                fill: "black",
                glyphName: `${name}${direction}`,
                key: name,
                x: this.props.defaultX + printStyle.defaultX + (printStyle.relativeX || 0),
                y: this.context.originY - printStyle.defaultY - (printStyle.relativeY || 0)
            }));
        };

        if (model.accent) {
            append(model.accent, "articAccent");
        }
        if (model.breathMark) {
            append(model.breathMark, "breathMarkComma", false);
        }
        if (model.caesura) {
            append(model.caesura, "caesura", false);
        }
        if (model.detachedLegato) {
            append(model.detachedLegato, "articTenutoStaccato");
        }
        if (model.doit) {
            // TODO: hope some bass rendering library comes along and saves us ...
        }
        if (model.falloff) {
            // ...
        }
        if (model.plop) {
            // ...
        }
        if (model.scoop) {
            // ...
        }
        if (model.spiccato) {
            append(model.spiccato, "articStaccatissimoWedge");
        }
        if (model.staccatissimo) {
            append(model.staccatissimo, "articStaccatissimo");
        }
        if (model.staccato) {
            append(model.staccato, "articStaccato");
        }
        if (model.stress) {
            append(model.stress, "articStress");
        }
        if (model.strongAccent) {
            append(model.strongAccent, "articMarcato");
        }
        if (model.tenuto) {
            append(model.tenuto, "articTenuto");
        }
        if (model.unstress) {
            append(model.unstress, "articUnstress");
        }

        switch (children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return DOM.g(null,
                    children
                );
        }
    }
}

