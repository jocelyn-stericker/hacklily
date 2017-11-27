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
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var aphrodite_1 = require("aphrodite");
var invariant = require("invariant");
var lodash_1 = require("lodash");
var musicxml_interfaces_1 = require("musicxml-interfaces");
var React = require("react");
var ReactDOM = require("react-dom");
var satie_1 = require("./satie/src/satie");
var NoteAdditionalHelp_1 = require("./NoteAdditionalHelp");
var NotePalette_1 = require("./NotePalette");
var tabStyles_1 = require("./tabStyles");
function toSerializable(obj) {
    return JSON.parse(JSON.stringify(obj));
}
exports.toSerializable = toSerializable;
function getOctaveDifference(ours, theirs) {
    function mod(a, b) {
        return a - b * Math.floor(a / b);
    }
    var pitchNames = 'CDEFGAB';
    var ourIndex = pitchNames.indexOf(ours.toUpperCase());
    var theirIndex = pitchNames.indexOf(theirs.toUpperCase());
    var up = mod(ourIndex - theirIndex, 7) > 3;
    var octaveChange = up ? theirIndex < ourIndex : theirIndex > ourIndex;
    if (octaveChange) {
        return up ? 1 : -1;
    }
    return 0;
}
var songTemplate = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 3.0 Partwise//EN\"\n                                \"http://www.musicxml.org/dtds/partwise.dtd\">\n<score-partwise>\n  <identification>\n    <miscellaneous>\n      <miscellaneous-field name=\"description\">\n        A song created at https://www.hacklily.org\n      </miscellaneous-field>\n    </miscellaneous>\n  </identification>\n  <defaults>\n    <system-layout>\n      <system-margins>\n        <left-margin>0</left-margin>\n        <right-margin>0</right-margin>\n      </system-margins>\n      <system-distance>131</system-distance>\n      <top-system-distance>0</top-system-distance>\n    </system-layout>\n  </defaults>\n  <part-list>\n    <score-part id=\"P1\">\n      <part-name>MusicXML Part</part-name>\n    </score-part>\n  </part-list>\n  <!--=========================================================-->\n  <part id=\"P1\">\n    <measure number=\"1\">\n      <print page-number=\"1\">\n      <system-layout>\n        <system-margins>\n          <left-margin>0</left-margin>\n          <right-margin>0</right-margin>\n        </system-margins>\n        <system-distance>131</system-distance>\n        <top-system-distance>40</top-system-distance>\n      </system-layout>\n      </print>\n      <attributes>\n        <divisions>1</divisions>\n        <key>\n          <fifths>-3</fifths>\n          <mode>minor</mode>\n        </key>\n        <time symbol=\"common\">\n          <beats>4</beats>\n          <beat-type>4</beat-type>\n        </time>\n        <clef>\n          <sign>G</sign>\n          <line>2</line>\n        </clef>\n      </attributes>\n      <note>\n        <rest measure=\"yes\" />\n        <duration>4</duration>\n        <voice>1</voice>\n        <type>whole</type>\n      </note>\n    </measure>\n  </part>\n</score-partwise>";
/**
 * A tool which allows notes to be entered with a mouse or keyboard.
 * This may also eventually support MIDI keyboards.
 */
