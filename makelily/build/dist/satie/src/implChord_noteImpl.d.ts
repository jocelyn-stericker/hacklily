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
import { Note, Chord, Rest, Dot, Type, TimeModification, Pitch, Unpitched, NoteheadText, Accidental, Instrument, Lyric, Notations, Stem, Cue, Tie, Play, Grace, Notehead, Beam, NormalBold, NormalItalic, Level, Footnote } from "musicxml-interfaces";
import { IReadOnlyValidationCursor } from "./private_cursor";
import ChordModelImpl from "./implChord_chordImpl";
/**
 * Represents a note in a ChordImpl.
 *
 * Gotchas:
 *  - You need to set a a noteType, not a noteType.duration. Setting noteType.duration
 *    has no effect.
 */
declare class NoteImpl implements Note {
    _class: string;
    _parent: ChordModelImpl;
    _idx: number;
    constructor(parent: ChordModelImpl, idx: number, note: Note, updateParent?: boolean);
    chord: Chord;
    rest: Rest;
    dots: Dot[];
    noteType: Type;
    timeModification: TimeModification;
    pitch: Pitch;
    unpitched: Unpitched;
    noteheadText: NoteheadText;
    accidental: Accidental;
    instrument: Instrument;
    attack: number;
    endDynamics: number;
    lyrics: Lyric[];
    /**
     * Do not modify notations. Instead use notationObj and articulationObj
     */
    notations: Notations[];
    stem: Stem;
    cue: Cue;
    duration: number;
    /**
     * This applies to the sound only.
     * s.a. notationObj.tieds
     */
    ties: Tie[];
    dynamics: number;
    play: Play;
    staff: number;
    grace: Grace;
    notehead: Notehead;
    release: number;
    pizzicato: boolean;
    beams: Beam[];
    voice: number;
    footnote: Footnote;
    level: Level;
    defaultX: number;
    relativeY: number;
    defaultY: number;
    relativeX: number;
    fontFamily: string;
    fontWeight: NormalBold;
    fontStyle: NormalItalic;
    fontSize: string;
    color: string;
    printDot: boolean;
    printLyric: boolean;
    printObject: boolean;
    printSpacing: boolean;
    timeOnly: string;
    toXML(): string;
    toJSON(): {
        pitch: Pitch;
        unpitched: Unpitched;
        noteheadText: NoteheadText;
        accidental: Accidental;
        instrument: Instrument;
        attack: number;
        endDynamics: number;
        lyrics: Lyric[];
        notations: Notations[];
        stem: Stem;
        cue: Cue;
        ties: Tie[];
        dynamics: number;
        duration: number;
        play: Play;
        staff: number;
        grace: Grace;
        notehead: Notehead;
        release: number;
        pizzicato: boolean;
        beams: Beam[];
        voice: number;
        footnote: Footnote;
        level: Level;
        relativeY: number;
        defaultY: number;
        relativeX: number;
        fontFamily: string;
        fontWeight: NormalBold;
        fontStyle: NormalItalic;
        fontSize: string;
        color: string;
        printDot: boolean;
        printLyric: boolean;
        printObject: boolean;
        printSpacing: boolean;
        timeOnly: string;
        noteType: Type;
        dots: Dot[];
        timeModification: TimeModification;
        rest: Rest;
        _class: string;
    };
    inspect(): string;
    refresh(cursor: IReadOnlyValidationCursor): void;
    /**
     * Flattens notations.
     * All of the following are valid and equivalent in MusicXML:
     *
     * 1. <notations>
     *      <articulations>
     *        <staccato placement="above"/>
     *      </articulations>
     *    </notations>
     *    <notations>
     *      <articulations>
     *        <accent placement="above"/>
     *      </articulations>
     *    </notations>
     *
     * 2. <notations>
     *      <articulations>
     *        <staccato placement="above"/>
     *      </articulations>
     *      <articulations>
     *        <accent placement="above"/>
     *      </articulations>
     *    </notations>
     *
     * 3. <notations>
     *      <articulations>
     *        <staccato placement="above"/>
     *        <accent placement="above"/>
     *      </articulations>
     *    </notations>
     *
     * This function makes the structure like the third version. So there's only ever 0 or
     * 1 notations and 0 or 1 articulations. This makes the notationObj and articualtionObj
     * function above fast.
     *
     * In practice, different groups of notations could have different editorials and print-object
     * attributes. I'm not willing to put up with that, yet.
     */
    cleanNotations(cursor: IReadOnlyValidationCursor): void;
    updateAccidental(cursor: IReadOnlyValidationCursor): void;
}
export default NoteImpl;
