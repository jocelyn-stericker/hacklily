"use strict";
/**
 * @license
 * This file is part of Makelily
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var aphrodite_1 = require("aphrodite");
var React = require("react");
/**
 * Renders help links in the note tool.
 */
var NoteAdditionalHelp = /** @class */ (function (_super) {
    __extends(NoteAdditionalHelp, _super);
    function NoteAdditionalHelp() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoteAdditionalHelp.prototype.render = function () {
        var _a = this.props, kind = _a.kind, onHide = _a.onHide;
        return (React.createElement("span", { className: aphrodite_1.css(styles.overlay), onClick: onHide, role: "button" },
            React.createElement("span", { className: aphrodite_1.css(styles.widget) },
                kind === 'keyboard' && this.renderKeyboard(),
                kind === 'midi' && this.renderMIDI(),
                kind === 'mouse' && this.renderMouse(),
                kind === 'relative' && this.renderRelative(),
                kind === 'whyNotEdit' && this.renderWhyNotEdit(),
                React.createElement("p", null,
                    React.createElement("a", { href: "javascript:void(0)", role: "button", onClick: onHide }, "Close")))));
    };
    // tslint:disable-next-line:max-func-body-length
    NoteAdditionalHelp.prototype.renderKeyboard = function () {
        return (React.createElement("span", null,
            React.createElement("h3", null, "What keyboard shortcuts are available?"),
            React.createElement("table", { style: { borderWidth: 1, borderColor: 'black' } },
                React.createElement("tr", null,
                    React.createElement("td", null, "1-7"),
                    React.createElement("td", null,
                        "Select note duration (1 = 32",
                        React.createElement("sup", null, "nd"),
                        " note, 7 = whole note) for the next note you enter.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "."),
                    React.createElement("td", null, "Toggle the number of dots to add to the next note you enter.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "0, -, ="),
                    React.createElement("td", null, "Sets or unsets the type of accidental for the next note you enter.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "a-g"),
                    React.createElement("td", null, "Insert a note where the cursor is. Creates a new bar if cursor is at the end of a bar.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "r"),
                    React.createElement("td", null, "Insert a rest where the cursor is. Creates a new bar if cursor is at the end of a bar.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "shift + a-g"),
                    React.createElement("td", null, "Add a note to the previous note or chord.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "\u2191"),
                    React.createElement("td", null, "Bump the previous note up an octave.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "\u2193"),
                    React.createElement("td", null, "Bump the previous note down an octave.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "\u2190"),
                    React.createElement("td", null, "Move the cursor back a note or rest.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "\u2192"),
                    React.createElement("td", null, "Move the cursor forward a note or rest.")),
                React.createElement("tr", null,
                    React.createElement("td", null, "ctrl+z or \u2318+z"),
                    React.createElement("td", null, "Undo the previous action")),
                React.createElement("tr", null,
                    React.createElement("td", null, "shift+ctrl+z or shift+\u2318+z"),
                    React.createElement("td", null, "Redo an action that was undone.")))));
    };
    NoteAdditionalHelp.prototype.renderMIDI = function () {
        return (React.createElement("span", null,
            React.createElement("h3", null, "How do I enter sheet music using a MIDI keyboard?"),
            React.createElement("p", null, "This feature is coming soon\u2026")));
        /*<p>
          To insert notes, plug your MIDI keyboard in and
          press a key. Use your computer keyboard or mouse to
          choose the duration of notes to insert, to insert rests,
          and to perform other actions.
        </p>
        <p>
          MIDI keyboard editing is supported in recent versions
          of Chrome and Opera.
        </p>*/
    };
    NoteAdditionalHelp.prototype.renderMouse = function () {
        return (React.createElement("span", null,
            React.createElement("h3", null, "How do I enter sheet music using a mouse?"),
            React.createElement("p", null,
                React.createElement("strong", null, "To insert notes,"),
                ' ',
                "click on the desired duration of music in the toolbar (e.g., quarter note or half note). Then, click on any desired modifiers to that note (e.g., dots, tuplets, or accidentals). Finally, click on the staff where you want the note."),
            React.createElement("p", null,
                React.createElement("strong", null, "To insert chords,"),
                ' ',
                "pick a note or chord to add a note to, and click above or below it to add that note."),
            React.createElement("p", null,
                React.createElement("strong", null, "To insert rests,"),
                ' ',
                "click the rest icon beside the sharp icon on the toolbar, then insert it as you would a note."),
            React.createElement("p", null,
                React.createElement("strong", null, "To add another bar,"),
                ' ',
                "click the \"Add Bar\" option on the toolbar."),
            React.createElement("p", null,
                React.createElement("strong", null, "Tip:"),
                " you can undo and redo any changes using the undo and redo buttons, so don't be afraid to explore.")));
    };
    NoteAdditionalHelp.prototype.renderRelative = function () {
        return (React.createElement("span", null,
            React.createElement("h3", null, "What is relative output?"),
            React.createElement("p", null,
                "Use ",
                React.createElement("code", null, "\\\\relative"),
                " output mode if you are inserting code into a",
                React.createElement("code", null, "\\\\relative"),
                " block, and leave it unchecked if your song uses absolute mode."),
            React.createElement("p", null, "From the LilyPond manual, absolute octave entry requires specifying the octave for every single note. Relative octave entry, in contrast, specifies each octave in relation to the last note: changing one note\u2019s octave will affect all of the following notes."),
            React.createElement("p", null,
                "If this checkbox is not checked, the octave of every note will be explicitly spelled out.",
                ' ',
                React.createElement("code", null, "c'"),
                " will always mean middle C. In relative mode, ",
                React.createElement("code", null, "c'")),
            React.createElement("p", null, "When using this mode, after inserting bars of music, you may need to adjust the octave of the first note.")));
    };
    NoteAdditionalHelp.prototype.renderWhyNotEdit = function () {
        return (React.createElement("span", null,
            React.createElement("h3", null, "What features does this tool have?"),
            React.createElement("p", null, "Use this tool to generate LilyPond markup for one or more bars of notes in single voice and staff. You can enter notes using a mouse, computer keyboard, or MIDI keyboard. This tool does not support editing existing LilyPond markup."),
            React.createElement("p", null, "This tool can insert notes with their corresponding dynamics and markings. Keep an eye out for other tools that help generate LilyPond markup for other elements of sheet music!"),
            React.createElement("p", null, "This tool only supports a small subset of LilyPond's features, but hopefully saves some time when transcribing music.")));
    };
    return NoteAdditionalHelp;
}(React.Component));
exports.default = NoteAdditionalHelp;
// tslint:disable-next-line typedef
var styles = aphrodite_1.StyleSheet.create({
    overlay: {
        background: 'rgba(0, 0, 0, 0.8)',
        bottom: 0,
        cursor: 'pointer',
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 100000,
    },
    widget: {
        backgroundColor: '#f6f7f7',
        border: '1px solid black',
        borderRadius: 4,
        cursor: 'auto',
        left: 15,
        marginBottom: 0,
        padding: 15,
        position: 'absolute',
        right: 15,
        top: 50,
    },
});
//# sourceMappingURL=NoteAdditionalHelp.js.map