/**
 * @file Handles the loading and representation of MusicXML scores
 * 
 * @copyright (c) Josh Netterfield <joshua@nettek.ca> October 2014
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import xml;

import libxml2.tree;
import std.conv;
import std.exception;
import std.stdio;

enum Type {
    EndMarker,
    NewPage,
    NewLine,

    Begin,
    Clef,
    KeySignature,
    TimeSignature,

    Barline,

    Slur,
    BeamGroup,

    Duration,

    Placeholder,

    Unknown
}

class Model {
    string key;
    @property Type priority() = 0;
    @property Type type() = 0;
}

alias Body = Model[];

/**
 * Standard clefs or sets of clefs.
 */
export enum Clef {
    Treble,
    Bass,
    Alto,
    Tenor,
    Piano,
    Choral,
    TrebleDrums
}

export struct Instrument {
    /**
     * A human readable string representing the instrument.
     */
    string name;

    /**
     * A name that fits within the buttons on the "Parts" tab
     */
    string shortName;

    /**
     * A slug representing uniquely representing the soundfont used for the instrument.
     * The soundfont is available at /res/soundfonts/{instrument.res}-<mp3|ogg>.js.
     * 
     * Some instruments have the SAME soundfont.
     */
    string soundfont;

    /**
     * The standard clef or clef set for an instrument.
     */
    Clef clef;

    /**
     * The 0-indexed MIDI program for the instrument.
     */
    int program;

    /**
     * In Lilypond, instruments are set like
     *      \set Staff.midiInstrument = #"glockenspiel"
     * Names are obtained from http://lilypond.org/doc/v2.17/Documentation/notation/midi-instruments
     */
    string lilypond;
}

export struct Stave {
    Body body_ = [];
    string id;
    Instrument instrument;
}

export struct Paper {
    /**
     * Left margin in mm.
     */
    float leftMargin;

    /**
     * Right margin in mm.
     */
    float rightMargin;

    float indent;
}

export struct Header {
    string title;
    string composer;

    /**
    * The height of the stave, in "em".
    */
    float staveHeight;

    /**
    * The physical (printout) size of the page.
    */
    float pageSize;

    /**
    * Margin settings and such.
    * 
    * See also pageSize.
    */
    Paper paper;
}

private void JustifyAttrib(xmlAttrPtr attrib) {
    if (attrib.name.toString == "justify") {
        // todo
    }
}

private void PrintObjectAttrib(xmlAttrPtr attrib) {
    if (attrib.name.toString == "print-object") {
        // todo
    }
}

private void PrintStyleAttribs(xmlAttrPtr attrib) {
    PositionAttribs(attrib);
    FontAttribs(attrib);
    ColorAttrib(attrib);
}

private void PositionAttribs(xmlAttrPtr attrib) {
    if (attrib.name.toString == "default-x") {
        // todo
    }
    if (attrib.name.toString == "default-y") {
        // todo
    }
    if (attrib.name.toString == "relative-x") {
        // todo
    }
    if (attrib.name.toString == "relative-y") {
        // todo
    }
}

private void FontAttribs(xmlAttrPtr attrib) {
    if (attrib.name.toString == "font-family") {
        // todo
    }
    if (attrib.name.toString == "font-size") {
        // todo
    }
    if (attrib.name.toString == "font-style") {
        // todo
    }
    if (attrib.name.toString == "font-weight") {
        // todo
    }
}

private void ColorAttrib(xmlAttrPtr attrib) {
    if (attrib.name.toString == "color") {
        // todo
    }
}

export struct Score {
    Header header;
    Stave[] staves;

    @disable this();

