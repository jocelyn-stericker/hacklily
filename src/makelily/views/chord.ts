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

import React                = require("react");
import _                    = require("lodash");
let $                       = React.createFactory;

import Chord                = require("../models/chord");
import Note                 = require("./note");
import Rest                 = require("./rest");

/**
 * Renders notes and their notations.
 */
class ChordView extends React.Component<{layout: Chord.IChordLayout}, void> {
    render(): React.ReactElement<any> {
        let layout = this.props.layout;
        let spec = layout.model;

        // let lyKey = 0;
        // let lyrics = _.chain(<MusicXML.Note[]><any>spec)
        //                 .map(n => n.lyrics)
        //                 .filter(l => !!l)
        //                 .flatten(true)
        //                 .filter((l: MusicXML.Lyric) => !!l)
        //                 .map((l: MusicXML.Lyric) => {
        //                     var text: any[] = [];
        //                     var currSyllabic = MusicXML.SyllabicType.Single;
        //                     for (var i = 0; i < l.lyricParts.length; ++i) {
        //                         switch(l.lyricParts[i]._class) {
        //                             case "Syllabic":
        //                                 var syllabic = <MusicXML.Syllabic> l.lyricParts[i];
        //                                 currSyllabic = syllabic.data;
        //                                 break;
        //                             case "Text":
        //                                 var textPt = <MusicXML.Text> l.lyricParts[i];
        //                                 var width = SMuFL.bboxes["noteheadBlack"][0]*10;
        //                                 text.push(React.DOM.text({
        //                                         textAnchor: "middle",
        //                                         fontSize: textPt.fontSize || "22",
        //                                         key: ++lyKey
        //                                         // x: width/2 + (spec.x),
        //                                         // y: 60      + (spec.y)
        //                                     }, textPt.data));
        //                         }
        //                     };
        //                     return text;
        //                 })
        //                 .flatten()
        //                 .value();

        // var dotOffset = SMuFL.bboxes["noteheadBlack"][0]*10 + 6; // TODO: Correct notehead

        if (!!spec[0].rest) {
            return $(Rest)({
                clef: layout.clef,
                multipleRest: layout.multipleRest,
                spec: spec[0]
            });
        }

        return React.DOM.g(null,
            _.map(spec, (spec, idx) => $(Note)({
                key: "n_" + idx,

                clef: layout.clef,
                spec: spec,
                offsetX: 0,
                onLedger: false
            }))
        );
    }

    getChildContext() {
        return {
            originX:        this.context.originX + this.props.layout.x$,
            originY:        this.context.originY
        };
    }
}

module ChordView {
    export var contextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
    export var childContextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
}

export = ChordView;
