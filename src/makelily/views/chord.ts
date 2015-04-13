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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
let $                       = React.createFactory;

import Chord                = require("../models/chord");
import LedgerLine           = require("./ledgerLine");
import Note                 = require("./note");
import Notehead             = require("./notehead");
import Rest                 = require("./rest");
import Stem                 = require("./stem");
import SMuFL                = require("../models/smufl");

/**
 * Renders notes and their notations.
 */
class ChordView extends React.Component<{layout: Chord.IChordLayout}, void> {
    render(): React.ReactElement<any> {
        let layout = this.props.layout;
        let spec = layout.model;

        // TODO: Generalize this
        let approxNotehead = Notehead.countToNotehead[
            spec[0].noteType.duration];

        let lyKey = 0;
        let lyrics = _.chain(<MusicXML.Note[]><any>spec)
                        .map(n => n.lyrics)
                        .filter(l => !!l)
                        .flatten(true)
                        .filter((l: MusicXML.Lyric) => !!l)
                        .map((l: MusicXML.Lyric) => {
                            var text: any[] = [];
                            var currSyllabic = MusicXML.SyllabicType.Single;
                            for (var i = 0; i < l.lyricParts.length; ++i) {
                                switch(l.lyricParts[i]._class) {
                                    case "Syllabic":
                                        var syllabic = <MusicXML.Syllabic> l.lyricParts[i];
                                        currSyllabic = syllabic.data;
                                        break;
                                    case "Text":
                                        var textPt = <MusicXML.Text> l.lyricParts[i];
                                        var width = SMuFL.bboxes[approxNotehead][0]*10;
                                        text.push(React.DOM.text({
                                                textAnchor: "middle",
                                                fontSize: textPt.fontSize || "22",
                                                key: ++lyKey,
                                                x: this.context.originX + this.props.layout.x$ + width/2,
                                                y: this.context.originY + 60
                                            }, textPt.data));
                                }
                            };
                            return text;
                        })
                        .flatten()
                        .value();

        if (!!spec[0].rest) {
            return $(Rest)({
                multipleRest: layout.model.satieMultipleRest,
                spec: spec[0]
            });
        }

        return React.DOM.g(null,
            _.map(spec, (spec, idx) => $(Note)({
                key: "n" + idx,
                spec: spec
            })),
            spec.satieStem && $(Stem)({
                key: "s",
                bestHeight: spec.satieStem.stemHeight,
                spec: {
                    color: spec[0].stem.color || "#000000",
                    defaultX: 0,
                    defaultY: (spec.satieStem.stemStart - 3)*10,
                    type: spec[0].stem.type
                },
                notehead: approxNotehead
            }),
            _.map(spec.satieLedger, lineNumber => $(LedgerLine)({
                key: "l" + lineNumber,
                spec: {
                    defaultX: 0,
                    defaultY: (lineNumber - 3)*10,
                    color: "#000000"
                },
                notehead: approxNotehead
            })),
            lyrics
        );
    }

    getChildContext() {
        return {
            originX:        this.context.originX,
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