var ToolNoteEdit = /** @class */ (function (_super) {
    __extends(ToolNoteEdit, _super);
    function ToolNoteEdit() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            accidental: null,
            canonicalOperations: null,
            direction: null,
            dots: 0,
            editType: 'N',
            lastPath: null,
            lastPitch: null,
            notation: null,
            note: musicxml_interfaces_1.Count.Eighth,
            operations: null,
            redoStack: [],
            relativeMode: true,
            showAdditionalHelp: null,
            showHelp: true,
            src: songTemplate,
            timeModification: null,
            undoStack: [null],
        };
        _this.applyPreviewPatch = function (patch, path, pitch) {
            if (path === void 0) { path = null; }
            if (pitch === void 0) { pitch = null; }
            var operations = _this.state.canonicalOperations;
            _this.setState({
                lastPath: path,
                lastPitch: pitch,
                operations: _this.song.createPreviewPatch(operations, { raw: patch }),
            });
        };
        _this.applyUndoablePatch = function (patch, doNotEmit) {
            if (doNotEmit === void 0) { doNotEmit = false; }
            var operations = _this.state.canonicalOperations;
            var newOperations = _this.song.createCanonicalPatch(operations, { raw: patch });
            var undoStack = _this.state.undoStack.concat([_this.state.canonicalOperations]);
            _this.setState({
                canonicalOperations: newOperations,
                lastPath: null,
                lastPitch: null,
                operations: newOperations,
                redoStack: [],
                undoStack: undoStack,
            }, function () {
                var doc = _this.song.getDocument(_this.state.operations);
                var loc = _this.satieKeyToBeat(doc, doc._visualCursor.key);
                if (!loc) {
                    return;
                }
            });
        };
        _this.clearPreview = function () {
            _this.setState({ operations: _this.state.canonicalOperations });
        };
        _this.handleError = function (err) {
            console.warn(err);
        };
        _this.handleInsertLyClicked = function () {
            _this.props.onInsertLy(_this.generateLy());
        };
        _this.handleKeyDown = function (ev) {
            if (ev.keyCode === 8) {
                // backspace -- prevent navigation in FF and others
                ev.preventDefault();
            }
            else if (ev.keyCode === 37) {
                _this.moveCursor(-1);
            }
            else if (ev.keyCode === 38) {
                _this.updateOctave(1);
                ev.preventDefault();
            }
            else if (ev.keyCode === 39) {
                _this.moveCursor(2);
            }
            else if (ev.keyCode === 40) {
                _this.updateOctave(-1);
                ev.preventDefault();
            }
            else if (ev.keyCode === 90 /* z */ && (ev.metaKey || ev.ctrlKey)) {
                ev.preventDefault();
                if (ev.shiftKey) {
                    _this.redo();
                }
                else {
                    _this.undo();
                }
            }
            return true;
        };
        // tslint:disable-next-line:max-func-body-length cyclomatic-complexity
        _this.handleKeyPress = function (ev) {
            var key = (ev.key || String.fromCharCode(ev.keyCode)).toUpperCase();
            if ((key === 'R' || key === 'C' || key === 'V') && (ev.metaKey || ev.ctrlKey)) {
                // Support certain default browser operations by not preventing default.
                return true;
            }
            ev.preventDefault();
            if (ev.metaKey || ev.ctrlKey) {
                return false;
            }
            if (_this.handleKeyPressSetAccidental(key)) {
                return false;
            }
            if (_this.handleKeyPressSetDuration(key)) {
                return false;
            }
            if (_this.handleKeyPressSetEditType(key)) {
                return false;
            }
            if (key === '.') {
                _this.setDots(((_this.state.dots || 0) + 1) % 4);
                return false;
            }
            if ('ABCDEFG'.indexOf(key) !== -1) {
                var doc = _this.song.getDocument(_this.state.canonicalOperations);
                if (!doc._visualCursor) {
                    return false;
                }
                if (ev.shiftKey) {
                    _this.updateChord(key);
                    return false;
                }
                var path_1 = doc._visualCursor.key.replace('SATIE', '').split('_');
                var measureNum = parseInt(path_1[0], 10);
                var currMeasure = doc.measures.find(function (i) {
                    return i.uuid === parseInt(path_1[0], 10);
                });
                // Get the previous pitch
                // HACK -- this does not support multiple voices, parts, non-linear measures
                var previousPitch = void 0;
                for (var i = 0; i <= currMeasure.idx; i += 1) {
                    var measure = doc.measures[i];
                    var voice = measure.parts.P1.voices[1];
                    for (var j = 0; j < voice.length; j += 1) {
                        if (i === currMeasure.idx && j === parseInt(path_1[5], 10)) {
                            break;
                        }
                        var el = voice[j];
                        if (doc.modelHasType(el, satie_1.Type.Chord)) {
                            var note = el[0];
                            if (!note.rest) {
                                previousPitch = note.pitch;
                            }
                        }
                    }
                }
                var pitch_1 = _this.getPitch({
                    octave: previousPitch ?
                        previousPitch.octave + getOctaveDifference(previousPitch.step, key) :
                        4,
                    step: key,
                }, doc, currMeasure);
                if (path_1[3] === 'voices') {
                    var patch = satie_1.Patch.createPatch(false, doc, measureNum, path_1[2], function (partBuilder) { return partBuilder
                        .voice(parseInt(path_1[4], 10), function (voice) { return voice
                        .at(parseInt(path_1[5], 10))
                        .insertChord([function (note) { return _this.state.accidental ?
                            note
                                .pitch(pitch_1)
                                .rest(undefined)
                                .dots(lodash_1.times(_this.state.dots, function () { return ({}); }))
                                .noteType(function (noteType) { return noteType
                                .duration(_this.state.note); })
                                .color('#000000') :
                            note
                                .pitch(pitch_1)
                                .rest(undefined)
                                .dots(lodash_1.times(_this.state.dots, function () { return ({}); }))
                                .noteType(function (noteType) { return noteType
                                .duration(_this.state.note); })
                                .color('#000000'); },
                    ])
                        .next()
                        .addVisualCursor(); }); });
                    _this.applyUndoablePatch(patch);
                    _this.playNote(pitch_1);
                }
            }
            return true;
        };
        _this.handleMouseClick = function (ev) {
            _this.handler(ev, false);
        };
        _this.handleMouseMove = function (ev) {
            if (lodash_1.isEqual(_this.state.lastPath, ev.path) && lodash_1.isEqual(ev.pitch, _this.state.lastPitch)) {
                return;
            }
            if (!_this.handler(ev, true)) {
                _this.clearPreview();
            }
        };
        _this.handleShowHelpKeyboard = function () {
            _this.setState({
                showAdditionalHelp: 'keyboard',
            });
        };
        _this.handleShowHelpMIDI = function () {
            _this.setState({
                showAdditionalHelp: 'midi',
            });
        };
        _this.handleShowHelpMouse = function () {
            _this.setState({
                showAdditionalHelp: 'mouse',
            });
        };
        _this.handleShowHelpNone = function () {
            _this.setState({
                showAdditionalHelp: null,
            });
        };
        _this.handleShowHelpRelative = function () {
            _this.setState({
                showAdditionalHelp: 'relative',
            });
        };
        _this.handleShowHelpWhyNotEdit = function () {
            _this.setState({
                showAdditionalHelp: 'whyNotEdit',
            });
        };
        _this.handleSongScroll = function (ev) {
            var showHelp = ev.currentTarget.scrollTop === 0;
            if (showHelp !== _this.state.showHelp) {
                _this.setState({
                    showHelp: showHelp,
                });
            }
        };
        _this.moveCursor = function (direction) {
            var doc = _this.song.getDocument(_this.state.canonicalOperations);
            if (!doc._visualCursor) {
                return true;
            }
            var path = doc._visualCursor.key.replace('SATIE', '').split('_');
            var measureUUID = parseInt(path[0], 10);
            var part = path[2];
            if (path[3] !== 'voices') {
                return true;
            }
            var voiceNum = parseInt(path[4], 10);
            var elIdx = parseInt(path[5], 10);
            var currMeasure = doc.measures
                .find(function (i) { return i.uuid === measureUUID; });
            var currSegment = currMeasure
                .parts[part]
                .voices[voiceNum];
            var targetIndecies = _this.getValidCursorTargetIndecies(doc, currSegment);
            var nextIdx = targetIndecies.reduce(function (memo, idx) {
                if (direction < 0 && idx < elIdx) {
                    return idx;
                }
                else if (direction > 0 && idx > elIdx && memo === null) {
                    return idx + 1;
                }
                return memo;
            }, null);
            if (nextIdx === null) {
                if (direction > 0) {
                    _this.moveCursorToStartOfMeasure(part, voiceNum, doc.measures[currMeasure.idx + 1]);
                }
                else if (direction < 0) {
                    _this.moveCursorToEndOfMeasure(part, voiceNum, doc.measures[currMeasure.idx - 1]);
                }
                else {
                    invariant(false, 'Invalid direction');
                }
            }
            else {
                var patch = satie_1.Patch.createPatch(false, doc, measureUUID, part, function (partBuilder) { return partBuilder
                    .voice(voiceNum, function (voice) { return voice
                    .at(nextIdx)
                    .addVisualCursor(); }); });
                _this.applyUndoablePatch(patch);
            }
            return false;
        };
        _this.newMeasure = function () {
            var doc = _this.song.getDocument(_this.state.canonicalOperations);
            var measureCount = doc.measures.length;
            var measureUUID = doc.measures[doc.measures.length - 1].uuid;
            var measureIdx = doc.measures.findIndex(function (m) { return m.uuid === measureUUID; });
            var undoStack = _this.state.undoStack.concat([_this.state.canonicalOperations]);
            var barlineIdx = lodash_1.findIndex(doc.measures[measureIdx].parts.P1.staves[1], function (el) { return doc.modelHasType(el, satie_1.Type.Barline); });
            var operations = _this.song.createCanonicalPatch(_this.state.canonicalOperations, {
                documentBuilder: function (document) { return document
                    .measure(measureUUID, function (measure) { return measure
                    .part('P1', function (part) { return part
                    .staff(1, function (staff) { return staff
                    .at(barlineIdx)
                    .barline(function (barline) { return barline
                    .barStyle(function (style) { return style
                    .data(musicxml_interfaces_1.BarStyleType.Regular); }); }); }); }); })
                    .insertMeasure(measureIdx + 1, function (measure) { return measure
                    .part('P1', function (part) { return part
                    .voice(1, function (voice) { return voice
                    .at(0)
                    .insertChord([
                    function (note) { return note
                        .rest({})
                        .staff(1)
                        .noteType(function (noteType) { return noteType
                        .duration(musicxml_interfaces_1.Count.Whole); }); },
                ]); })
                    .staff(1, function (staff) { return staff
                    .at(1)
                    .insertBarline(function (barline) { return barline
                    .barStyle(function (style) { return style
                    .data(measureCount === measureIdx + 1 ?
                    musicxml_interfaces_1.BarStyleType.LightHeavy :
                    musicxml_interfaces_1.BarStyleType.Regular); }); }); }); }); }); },
            });
            _this.setState({
                canonicalOperations: operations,
                operations: operations,
                redoStack: [],
                undoStack: undoStack,
            });
        };
        _this.redo = function () {
            _this.setState({
                canonicalOperations: _this.state.redoStack[_this.state.redoStack.length - 1],
                operations: _this.state.redoStack[_this.state.redoStack.length - 1],
                redoStack: _this.state.redoStack.slice(0, _this.state.redoStack.length - 1),
                undoStack: _this.state.undoStack.concat(_this.state.operations),
            });
        };
        _this.setAccidental = function (accidental) {
            if (_this.state.accidental === accidental && _this.state.editType === 'N') {
                _this.setState({
                    accidental: null,
                    editType: 'N',
                });
            }
            else {
                _this.setState({
                    accidental: accidental,
                    editType: 'N',
                });
            }
        };
        _this.setDirection = function (direction) {
            _this.setState({
                direction: direction,
                notation: null,
            });
        };
        _this.setDots = function (dots) {
            _this.setState({
                dots: dots,
                editType: _this.state.editType === 'R' ? 'R' : 'N',
            });
        };
        _this.setEditType = function (editType) {
            _this.setState({
                editType: editType,
            });
        };
        _this.setNotation = function (notation) {
            _this.setState({
                direction: null,
                notation: notation,
            });
        };
        _this.setNote = function (note) {
            _this.setState({
                editType: _this.state.editType === 'R' ? 'R' : 'N',
                note: note,
            });
        };
        _this.setSongRef = function (song) {
            _this.song = song;
            if (song) {
                var doc = song.getDocument(_this.state.canonicalOperations);
                var patch = satie_1.Patch.createPatch(false, doc, doc.measures[0].uuid, 'P1', function (part) { return part
                    .staff(1, function (staff) { return staff
                    .at(1)
                    .attributes(function (attributes) {
                    return attributes
                        .clefs([_this.props.clef])
                        .keySignatures([_this.props.keySig])
                        .times([_this.props.time]);
                }); })
                    .voice(1, function (voice) { return voice
                    .at(0)
                    .addVisualCursor(); }); });
                _this.applyUndoablePatch(patch);
            }
        };
        _this.setTimeModification = function (timeModification) {
            _this.setState({
                editType: _this.state.editType === 'R' ? 'R' : 'N',
                timeModification: timeModification,
            });
        };
        _this.undo = function () {
            _this.setState({
                canonicalOperations: _this.state.undoStack[_this.state.undoStack.length - 1],
                operations: _this.state.undoStack[_this.state.undoStack.length - 1],
                redoStack: _this.state.redoStack.concat(_this.state.operations),
                undoStack: _this.state.undoStack.slice(0, _this.state.undoStack.length - 1),
            });
        };
        _this.updateChord = function (newNote) {
            var doc = _this.song.getDocument(_this.state.canonicalOperations);
            if (!doc._visualCursor) {
                return false;
            }
            var path = doc._visualCursor.key.replace('SATIE', '').split('_');
            var currMeasure = doc.measures.find(function (i) {
                return i.uuid === parseInt(path[0], 10);
            });
            if (path[3] !== 'voices') {
                return false;
            }
            // HACK -- this does not support multiple voices, parts, non-linear measures
            var oldPitch;
            var oldDots;
            var oldMeasureUUID;
            var oldIdx;
            var oldNumberOfNotes;
            var oldDuration;
            for (var i = 0; i <= currMeasure.idx; i += 1) {
                var measure = doc.measures[i];
                var voice = measure.parts.P1.voices[1];
                for (var j = 0; j < voice.length; j += 1) {
                    if (i === currMeasure.idx && j === parseInt(path[5], 10)) {
                        break;
                    }
                    var el = voice[j];
                    if (doc.modelHasType(el, satie_1.Type.Chord)) {
                        var note = el[el.length - 1];
                        if (!note.rest) {
                            oldPitch = note.pitch;
                            oldDuration = note.noteType.duration;
                            oldDots = note.dots.length;
                            oldMeasureUUID = measure.uuid;
                            oldIdx = j;
                            oldNumberOfNotes = el.length;
                        }
                    }
                }
            }
            if (oldPitch) {
                var newPitch_1 = _this.getPitch({
                    octave: oldPitch ?
                        oldPitch.octave + getOctaveDifference(oldPitch.step, newNote) :
                        4,
                    step: newNote,
                }, doc, currMeasure);
                var patch = satie_1.Patch.createPatch(false, doc, oldMeasureUUID, path[2], function (partBuilder) { return partBuilder
                    .voice(1, function (oldVoice) { return oldVoice
                    .at(oldIdx)
                    .insertNote(oldNumberOfNotes, function (noteBuilder) { return noteBuilder
                    .pitch(newPitch_1)
                    .rest(undefined)
                    .dots(lodash_1.times(oldDots, function () { return ({}); }))
                    .noteType(function (noteType) { return noteType
                    .duration(oldDuration); }); }); }); });
                _this.applyUndoablePatch(patch);
                _this.playNote(newPitch_1);
                return true;
            }
            return false;
        };
        _this.updateOctave = function (octave) {
            var doc = _this.song.getDocument(_this.state.canonicalOperations);
            if (!doc._visualCursor) {
                return false;
            }
            var path = doc._visualCursor.key.replace('SATIE', '').split('_');
            var currMeasure = doc.measures.find(function (i) {
                return i.uuid === parseInt(path[0], 10);
            });
            if (path[3] !== 'voices') {
                return false;
            }
            // HACK -- this does not support multiple voices, parts, non-linear measures
            var oldPitch;
            var oldMeasureUUID;
            var oldIdx;
            var oldNoteNumber;
            for (var i = 0; i <= currMeasure.idx; i += 1) {
                var measure = doc.measures[i];
                var voice = measure.parts.P1.voices[1];
                for (var j = 0; j < voice.length; j += 1) {
                    if (i === currMeasure.idx && j === parseInt(path[5], 10)) {
                        break;
                    }
                    var el = voice[j];
                    if (doc.modelHasType(el, satie_1.Type.Chord)) {
                        oldNoteNumber = el.length - 1;
                        var note = el[oldNoteNumber];
                        if (!note.rest) {
                            oldPitch = note.pitch;
                            oldMeasureUUID = measure.uuid;
                            oldIdx = j;
                        }
                    }
                }
            }
            if (oldPitch) {
                var updatedPitch_1 = __assign({}, oldPitch, { octave: oldPitch.octave + octave });
                var patch = satie_1.Patch.createPatch(false, doc, oldMeasureUUID, path[2], function (partBuilder) { return partBuilder
                    .voice(1, function (oldVoice) { return oldVoice
                    .at(oldIdx)
                    .note(oldNoteNumber, function (oldNote) {
                    return oldNote.pitch(updatedPitch_1);
                }); }); });
                _this.applyUndoablePatch(patch);
                _this.playNote(updatedPitch_1);
                return true;
            }
            return false;
        };
        return _this;
    }
    ToolNoteEdit.prototype.componentDidMount = function () {
        ReactDOM.findDOMNode(this).focus();
    };
    // tslint:disable-next-line:max-func-body-length
    ToolNoteEdit.prototype.render = function () {
        var _this = this;
        var editType = this.state.editType;
        var tallPalette = editType === 'P';
        var song = null;
        if (this.state.src) {
            song = (React.createElement(satie_1.Song, { baseSrc: this.state.src, onError: this.handleError, patches: this.state.operations, onMouseClick: this.handleMouseClick, onMouseMove: this.handleMouseMove, pageClassName: aphrodite_1.css(styles.song), ref: this.setSongRef }));
        }
        return (React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.tool), tabIndex: 0, onKeyPress: this.handleKeyPress, onKeyDown: this.handleKeyDown, role: "textbox" },
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.help, this.state.showHelp && tabStyles_1.default.helpVisible) },
                React.createElement("i", { className: "fa-info-circle fa" }),
                ' ',
                "Generate markup",
                React.createElement("sup", null,
                    React.createElement("a", { href: "javascript:void(0)", onClick: this.handleShowHelpWhyNotEdit, role: "button" }, "?")),
                ' ',
                "for notes in your song using a",
                ' ',
                React.createElement("a", { href: "javascript:void(0)", onClick: this.handleShowHelpMouse, role: "button" }, "mouse"),
                ",",
                ' ',
                React.createElement("a", { href: "javascript:void(0);", onClick: this.handleShowHelpKeyboard, role: "button" }, "computer keyboard"),
                ", or",
                ' ',
                React.createElement("a", { href: "javascript:void(0);", onClick: this.handleShowHelpMIDI, role: "button" }, "MIDI keyboard"),
                "."),
            this.renderAdditionalHelp(),
            this.renderPalette(),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("div", { className: aphrodite_1.css(styles.songContainer, tallPalette && styles.songContainerSmall), onScroll: this.handleSongScroll }, song)),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.spacer) }),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("span", { className: aphrodite_1.css(tabStyles_1.default.outputOptions) },
                    React.createElement("input", { type: "checkbox", checked: this.state.relativeMode, onChange: function () { return _this.setState({ relativeMode: !_this.state.relativeMode }); }, "aria-checked": false, id: "toolnoteedit-relative" }),
                    React.createElement("label", { htmlFor: "toolnoteedit-relative" },
                        React.createElement("code", null, "\\relative"),
                        " mode",
                        React.createElement("sup", null,
                            React.createElement("a", { href: "javascript:void(0)", onClick: this.handleShowHelpRelative, role: "button" }, "?")),
                        ' ')),
                React.createElement("pre", { className: aphrodite_1.css(tabStyles_1.default.lyPreview) }, this.generateLy()),
                React.createElement("button", { className: aphrodite_1.css(tabStyles_1.default.insert), onClick: this.handleInsertLyClicked }, "Insert this code into Hacklily"))));
        // tslint:enable:react-a11y-anchors
    };
    // tslint:disable-next-line:max-func-body-length
    ToolNoteEdit.prototype.generateLy = function () {
        if (!this.song) {
            // still loading...
            return '';
        }
        var relativeMode = this.state.relativeMode;
        var prevPitch = null;
        var prevDuration = null;
        var doc = this.song.getDocument(this.state.canonicalOperations);
        var ly = '';
        // tslint:disable-next-line:max-func-body-length
        doc.measures.forEach(function (measure) {
            var part = measure.parts.P1;
            var voice = part.voices[1];
            var staff = part.staves[1];
            var voiceDiv = 0;
            var staffDiv = 0;
            var staffModelIdx = 0;
            // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
            voice.forEach(function (model) {
                if (doc.modelHasType(model, satie_1.Type.Chord)) {
                    if (model.length < 1) {
                        console.warn('Expected chords to have at least one note');
                        return;
                    }
                    var noteForRythm = model[0];
                    if (noteForRythm.rest) {
                        ly += 'r';
                    }
                    else {
                        var pitches = '';
                        if (model.length > 1) {
                            pitches += '<';
                        }
                        // tslint:disable-next-line:prefer-for-of
                        for (var i = 0; i < model.length; i += 1) {
                            var note = model[i];
                            pitches += note.pitch.step.toLowerCase();
                            if (note.pitch.alter === -1) {
                                pitches += 'es';
                            }
                            else if (note.pitch.alter === 1) {
                                pitches += 'is';
                            }
                            var octaveOffset = relativeMode ?
                                (prevPitch ?
                                    getOctaveDifference(note.pitch.step, prevPitch.step) +
                                        note.pitch.octave - prevPitch.octave :
                                    0) :
                                note.pitch.octave - 3;
                            if (octaveOffset > 0) {
                                for (var j = 0; j < octaveOffset; j += 1) {
                                    pitches += '\'';
                                }
                            }
                            else if (octaveOffset < 0) {
                                for (var j = 0; j < -octaveOffset; j += 1) {
                                    pitches += ',';
                                }
                            }
                            if (i + 1 < model.length) {
                                pitches += ' ';
                            }
                            prevPitch = note.pitch;
                        }
                        if (model.length > 1) {
                            prevPitch = model[0].pitch; // the first note in a chord affects future chords
                            pitches += '>';
                        }
                        ly += pitches;
                    }
                    var duration = noteForRythm.noteType.duration;
                    switch (duration) {
                        case prevDuration:
                            break;
                        case musicxml_interfaces_1.Count.Whole:
                            ly += '1';
                            break;
                        case musicxml_interfaces_1.Count.Half:
                            ly += '2';
                            break;
                        case musicxml_interfaces_1.Count.Quarter:
                            ly += '4';
                            break;
                        case musicxml_interfaces_1.Count.Eighth:
                            ly += '8';
                            break;
                        case musicxml_interfaces_1.Count._16th:
                            ly += '16';
                            break;
                        case musicxml_interfaces_1.Count._32nd:
                            ly += '32';
                            break;
                        case musicxml_interfaces_1.Count._64th:
                            ly += '64';
                            break;
                        case musicxml_interfaces_1.Count._128th:
                            ly += '128';
                            break;
                        case musicxml_interfaces_1.Count._256th:
                            ly += '256';
                            break;
                        case musicxml_interfaces_1.Count._512th:
                            ly += '512';
                            break;
                        case musicxml_interfaces_1.Count._1024th:
                            ly += '1024';
                            break;
                        default:
                            ly += 'unknown';
                            break;
                    }
                    prevDuration = duration;
                    for (var _i = 0, _a = noteForRythm.dots; _i < _a.length; _i++) {
                        var _b = _a[_i];
                        ly += '.';
                    }
                    // tslint:disable-next-line:prefer-for-of
                    for (var i = 0; i < model.length; i += 1) {
                        if (model[i].notations) {
                            model[i].notations.forEach(function (notations) {
                                if (notations.fermatas) {
                                    notations.fermatas.forEach(function (fermata) {
                                        if (fermata.shape === musicxml_interfaces_1.NormalAngledSquare.Angled) {
                                            ly += '\\shortfermata';
                                        }
                                        else if (fermata.shape === musicxml_interfaces_1.NormalAngledSquare.Square) {
                                            ly += '\\longfermata';
                                        }
                                        else {
                                            ly += '\\fermata';
                                        }
                                    });
                                }
                                if (notations.articulations) {
                                    notations.articulations.forEach(function (articulations) {
                                        if (articulations.accent) {
                                            ly += '->';
                                        }
                                        if (articulations.tenuto && articulations.staccato) {
                                            ly += '-_'; // portato
                                        }
                                        else {
                                            if (articulations.tenuto) {
                                                ly += '--';
                                            }
                                            if (articulations.staccato) {
                                                ly += '-.';
                                            }
                                        }
                                        if (articulations.staccatissimo) {
                                            ly += '-!';
                                        }
                                        if (articulations.strongAccent) {
                                            ly += '-^';
                                        }
                                    });
                                }
                                if (notations.technicals) {
                                    notations.technicals.forEach(function (technicals) {
                                        if (technicals.harmonic) {
                                            ly += '\\open';
                                        }
                                        if (technicals.stopped) {
                                            ly += '-+';
                                        }
                                        if (technicals.snapPizzicato) {
                                            ly += '\\snappizzicato';
                                        }
                                        if (technicals.upBow) {
                                            ly += '\\upbow';
                                        }
                                        if (technicals.downBow) {
                                            ly += '\\downbow';
                                        }
                                    });
                                }
                            });
                        }
                    }
                    ly += ' ';
                }
                voiceDiv += model.divCount;
                function next() {
                    staffDiv += staff[staffModelIdx].divCount;
                    staffModelIdx += 1;
                }
                for (; staffDiv < voiceDiv && staffModelIdx < staff.length; next()) {
                    var staffModel = staff[staffModelIdx];
                    if (doc.modelHasType(staffModel, satie_1.Type.Direction)) {
                        staffModel.directionTypes.forEach(function (directionType) {
                            if (directionType.dynamics) {
                                var d = directionType.dynamics;
                                if (d.ppp) {
                                    ly += '\\ppp ';
                                }
                                if (d.pp) {
                                    ly += '\\pp ';
                                }
                                if (d.p) {
                                    ly += '\\p ';
                                }
                                if (d.mp) {
                                    ly += '\\mp ';
                                }
                                if (d.mf) {
                                    ly += '\\mf ';
                                }
                                if (d.f) {
                                    ly += '\\f ';
                                }
                                if (d.ff) {
                                    ly += '\\ff ';
                                }
                                if (d.fff) {
                                    ly += '\\fff ';
                                }
                                if (d.fp) {
                                    ly += '\\fp ';
                                }
                                if (d.sf) {
                                    ly += '\\sf ';
                                }
                                if (d.sfz) {
                                    ly += '\\sfz ';
                                }
                                if (d.sfp) {
                                    ly += '\\sfp ';
                                }
                                if (d.rfz) {
                                    ly += '\\rfz ';
                                }
                            }
                        });
                    }
                }
            });
            if (measure.idx + 1 !== doc.measures.length) {
                ly += '|\n';
            }
        });
        return ly.trim();
    };
    ToolNoteEdit.prototype.getPitch = function (apitch, doc, measure) {
        var pitch = {
            alter: apitch.alter,
            octave: apitch.octave,
            step: apitch.step,
        };
        if (this.state.accidental === musicxml_interfaces_1.MxmlAccidental.Sharp) {
            pitch.alter = 1;
        }
        else if (this.state.accidental === musicxml_interfaces_1.MxmlAccidental.Flat) {
            pitch.alter = -1;
        }
        else if (this.state.accidental === musicxml_interfaces_1.MxmlAccidental.Natural) {
            pitch.alter = undefined;
        }
        else {
            // Make the alter according to the key signature.
            var attributes = doc.search(measure.parts.P1.staves[1], 0, satie_1.Type.Attributes)[0];
            var ks = attributes._snapshot.keySignatures[0];
            var accidentals = satie_1.Addons.getAccidentalsFromKey(ks);
            pitch.alter = accidentals[pitch.step];
        }
        return pitch;
    };
    ToolNoteEdit.prototype.getValidCursorTargetIndecies = function (doc, segment) {
        var targetElements = doc.search(segment, 0, satie_1.Type.Chord);
        return targetElements.map(function (el) { return segment.indexOf(el); });
    };
    // tslint:disable-next-line cyclomatic-complexity
    ToolNoteEdit.prototype.handleDirectionEvent = function (doc, measure, measureUUID, ev, isPreview) {
        var path = ev.path;
        var part = measure.parts[path[2]];
        var elIdx = parseInt(path[5], 10);
        var staffSegment = part.staves[1];
        var voiceSegment = part.voices[1];
        var segment = path[3] === 'staves' ? staffSegment : voiceSegment;
        if (!staffSegment) {
            return true;
        }
        var el = path[3] === 'staves' && staffSegment[elIdx] ||
            path[3] === 'voices' && voiceSegment[elIdx];
        var div = 0;
        if (!el || path[3] === 'staves') {
            // XXX: We should also allow placing on top of staff elements
            return false;
        }
        for (var i = 0; i < segment.length && segment[i] !== el; i += 1) {
            div += segment[i].divCount;
        }
        if (this.state.direction) {
            var direction_1 = JSON.parse(JSON.stringify(this.state.direction));
            direction_1.placement = musicxml_interfaces_1.AboveBelow.Below;
            if (direction_1.directionTypes && direction_1.directionTypes[0].dynamics && isPreview) {
                direction_1.directionTypes[0].dynamics.color = '#aeaeae';
            }
            var patch = satie_1.Patch.createPatch(isPreview, doc, measureUUID, 'P1', function (partBuilder) { return partBuilder
                .staff(1, function (staff) { return staff
                .atDiv(div, satie_1.Type.Direction)
                .insertDirection(direction_1); }); });
            if (patch) {
                if (isPreview) {
                    this.applyPreviewPatch(patch, path);
                }
                else {
                    this.applyUndoablePatch(patch);
                }
                return true;
            }
        }
        else if (this.state.notation) {
            var notations_1 = JSON.parse(JSON.stringify(this.state.notation));
            if (el && doc.modelHasType(el, satie_1.Type.Chord)) {
                var patch = satie_1.Patch.createPatch(isPreview, doc, measureUUID, 'P1', function (partBuilder) { return partBuilder
                    .voice(1, function (voice) { return voice
                    .at(elIdx)
                    .note(0, function (note) {
                    if (el[0].notations) {
                        return note.notationsSplice(0, 0, notations_1);
                    }
                    else {
                        return note.notations([notations_1]);
                    }
                }); }); });
                if (patch) {
                    if (isPreview) {
                        this.applyPreviewPatch(patch, path);
                    }
                    else {
                        this.applyUndoablePatch(patch);
                    }
                    return true;
                }
            }
        }
        else {
            return true;
        }
        return false;
    };
    ToolNoteEdit.prototype.handleKeyPressSetAccidental = function (key) {
        if (key === '=') {
            this.setAccidental(musicxml_interfaces_1.MxmlAccidental.Sharp);
            return true;
        }
        if (key === '-') {
            this.setAccidental(musicxml_interfaces_1.MxmlAccidental.Flat);
            return true;
        }
        if (key === '0') {
            this.setAccidental(musicxml_interfaces_1.MxmlAccidental.Natural);
            return true;
        }
        return false;
    };
    ToolNoteEdit.prototype.handleKeyPressSetDuration = function (key) {
        if (key === '1') {
            this.setNote(32);
            return true;
        }
        if (key === '2') {
            this.setNote(16);
            return true;
        }
        if (key === '3') {
            this.setNote(8);
            return true;
        }
        if (key === '4') {
            this.setNote(4);
            return true;
        }
        if (key === '5') {
            this.setNote(2);
            return true;
        }
        if (key === '6') {
            this.setNote(1);
            return true;
        }
        return false;
    };
    ToolNoteEdit.prototype.handleKeyPressSetEditType = function (key) {
        if (key === 'N') {
            this.setEditType('N');
            return true;
        }
        if (key === 'R') {
            this.setEditType('R');
            return true;
        }
        if (key === 'P') {
            this.setEditType('P');
            return true;
        }
        return false;
    };
    /**
     * Changes operations if needed.
     * Returns whether canoncialOperations were changed.
     */
    ToolNoteEdit.prototype.handler = function (ev, isPreview) {
        var path = ev.path;
        var doc = this.song.getDocument(this.state.canonicalOperations);
        var measure = lodash_1.find(doc.measures, function (fmeasure) { return String(fmeasure.uuid) === path[0]; });
        var measureUUID = parseInt(path[0], 10);
        if (!measure || path[1] !== 'parts' || !measure.parts[path[2]]) {
            return false;
        }
        if (this.state.editType === 'P') {
            return this.handleDirectionEvent(doc, measure, measureUUID, ev, isPreview);
        }
        if (path[3] === 'voices') {
            return this.handleVoiceEvent(doc, measure, measureUUID, ev, isPreview);
        } // this would be where we handled staff events...
        return false;
    };
    // tslint:disable-next-line cyclomatic-complexity max-func-body-length
    ToolNoteEdit.prototype.handleVoiceEvent = function (doc, measure, measureUUID, ev, isPreview) {
        var _this = this;
        var path = ev.path;
        var part = measure.parts[path[2]];
        var elIdx = parseInt(path[5], 10);
        if (!ev.pitch) {
            return false;
        }
        var pitch = this.getPitch(ev.pitch, doc, measure);
        var voiceSegment = part.voices[parseInt(path[4], 10)];
        if (!voiceSegment) {
            return true;
        }
        var el = voiceSegment[elIdx];
        if (!el) {
            return true;
        }
        var isChord = doc.modelHasType(el, satie_1.Type.Chord);
        if (!isChord) {
            return false;
        }
        var chord = el;
        var patch;
        var isCurrentNote = chord && lodash_1.some(chord, function (c) {
            return c.pitch &&
                c.pitch.octave === pitch.octave &&
                c.pitch.step === pitch.step;
        });
        if (this.state.editType === 'N' && chord.length === 1 && chord[0].rest ||
            this.state.editType === 'R') {
            patch = satie_1.Patch.createPatch(isPreview, doc, measureUUID, 'P1', function (partBuilderOrig) {
                var partBuilder = partBuilderOrig.voice(1, function (voice) { return voice
                    .note(0, function (note) { return _this.state.editType === 'R' ?
                    note
                        .pitch(null)
                        .rest({ _force: true })
                        .dots(lodash_1.times(_this.state.dots, function () { return ({
                        color: isPreview ? '#cecece' : '#000000',
                    }); }))
                        .noteType(function (noteType) { return noteType
                        .duration(_this.state.note); })
                        .color(isPreview ? '#cecece' : '#000000') :
                    _this.state.accidental ?
                        note
                            .pitch(pitch)
                            .rest(undefined)
                            .dots(lodash_1.times(_this.state.dots, function () { return ({
                            color: isPreview ? '#cecece' : '#000000',
                        }); }))
                            .noteType(function (noteType) { return noteType
                            .duration(_this.state.note); })
                            .color(isPreview ? '#cecece' : '#000000') :
                        note
                            .pitch(pitch)
                            .rest(undefined)
                            .dots(lodash_1.times(_this.state.dots, function () { return ({
                            color: isPreview ? '#cecece' : '#000000',
                        }); }))
                            .noteType(function (noteType) { return noteType
                            .duration(_this.state.note); })
                            .color(isPreview ? '#cecece' : '#000000'); }); }, elIdx);
                if (!isPreview) {
                    partBuilder = partBuilder
                        .voice(1, function (voice) { return voice
                        .at(elIdx + 1)
                        .addVisualCursor(); });
                }
                return partBuilder;
            });
            if (!isPreview) {
                // Play the note
                if (this.state.editType === 'N') {
                    this.playNote(pitch);
                }
            }
        }
        else if (this.state.editType === 'N' && chord.length && !chord[0].rest &&
            chord[0].noteType.duration !== this.state.note &&
            isCurrentNote) {
            patch = satie_1.Patch.createPatch(isPreview, doc, measureUUID, 'P1', function (partBuilder) { return partBuilder
                .voice(1, function (voiceInitial) { return lodash_1.reduce(lodash_1.times(chord.length), function (voice, noteIdx) { return voice
                .note(noteIdx, function (note) { return note
                .dots(chord[0].dots.map(function (dot) {
                var newDot = toSerializable(dot);
                newDot.color = isPreview ? '#cecece' : '#000000';
                return newDot;
            }))
                .noteType(function (noteType) { return noteType
                .duration(_this.state.note); })
                .color(isPreview ? '#cecece' : '#000000'); }); }, voiceInitial); }, elIdx); });
        }
        else if (this.state.editType === 'N' && chord.length && !chord[0].rest &&
            !isCurrentNote) {
            patch = satie_1.Patch.createPatch(isPreview, doc, measureUUID, 'P1', function (partBuilder) { return partBuilder
                .voice(1, function (voice) { return voice
                .insertNote(chord.length, function (note) { return note
                .pitch(pitch)
                .rest(undefined)
                .dots(chord[0].dots.map(function (dot) {
                var newDot = toSerializable(dot);
                newDot.color = isPreview ? '#cecece' : '#000000';
                return newDot;
            }))
                .noteType(function (noteType) { return noteType
                .duration(chord[0].noteType.duration); })
                .color(isPreview ? '#cecece' : '#000000'); }); }, elIdx); });
            if (!isPreview) {
                this.playNote(pitch);
                lodash_1.forEach(chord, function (note) { return _this.playNote(note.pitch); });
            }
        }
        if (patch) {
            if (isPreview) {
                this.applyPreviewPatch(patch, path, pitch);
            }
            else {
                this.applyUndoablePatch(patch);
            }
            return true;
        }
        return false;
    };
    ToolNoteEdit.prototype.moveCursorToEndOfMeasure = function (part, voiceNum, measure) {
        this.moveInMeasure(part, voiceNum, measure, function (indecies) {
            return lodash_1.last(indecies) + 1;
        });
    };
    ToolNoteEdit.prototype.moveCursorToStartOfMeasure = function (part, voiceNum, measure) {
        this.moveInMeasure(part, voiceNum, measure, lodash_1.first);
    };
    ToolNoteEdit.prototype.moveInMeasure = function (part, voiceNum, measure, pickIdx) {
        if (!measure) {
            return;
        }
        var doc = this.song.getDocument(this.state.canonicalOperations);
        var targetIndecies = this.getValidCursorTargetIndecies(doc, measure.parts[part].voices[voiceNum]);
        var nextIdx = pickIdx(targetIndecies);
        var patch = satie_1.Patch.createPatch(false, doc, measure.uuid, part, function (partBuilder) { return partBuilder
            .voice(voiceNum, function (voice) { return voice
            .at(nextIdx)
            .addVisualCursor(); }); });
        this.applyUndoablePatch(patch);
    };
    ToolNoteEdit.prototype.playNote = function (pitch) {
        // tslint:disable-next-line no-console
        console.log('TODO: play', pitch);
    };
    ToolNoteEdit.prototype.renderAdditionalHelp = function () {
        if (this.state.showAdditionalHelp === null) {
            return null;
        }
        return (React.createElement(NoteAdditionalHelp_1.default, { kind: this.state.showAdditionalHelp, onHide: this.handleShowHelpNone }));
    };
    ToolNoteEdit.prototype.renderPalette = function () {
        return (React.createElement(NotePalette_1.default, { accidental: this.state.accidental, direction: this.state.direction, dots: this.state.dots, editType: this.state.editType, notation: this.state.notation, note: this.state.note, redo: this.redo, setAccidental: this.setAccidental, setDirection: this.setDirection, setTimeModification: this.setTimeModification, setDots: this.setDots, setEditType: this.setEditType, setNotation: this.setNotation, setNote: this.setNote, timeModification: this.state.timeModification, newMeasure: this.newMeasure, undo: this.undo }));
    };
    ToolNoteEdit.prototype.satieKeyToBeat = function (doc, key) {
        var path = key.replace('SATIE', '').split('_');
        var measureUUID = parseInt(path[0], 10);
        var part = path[2];
        if (path[3] !== 'voices') {
            return null;
        }
        var voiceNum = parseInt(path[4], 10);
        var elIdx = parseInt(path[5], 10);
        var measure = doc.measures
            .find(function (i) { return i.uuid === measureUUID; });
        var currSegment = measure
            .parts[part]
            .voices[voiceNum];
        var div = 0;
        for (var i = 0; i < elIdx && i < currSegment.length; i += 1) {
            div += currSegment[i].divCount;
        }
        return {
            div: div,
            measure: measure.idx,
        };
    };
    return ToolNoteEdit;
}(React.Component));
exports.default = ToolNoteEdit;
// tslint:disable-next-line typedef
var styles = aphrodite_1.StyleSheet.create({
    newBar: {
        textAlign: 'center',
    },
    song: {
        width: '100%',
    },
    songContainer: {
        marginLeft: -18,
        marginRight: -18,
        marginTop: -48,
        maxHeight: 388,
        overflowX: 'hidden',
        overflowY: 'scroll',
    },
    songContainerSmall: {
        maxHeight: 308,
    },
});
//# sourceMappingURL=ToolNoteEdit.js.map