    this(string musicXml, string filename = "import.xml") {
        auto doc = musicXml.toDocument(filename).toTimewise();
        scope(exit) { doc.xmlFreeDoc(); }
        enforce(doc, new NotMusicXml("Failed DTD validation"));
        // Now that we've passed DTD validation, we should no longer throw exceptions.
        // Any errors we make are our own.

        // score.mod >> score-partwise
        auto currChild = xmlDocGetRootElement(doc).children.firstElement;
        assert(currChild, "Expected part-list");
        // score.mod >> score-partwise >> %score-header
        // score.mod >> score-partwise >> %score-header >> work?
        if (currChild.name.toString == "work") {
            // todo
            currChild = currChild.nextElement;
        }

        // score.mod >> score-partwise >> %score-header >> movement-number?
        if (currChild.name.toString == "movement-number") {
            // todo
            currChild = currChild.nextElement;
        }

        // score.mod >> score-partwise >> %score-header >> movement-title?
        if (currChild.name.toString == "movement-title") {
            // todo
            currChild = currChild.nextElement;
        }

        // score.mod >> score-partwise >> %score-header >> identification?
        if (currChild.name.toString == "identification") {
            // todo
            currChild = currChild.nextElement;
        }

        // score.mod >> score-partwise >> %score-header >> defaults?
        if (currChild.name.toString == "defaults") {
            // todo
            currChild = currChild.nextElement;
        }

        // score.mod >> score-partwise >> %score-header >> credit*
        while (currChild.name.toString == "credit") {
            // todo
            currChild = currChild.nextElement;
        }

        // score.mod >> score-partwise >> %score-header >> part-list
        assert(currChild.name.toString == "part-list", "Expected part-list");
        staves = [];
        Stave*[string] staveById;
        for (auto currPart = currChild.children.firstElement; currPart; currPart = currPart.nextElement) {
            if (currPart.name.toString == "part-group") {
                // todo
            } else if (currPart.name.toString == "score-part") {
                Stave part;

                // <!ATTLIST score-part id ID #REQUIRED >
                for (auto currAttrib = currPart.properties; currAttrib; currAttrib = currAttrib.next) {
                    assert(currAttrib.name.toString == "id");
                    auto child = currAttrib.children.first!(xmlElementType.XML_TEXT_NODE);
                    assert(child && child.content);
                    part.id = currAttrib.children.content.toString.dup;
                }
                assert(part.id);

                auto currPartElem = currPart.children.firstElement;
                // score-part >> identification?
                if (currPartElem.name.toString == "identification") {
                    // todo
                    currPartElem = currPartElem.nextElement;
                }

                // score-part >> part-name
                assert(currPartElem.name.toString == "part-name");
                {
                    auto child = currPartElem.children.first!(xmlElementType.XML_TEXT_NODE);
                    assert(child && child.content);
                    part.instrument.name = child.content.toString.dup;
                    for (auto partNameAttrib = currPartElem.properties; partNameAttrib; partNameAttrib = partNameAttrib.next) {
                        PrintStyleAttribs(partNameAttrib);
                        PrintObjectAttrib(partNameAttrib);
                        JustifyAttrib(partNameAttrib);
                    }

                    currPartElem = currPartElem.nextElement;
                }


                // score-part >> part-name-display?
                if (currPartElem && currPartElem.name.toString == "part-name-display") {
                    // todo
                    currPartElem = currPartElem.nextElement;
                }

                // score-part >> part-abbreviation?
                if (currPartElem && currPartElem.name.toString == "part-abbreviation") {
                    auto child = currPartElem.children.first!(xmlElementType.XML_TEXT_NODE);
                    assert(child && child.content);
                    part.instrument.shortName = child.content.toString.dup;
                    for (auto partNameAttrib = currPartElem.properties; partNameAttrib; partNameAttrib = partNameAttrib.next) {
                        PrintStyleAttribs(partNameAttrib);
                        PrintObjectAttrib(partNameAttrib);
                        JustifyAttrib(partNameAttrib);
                    }

                    currPartElem = currPartElem.nextElement;
                }

                // score-part >> part-abbreviation-display?
                if (currPartElem && currPartElem.name.toString == "part-abbreviation-display") {
                    // todo
                    currPartElem = currPartElem.nextElement;
                }

                // score-part >> group?
                if (currPartElem && currPartElem.name.toString == "group") {
                    // todo
                    currPartElem = currPartElem.nextElement;
                }

                // score-part >> score-instruments*
                while (currPartElem && currPartElem.name.toString == "score-instruments") {
                    // todo
                    currPartElem = currPartElem.nextElement;
                }

                // score-part >> (midi-device?, midi-instrument?)*
                while (currPartElem) {
                    if (currPartElem.name.toString == "score-instruments") {
                        // todo
                        currPartElem = currPartElem.nextElement;
                    } else if (currPartElem.name.toString == "midi-device") {
                        // todo
                        currPartElem = currPartElem.nextElement;
                    } else {
                        assert(false, "Did not expect any tag. Got " ~ currPartElem.name.toString);
                    }
                }
                staves ~= part;
                staveById[part.id] = &part;
            }
        }
        writeln("Staves @1 ", staves);
       
        for (auto currMeasure = currChild.nextElement; currMeasure; currMeasure = currMeasure.nextElement) {
            assert(currMeasure.name.toString == "measure", "Expected measure");
            int measure = -1;
            for (auto measureAttrib = currMeasure.properties; measureAttrib; measureAttrib = measureAttrib.next) {
                if (measureAttrib.name.toString == "implicit") {
                    // todo
                }
                if (measureAttrib.name.toString == "non-controlling") {
                    // todo
                }
                if (measureAttrib.name.toString == "width") {
                    // todo
                }
                if (measureAttrib.name.toString == "number") {
                    auto child = measureAttrib.children.first!(xmlElementType.XML_TEXT_NODE);
                    assert(child);
                    measure = child.content.toString.to!int;
                }
            }
            for (auto part = currMeasure.children.firstElement; part; part = part.nextElement) {
                assert(part.name.toString == "part");
                auto partId = part.properties.children.first!(xmlElementType.XML_TEXT_NODE).content.to!string;
                // writeln(partId, *staveById[partId]);
                for (auto partElt = part.children.firstElement; partElt; partElt = partElt.nextElement) {
                    // -> Unordered <-
	            //"(note | backup | forward | direction | attributes |
	            //  harmony | figured-bass | print | sound | barline | 
	            //  grouping | link | bookmark)*">
                    if (partElt.name.toString == "note") {
                        for (auto noteAttrib = partElt.properties; noteAttrib; noteAttrib = noteAttrib.next) {
                            PrintStyleAttribs(noteAttrib);
                            //to add: %printout;
                            //to add: dynamics CDATA #IMPLIED
                            //to add: end-dynamics CDATA #IMPLIED
                            //to add: attack CDATA #IMPLIED
                            //to add: release CDATA #IMPLIED
                            //to add: %time-only;
                            //to add: pizzicato %yes-no; #IMPLIED
                        }
                        auto noteDescription = partElt.children.firstElement;

                        bool canTie;
                        bool hasDuration;
                        if (noteDescription.name.toString == "grace") {
                            // (grace, %full-note;, (tie, tie?)?)
                            canTie = true;
                            hasDuration = false;
                            continue; // todo
                        } else if (noteDescription.name.toString == "cue") {
                            // (cue, %full-note;, duration)
                            canTie = false;
                            hasDuration = true;
                            continue; // todo
                        } else {
                            // (%full-note;, duration, (tie, tie?)?)
                            canTie = true;
                            hasDuration = true;
                        }

                        // "(chord?, (pitch | unpitched | rest))">
                        if (noteDescription.name.toString == "chord") {
                            //todo
                            noteDescription = noteDescription.next;
                        } else if (noteDescription.name.toString == "pitch") {
                            //todo
                            noteDescription = noteDescription.next;
                        } else if (noteDescription.name.toString == "rest") {
                            //todo
                            noteDescription = noteDescription.next;
                        } else assert(false);

                        // ...
                        //     instrument?,
                        if (noteDescription.name.toString == "instrument") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     %editorial-voice;,
                        if (noteDescription.name.toString == "footnote") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        if (noteDescription.name.toString == "level") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        if (noteDescription.name.toString == "voice") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     type?,
                        if (noteDescription.name.toString == "type") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     dot*,
                        while (noteDescription.name.toString == "dot") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     accidental?,
                        if (noteDescription.name.toString == "accidental") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     time-modification?,
                        if (noteDescription.name.toString == "time-modification") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     stem?,
                        if (noteDescription.name.toString == "stem") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     notehead?,
                        if (noteDescription.name.toString == "notehead") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     notehead-text?,
                        if (noteDescription.name.toString == "notehead-text") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     staff?,
                        if (noteDescription.name.toString == "staff") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     beam*,
                        while (noteDescription.name.toString == "beam") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     notations*,
                        while (noteDescription.name.toString == "notations") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     lyric*,
                        while (noteDescription.name.toString == "lyric") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                        //     play?
                        if (noteDescription.name.toString == "play") {
                            //todo
                            noteDescription = noteDescription.next;
                        }
                    } else if (partElt.name.toString == "backup") {
                        // todo
                    } else if (partElt.name.toString == "forward") {
                        // todo
                    } else if (partElt.name.toString == "direction") {
                        // todo
                    } else if (partElt.name.toString == "attributes") {
                        // todo
                    } else if (partElt.name.toString == "harmony") {
                        // todo
                    } else if (partElt.name.toString == "figured-bass") {
                        // todo
                    } else if (partElt.name.toString == "print") {
                        // todo
                    } else if (partElt.name.toString == "sound") {
                        // todo
                    } else if (partElt.name.toString == "barline") {
                        // todo
                    } else if (partElt.name.toString == "grouping") {
                        // todo
                    } else if (partElt.name.toString == "link") {
                        // todo
                    } else if (partElt.name.toString == "bookmark") {
                        // todo
                    }
                }
                //staveById[partId].body_;
            }
            assert(measure != -1);
        }
        writeln("Staves @end ", staves);
    }
}

unittest {
    string simplePartwise = import("tests/helloWorldPartwise.xml");
    Score score = simplePartwise;
}
