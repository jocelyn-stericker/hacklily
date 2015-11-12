/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the musicxml-interfaces <https://github.com/ripieno/musicxml-interfaces>.
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
 *
 *****************************************************************
 *
 * MusicXML™ Version 3.0
 *
 * Copyright © 2004-2011 MakeMusic, Inc.
 * http://www.makemusic.com/
 *
 * This MusicXML™ work is being provided by the copyright
 * holder under the MusicXML Public License Version 3.0,
 * available from:
 *
 * http://www.musicxml.org/dtds/license.html
 * This file contains multiple DTDs.
 */
"use strict";
/*---- Parsing API ------------------------------------------------------------------------------*/
/**
 * Converts a MusicXML document into a MusicXML parttime-inspired JSON object.
 * See ScoreTimewise for full return type specification.
 *
 * This function will accept timepart MusicXML files, but will still return a
 * structure similar to parttime.
 */
function parseScore(score) {
    var dom = xmlToParttimeDoc(score);
    return xmlToScoreTimewise(dom.documentElement);
}
exports.parseScore = parseScore;
/**
 * Reads a document, and returns header information.
 *
 * ScoreHeader is a subset of ScoreTimewise, so you can always just call MusicXML.parse.score.
 * This function is a bit faster though, if you only care about metadata.
 */
function paseScoreHeader(score) {
    return xmlToScoreHeader(xmlToDoc(score).documentElement);
}
exports.paseScoreHeader = paseScoreHeader;
/**
 * Converts a MusicXML <measure /> from a **parttime** document into JSON.
 */
function parseMeasure(str) {
    return xmlToMeasure(xmlToDoc(str).documentElement);
}
exports.parseMeasure = parseMeasure;
/**
 * Converts a MusicXML <note /> into JSON.
 */
function parseNote(str) {
    return xmlToNote(xmlToDoc(str).documentElement);
}
exports.parseNote = parseNote;
/**
 * Converts a MusicXML <clef /> into JSON.
 */
function parseClef(str) {
    return xmlToClef(xmlToDoc(str).documentElement);
}
exports.parseClef = parseClef;
/**
 * Converts a MusicXML <time /> into JSON.
 */
function parseTime(str) {
    return xmlToTime(xmlToDoc(str).documentElement);
}
exports.parseTime = parseTime;
/**
 * Converts a MusicXML <key /> into JSON.
 */
function parseKey(str) {
    return xmlToKey(xmlToDoc(str).documentElement);
}
exports.parseKey = parseKey;
/**
 * Converts a MusicXML <part-symbol /> into JSON.
 */
function parsePartSymbol(str) {
    return xmlToPartSymbol(xmlToDoc(str).documentElement);
}
exports.parsePartSymbol = parsePartSymbol;
/**
 * Converts a MusicXML <backup /> into JSON.
 */
function parseBackup(str) {
    return xmlToBackup(xmlToDoc(str).documentElement);
}
exports.parseBackup = parseBackup;
/**
 * Converts a MusicXML <harmony /> into JSON.
 */
function parseHarmony(str) {
    return xmlToHarmony(xmlToDoc(str).documentElement);
}
exports.parseHarmony = parseHarmony;
/**
 * Converts a MusicXML <forward /> into JSON.
 */
function parseForward(str) {
    return xmlToForward(xmlToDoc(str).documentElement);
}
exports.parseForward = parseForward;
/**
 * Converts a MusicXML <print /> into JSON.
 */
function parsePrint(str) {
    return xmlToPrint(xmlToDoc(str).documentElement);
}
exports.parsePrint = parsePrint;
/**
 * Converts a MusicXML <figured-bass /> into JSON.
 */
function parseFiguredBass(str) {
    return xmlToFiguredBass(xmlToDoc(str).documentElement);
}
exports.parseFiguredBass = parseFiguredBass;
/**
 * Converts a MusicXML <direction /> into JSON.
 */
function parseDirection(str) {
    return xmlToDirection(xmlToDoc(str).documentElement);
}
exports.parseDirection = parseDirection;
/**
 * Converts a MusicXML <attributes /> object into JSON.
 */
function parseAttributes(str) {
    return xmlToAttributes(xmlToDoc(str).documentElement);
}
exports.parseAttributes = parseAttributes;
/**
 * Converts a MusicXML <sound /> into JSON.
 */
function parseSound(str) {
    return xmlToSound(xmlToDoc(str).documentElement);
}
exports.parseSound = parseSound;
/**
 * Converts a MusicXML <barline /> into JSON.
 */
function parseBarline(str) {
    return xmlToBarline(xmlToDoc(str).documentElement);
}
exports.parseBarline = parseBarline;
/**
 * Converts a MusicXML <grouping /> into JSON.
 */
function parseGrouping(str) {
    return xmlToGrouping(xmlToDoc(str).documentElement);
}
exports.parseGrouping = parseGrouping;
/*---- Serialization API ------------------------------------------------------------------------*/
function serializeScore(score) {
    return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!DOCTYPE score-timewise\n  PUBLIC \"-//Recordare//DTD MusicXML 3.0 Timewise//EN\" \"http://www.musicxml.org/dtds/timewise.dtd\">\n<score-timewise version=\"3.0\">\n" + scoreHeaderToXML(score).join("\n").split("\n").map(function (line) { return "  " + line; }).join("\n") + "\n" + score.measures.map(function (measure) { return measureToXML(measure); }).join("\n")
        .split("\n").map(function (line) { return "  " + line; }).join("\n") + "\n</score-timewise>";
}
exports.serializeScore = serializeScore;
function serializeScoreHeader(scoreHeader) {
    return scoreHeaderToXML(scoreHeader).join("\n");
}
exports.serializeScoreHeader = serializeScoreHeader;
exports.serializeMeasure = measureToXML;
exports.serializeNote = noteToXML;
exports.serializeClef = clefToXML;
exports.serializeTime = timeToXML;
exports.serializeKey = keyToXML;
exports.serializePartSymbol = partSymbolToXML;
exports.serializeBackup = backupToXML;
exports.serializeHarmony = harmonyToXML;
exports.serializeForward = forwardToXML;
exports.serializePrint = printToXML;
exports.serializeFiguredBass = figuredBassToXML;
exports.serializeDirection = directionToXML;
exports.serializeAttributes = attributesToXML;
exports.serializeSound = soundToXML;
exports.serializeBarline = barlineToXML;
exports.serializeGrouping = groupingToXML;
var process;
var isIE = typeof window !== "undefined" && "ActiveXObject" in window;
var isNode = typeof window === "undefined" || typeof process !== "undefined" && !process.browser;
var xmlToParttimeDoc;
var xmlToDoc;
(function init() {
    var parttimeXSLBuffer = "<?xml version=\"1.0\" encoding=\"UTF-8\"?> <xsl:stylesheet version=\"1.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\"> <xsl:output method=\"xml\" indent=\"yes\" encoding=\"UTF-8\" omit-xml-declaration=\"no\" standalone=\"no\" doctype-system=\"http://www.musicxml.org/dtds/timewise.dtd\" doctype-public=\"-//Recordare//DTD MusicXML 3.0 Timewise//EN\" /> <xsl:template match=\"/\"> <xsl:apply-templates select=\"./score-partwise\"/> <xsl:apply-templates select=\"./score-timewise\"/> </xsl:template> <xsl:template match=\"score-timewise\"> <xsl:copy-of select=\".\" /> </xsl:template> <xsl:template match=\"text()\"> <xsl:value-of select=\".\" /> </xsl:template> <xsl:template match=\"*|@*|comment()|processing-instruction()\"> <xsl:copy><xsl:apply-templates select=\"*|@*|comment()|processing-instruction()|text()\" /></xsl:copy> </xsl:template> <xsl:template match=\"score-partwise\"> <xsl:element name=\"score-timewise\"> <xsl:apply-templates select=\"@version[.!='1.0']\"/> <xsl:apply-templates select=\"work\"/> <xsl:apply-templates select=\"movement-number\"/> <xsl:apply-templates select=\"movement-title\"/> <xsl:apply-templates select=\"identification\"/> <xsl:apply-templates select=\"defaults\"/> <xsl:apply-templates select=\"credit\"/> <xsl:apply-templates select=\"part-list\"/> <xsl:for-each select=\"part[1]/measure\"> <xsl:variable name=\"measure-number\"> <xsl:value-of select=\"@number\"/> </xsl:variable> <xsl:element name=\"measure\"> <xsl:attribute name=\"number\"> <xsl:value-of select=\"$measure-number\"/> </xsl:attribute> <xsl:if test=\"@implicit[. = 'yes']\"> <xsl:attribute name=\"implicit\"> <xsl:value-of select=\"@implicit\"/> </xsl:attribute> </xsl:if> <xsl:if test=\"@non-controlling[. = 'yes']\"> <xsl:attribute name=\"non-controlling\"> <xsl:value-of select=\"@non-controlling\"/> </xsl:attribute> </xsl:if> <xsl:if test=\"@width\"> <xsl:attribute name=\"width\"> <xsl:value-of select=\"@width\"/> </xsl:attribute> </xsl:if> <xsl:for-each select=\"../../part/measure\"> <xsl:if test=\"@number=$measure-number\"> <xsl:element name=\"part\"> <xsl:attribute name=\"id\"> <xsl:value-of select=\"parent::part/@id\"/> </xsl:attribute> <xsl:apply-templates /> </xsl:element> </xsl:if> </xsl:for-each> </xsl:element> </xsl:for-each> </xsl:element> </xsl:template> </xsl:stylesheet>";
    if (isIE) {
        var DOMParser = window.DOMParser;
        xmlToDoc = function (str) {
            return (new DOMParser).parseFromString(str, "text/xml");
        };
        xmlToParttimeDoc = function (str) {
            var xslt = new ActiveXObject("Msxml2.XSLTemplate");
            var xmlDoc = new ActiveXObject("Msxml2.DOMDocument");
            var xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
            // Why these aren't set by default completely flabbergasts me.
            xmlDoc.validateOnParse = false;
            xslDoc.validateOnParse = false;
            xmlDoc.resolveExternals = false;
            xslDoc.resolveExternals = false;
            xmlDoc.loadXML(str);
            xslDoc.loadXML(parttimeXSLBuffer);
            xslt.stylesheet = xslDoc;
            var xslProc = xslt.createProcessor();
            xslProc.input = xmlDoc;
            xslProc.transform();
            return xmlToDoc(xslProc.output);
        };
    }
    else if (isNode) {
        var DOMParser = require("xmldom").DOMParser;
        var spawnSync = require("child_process").spawnSync;
        xmlToDoc = function (str) {
            return (new DOMParser).parseFromString(str, "text/xml");
        };
        xmlToParttimeDoc = function (str) {
            var res = spawnSync("xsltproc", ["--nonet", "./vendor/musicxml-dtd/parttime.xsl", "-"], {
                input: str,
                env: {
                    "XML_CATALOG_FILES": "./vendor/musicxml-dtd/catalog.xml"
                }
            });
            if (res.error) {
                throw res.error;
            }
            return xmlToDoc(res.stdout.toString());
        };
    }
    else {
        var DOMParser = window.DOMParser;
        var parttimeXSLDoc = (new DOMParser).parseFromString(parttimeXSLBuffer, "text/xml");
        var parttimeXSLProcessor = new XSLTProcessor;
        parttimeXSLProcessor.importStylesheet(parttimeXSLDoc);
        xmlToDoc = function (str) {
            return (new DOMParser).parseFromString(str, "text/xml");
        };
        xmlToParttimeDoc = function (str) {
            var dom = (new DOMParser).parseFromString(str, "text/xml");
            return parttimeXSLProcessor.transformToDocument(dom);
        };
    }
}());
function popFront(t) {
    return t.slice(1);
}
function getString(ch, required) {
    return (ch.nodeType === ch.ATTRIBUTE_NODE ? ch.value : ch.textContent).trim();
}
function getNumber(ch, required) {
    var s = getString(ch, required);
    if (s.toLowerCase().indexOf("0x") === 0) {
        return parseInt(s, 16);
    }
    else {
        return parseFloat(s);
    }
}
function toCamelCase(input) {
    return input.toLowerCase().replace(/-(.)/g, function (match, group1) {
        return group1.toUpperCase();
    });
}
/**
 * The start-stop entity is used for musical elements that
 * can either start or stop, such as slurs, tuplets, and
 * wedges.
 *
 * See also start-stop-continue and start-stop-single.
 *
 * The values of start and stop refer to how an
 * element appears in musical score order, not in MusicXML
 * document order. An element with a stop attribute may
 * precede the corresponding element with a start attribute
 * within a MusicXML document. This is particularly common
 * in multi-staff music. For example, the stopping point for
 * a slur may appear in staff 1 before the starting point for
 * the slur appears in staff 2 later in the document.
 */
(function (StartStop) {
    StartStop[StartStop["Start"] = 0] = "Start";
    StartStop[StartStop["Stop"] = 1] = "Stop";
})(exports.StartStop || (exports.StartStop = {}));
var StartStop = exports.StartStop;
/**
 * The start-stop-continue (as opposed to the start-stop entity)
 * entity is used when there is a need to refer to an
 * intermediate point in the symbol, as for complex slurs
 * or for specifying formatting of symbols across system
 * breaks.
 *
 * The values of start, stop, and continue refer to how an
 * element appears in musical score order, not in MusicXML
 * document order. An element with a stop attribute may
 * precede the corresponding element with a start attribute
 * within a MusicXML document. This is particularly common
 * in multi-staff music. For example, the stopping point for
 * a slur may appear in staff 1 before the starting point for
 * the slur appears in staff 2 later in the document.
 */
(function (StartStopContinue) {
    StartStopContinue[StartStopContinue["Start"] = 0] = "Start";
    StartStopContinue[StartStopContinue["Stop"] = 1] = "Stop";
    StartStopContinue[StartStopContinue["Continue"] = 2] = "Continue";
})(exports.StartStopContinue || (exports.StartStopContinue = {}));
var StartStopContinue = exports.StartStopContinue;
/**
 * The start-stop-single entity (as opposed to start-stop
 * and start-stop-continue) is used when the same
 * element is used for multi-note and single-note notations,
 * as for tremolos.
 *
 * The values of start and stop refer to how an
 * element appears in musical score order, not in MusicXML
 * document order. An element with a stop attribute may
 * precede the corresponding element with a start attribute
 * within a MusicXML document. This is particularly common
 * in multi-staff music. For example, the stopping point for
 * a slur may appear in staff 1 before the starting point for
 * the slur appears in staff 2 later in the document.
 */
(function (StartStopSingle) {
    StartStopSingle[StartStopSingle["Single"] = 3] = "Single";
    StartStopSingle[StartStopSingle["Start"] = 0] = "Start";
    StartStopSingle[StartStopSingle["Stop"] = 1] = "Stop";
})(exports.StartStopSingle || (exports.StartStopSingle = {}));
var StartStopSingle = exports.StartStopSingle;
/**
 * The symbol-size entity is used to indicate full vs.
 * cue-sized vs. oversized symbols. The large value
 * for oversized symbols was added in version 1.1.
 */
(function (SymbolSize) {
    /**
     * Context-dependant.
     */
    SymbolSize[SymbolSize["Unspecified"] = 0] = "Unspecified";
    SymbolSize[SymbolSize["Full"] = 1] = "Full";
    SymbolSize[SymbolSize["Cue"] = 2] = "Cue";
    /**
     * Oversized.
     */
    SymbolSize[SymbolSize["Large"] = 3] = "Large";
})(exports.SymbolSize || (exports.SymbolSize = {}));
var SymbolSize = exports.SymbolSize;
/**
 * The above-below type is used to indicate whether one
 * element appears above or below another element.
 */
(function (AboveBelow) {
    AboveBelow[AboveBelow["Above"] = 1] = "Above";
    AboveBelow[AboveBelow["Below"] = 2] = "Below";
    AboveBelow[AboveBelow["Unspecified"] = 0] = "Unspecified";
})(exports.AboveBelow || (exports.AboveBelow = {}));
var AboveBelow = exports.AboveBelow;
/**
 * Specifies orientation.
 */
(function (OverUnder) {
    OverUnder[OverUnder["Over"] = 1] = "Over";
    OverUnder[OverUnder["Under"] = 2] = "Under";
    OverUnder[OverUnder["Unspecified"] = 0] = "Unspecified";
})(exports.OverUnder || (exports.OverUnder = {}));
var OverUnder = exports.OverUnder;
/**
 * The up-down entity is used for arrow direction,
 * indicating which way the tip is pointing.
 */
(function (UpDown) {
    UpDown[UpDown["Down"] = 1] = "Down";
    UpDown[UpDown["Up"] = 0] = "Up";
})(exports.UpDown || (exports.UpDown = {}));
var UpDown = exports.UpDown;
/**
 * The top-bottom entity is used to indicate the top or
 * bottom part of a vertical shape like non-arpeggiate.
 */
(function (TopBottom) {
    TopBottom[TopBottom["Top"] = 0] = "Top";
    TopBottom[TopBottom["Bottom"] = 1] = "Bottom";
})(exports.TopBottom || (exports.TopBottom = {}));
var TopBottom = exports.TopBottom;
/**
 * The left-right entity is used to indicate whether one
 * element appears to the left or the right of another
 * element.
 */
(function (LeftRight) {
    LeftRight[LeftRight["Right"] = 1] = "Right";
    LeftRight[LeftRight["Left"] = 0] = "Left";
})(exports.LeftRight || (exports.LeftRight = {}));
var LeftRight = exports.LeftRight;
/**
 * The enclosure-shape entity describes the shape and
 * presence / absence of an enclosure around text. A bracket
 * enclosure is similar to a rectangle with the bottom line
 * missing, as is common in jazz notation.
 */
(function (EnclosureShape) {
    EnclosureShape[EnclosureShape["Circle"] = 3] = "Circle";
    EnclosureShape[EnclosureShape["Bracket"] = 4] = "Bracket";
    EnclosureShape[EnclosureShape["Triangle"] = 5] = "Triangle";
    EnclosureShape[EnclosureShape["Diamond"] = 6] = "Diamond";
    EnclosureShape[EnclosureShape["None"] = 7] = "None";
    EnclosureShape[EnclosureShape["Square"] = 1] = "Square";
    EnclosureShape[EnclosureShape["Oval"] = 2] = "Oval";
    EnclosureShape[EnclosureShape["Rectangle"] = 0] = "Rectangle";
})(exports.EnclosureShape || (exports.EnclosureShape = {}));
var EnclosureShape = exports.EnclosureShape;
(function (NormalItalic) {
    NormalItalic[NormalItalic["Italic"] = 1] = "Italic";
    NormalItalic[NormalItalic["Normal"] = 0] = "Normal";
})(exports.NormalItalic || (exports.NormalItalic = {}));
var NormalItalic = exports.NormalItalic;
(function (NormalBold) {
    NormalBold[NormalBold["Bold"] = 2] = "Bold";
    NormalBold[NormalBold["Normal"] = 0] = "Normal";
})(exports.NormalBold || (exports.NormalBold = {}));
var NormalBold = exports.NormalBold;
(function (LeftCenterRight) {
    LeftCenterRight[LeftCenterRight["Right"] = 1] = "Right";
    LeftCenterRight[LeftCenterRight["Center"] = 2] = "Center";
    LeftCenterRight[LeftCenterRight["Left"] = 0] = "Left";
})(exports.LeftCenterRight || (exports.LeftCenterRight = {}));
var LeftCenterRight = exports.LeftCenterRight;
(function (TopMiddleBottomBaseline) {
    TopMiddleBottomBaseline[TopMiddleBottomBaseline["Top"] = 0] = "Top";
    TopMiddleBottomBaseline[TopMiddleBottomBaseline["Middle"] = 1] = "Middle";
    TopMiddleBottomBaseline[TopMiddleBottomBaseline["Baseline"] = 3] = "Baseline";
    TopMiddleBottomBaseline[TopMiddleBottomBaseline["Bottom"] = 2] = "Bottom";
})(exports.TopMiddleBottomBaseline || (exports.TopMiddleBottomBaseline = {}));
var TopMiddleBottomBaseline = exports.TopMiddleBottomBaseline;
(function (DirectionMode) {
    DirectionMode[DirectionMode["Lro"] = 2] = "Lro";
    DirectionMode[DirectionMode["Rlo"] = 3] = "Rlo";
    DirectionMode[DirectionMode["Ltr"] = 0] = "Ltr";
    DirectionMode[DirectionMode["Rtl"] = 1] = "Rtl";
})(exports.DirectionMode || (exports.DirectionMode = {}));
var DirectionMode = exports.DirectionMode;
(function (StraightCurved) {
    StraightCurved[StraightCurved["Curved"] = 1] = "Curved";
    StraightCurved[StraightCurved["Straight"] = 0] = "Straight";
})(exports.StraightCurved || (exports.StraightCurved = {}));
var StraightCurved = exports.StraightCurved;
(function (SolidDashedDottedWavy) {
    SolidDashedDottedWavy[SolidDashedDottedWavy["Dashed"] = 1] = "Dashed";
    SolidDashedDottedWavy[SolidDashedDottedWavy["Wavy"] = 3] = "Wavy";
    SolidDashedDottedWavy[SolidDashedDottedWavy["Dotted"] = 2] = "Dotted";
    SolidDashedDottedWavy[SolidDashedDottedWavy["Solid"] = 0] = "Solid";
})(exports.SolidDashedDottedWavy || (exports.SolidDashedDottedWavy = {}));
var SolidDashedDottedWavy = exports.SolidDashedDottedWavy;
(function (NormalAngledSquare) {
    NormalAngledSquare[NormalAngledSquare["Angled"] = 1] = "Angled";
    NormalAngledSquare[NormalAngledSquare["Square"] = 2] = "Square";
    NormalAngledSquare[NormalAngledSquare["Normal"] = 0] = "Normal";
})(exports.NormalAngledSquare || (exports.NormalAngledSquare = {}));
var NormalAngledSquare = exports.NormalAngledSquare;
(function (UprightInverted) {
    UprightInverted[UprightInverted["Upright"] = 0] = "Upright";
    UprightInverted[UprightInverted["Inverted"] = 1] = "Inverted";
})(exports.UprightInverted || (exports.UprightInverted = {}));
var UprightInverted = exports.UprightInverted;
(function (UpperMainBelow) {
    UpperMainBelow[UpperMainBelow["Main"] = 1] = "Main";
    UpperMainBelow[UpperMainBelow["Below"] = 2] = "Below";
    UpperMainBelow[UpperMainBelow["Upper"] = 0] = "Upper";
})(exports.UpperMainBelow || (exports.UpperMainBelow = {}));
var UpperMainBelow = exports.UpperMainBelow;
(function (WholeHalfUnison) {
    WholeHalfUnison[WholeHalfUnison["Unison"] = 2] = "Unison";
    WholeHalfUnison[WholeHalfUnison["Whole"] = 0] = "Whole";
    WholeHalfUnison[WholeHalfUnison["Half"] = 1] = "Half";
})(exports.WholeHalfUnison || (exports.WholeHalfUnison = {}));
var WholeHalfUnison = exports.WholeHalfUnison;
(function (WholeHalfNone) {
    WholeHalfNone[WholeHalfNone["None"] = 3] = "None";
    WholeHalfNone[WholeHalfNone["Whole"] = 0] = "Whole";
    WholeHalfNone[WholeHalfNone["Half"] = 1] = "Half";
})(exports.WholeHalfNone || (exports.WholeHalfNone = {}));
var WholeHalfNone = exports.WholeHalfNone;
function xmlToEncodingDate(node) {
    var text = getString(node, true);
    if (text.length < 10) {
        return null;
    }
    return {
        year: parseFloat(text.slice(0, 4)),
        month: parseFloat(text.slice(5, 7)),
        day: parseFloat(text.slice(8, 10))
    };
}
function xmlToMeasure(node) {
    var ret = {};
    var foundImplicit = false;
    var foundNonControlling = false;
    var foundNumber = false;
    var foundWidth = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "part") {
            var dataPart = xmlToPart(ch);
            ret.parts = ret.parts || {};
            ret.parts[ch.getAttribute("id")] = dataPart;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getString(ch2, true);
            ret.number = dataNumber;
            foundNumber = true;
        }
        if (ch2.name === "implicit") {
            var dataImplicit = xmlToYesNo(ch2, true);
            ret.implicit = dataImplicit;
            foundImplicit = true;
        }
        if (ch2.name === "width") {
            var dataWidth = getNumber(ch2, true);
            ret.width = dataWidth;
            foundWidth = true;
        }
        if (ch2.name === "non-controlling") {
            var dataNonControlling = xmlToYesNo(ch2, true);
            ret.nonControlling = dataNonControlling;
            foundNonControlling = true;
        }
    }
    if (!foundNumber) {
        ret.number = "";
    }
    if (!foundImplicit) {
        ret.implicit = false;
    }
    if (!foundNonControlling) {
        ret.nonControlling = false;
    }
    if (!foundWidth) {
        ret.width = null;
    }
    return ret;
}
function xmlToYesNo(p, required) {
    var s = getString(p, true);
    if (s == "no") {
        return false;
    }
    if (s == "yes") {
        return true;
    }
    return false;
}
function xmlToNoteheadText(p) {
    // TODO
    return null;
}
function xmlToPartNameDisplay(p) {
    // TODO
    return null;
}
function xmlToPartAbbreviationDisplay(p) {
    // TODO
    return null;
}
function xmlToGroupNameDisplay(p) {
    // TODO
    return null;
}
function xmlToGroupAbbreviationDisplay(p) {
    // TODO
    return null;
}
function xmlToLyric(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundJustify = false;
    var foundDefaultX = false;
    var foundRelativeY = false;
    var foundDefaultY = false;
    var foundRelativeX = false;
    var foundPlacement = false;
    var foundColor = false;
    var foundPrintObject = false;
    var foundName = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber_ = getNumber(ch2, true);
            ret.number = dataNumber_;
            foundNumber_ = true;
        }
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
            foundDefaultX = true;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
            foundRelativeY = true;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
            foundDefaultY = true;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
            foundRelativeX = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "name") {
            var dataName = getString(ch2, true);
            ret.name = dataName;
            foundName = true;
        }
    }
    ret.lyricParts = xmlToLyricParts(node);
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundDefaultX) {
        ret.defaultX = NaN;
    }
    if (!foundRelativeY) {
        ret.relativeY = 0;
    }
    if (!foundDefaultY) {
        ret.defaultY = NaN;
    }
    if (!foundRelativeX) {
        ret.relativeX = 0;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundName) {
        ret.name = "";
    }
    return ret;
}
function getStartStop(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "start") {
        return StartStop.Start;
    }
    if (s == "stop") {
        return StartStop.Stop;
    }
    return fallbackVal;
}
function getStartStopContinue(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "start") {
        return StartStopContinue.Start;
    }
    if (s == "stop") {
        return StartStopContinue.Stop;
    }
    if (s == "continue") {
        return StartStopContinue.Continue;
    }
    return fallbackVal;
}
function getStartStopSingle(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "single") {
        return StartStopSingle.Single;
    }
    if (s == "start") {
        return StartStopSingle.Start;
    }
    if (s == "stop") {
        return StartStopSingle.Stop;
    }
    return fallbackVal;
}
function getSymbolSize(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "unspecified") {
        return SymbolSize.Unspecified;
    }
    if (s == "full") {
        return SymbolSize.Full;
    }
    if (s == "cue") {
        return SymbolSize.Cue;
    }
    if (s == "large") {
        return SymbolSize.Large;
    }
    return fallbackVal;
}
function getAboveBelow(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "above") {
        return AboveBelow.Above;
    }
    if (s == "below") {
        return AboveBelow.Below;
    }
    if (s == "unspecified") {
        return AboveBelow.Unspecified;
    }
    return fallbackVal;
}
function getUpDown(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "down") {
        return UpDown.Down;
    }
    if (s == "up") {
        return UpDown.Up;
    }
    return fallbackVal;
}
function getOverUnder(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "over") {
        return OverUnder.Over;
    }
    if (s == "under") {
        return OverUnder.Under;
    }
    if (s == "unspecified") {
        return OverUnder.Unspecified;
    }
    return fallbackVal;
}
function getTopBottom(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "top") {
        return TopBottom.Top;
    }
    if (s == "bottom") {
        return TopBottom.Bottom;
    }
    return fallbackVal;
}
function getLeftRight(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "right") {
        return LeftRight.Right;
    }
    if (s == "left") {
        return LeftRight.Left;
    }
    return fallbackVal;
}
/**
 * The number-of-lines entity is used to specify the
 * number of lines in text decoration attributes.
 */
function verifyNumberOfLines(m) {
    // assert(m >= 0 && m <= 3);
}
function xmlToNumberOfLines(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
function verifyRotation(m) {
    // assert(m >= -180 && m <= 180);
}
function xmlToRotation(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
function getEnclosureShape(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "circle") {
        return EnclosureShape.Circle;
    }
    if (s == "bracket") {
        return EnclosureShape.Bracket;
    }
    if (s == "triangle") {
        return EnclosureShape.Triangle;
    }
    if (s == "diamond") {
        return EnclosureShape.Diamond;
    }
    if (s == "none") {
        return EnclosureShape.None;
    }
    if (s == "square") {
        return EnclosureShape.Square;
    }
    if (s == "oval") {
        return EnclosureShape.Oval;
    }
    if (s == "rectangle") {
        return EnclosureShape.Rectangle;
    }
    return fallbackVal;
}
function getNormalItalic(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "italic") {
        return NormalItalic.Italic;
    }
    if (s == "normal") {
        return NormalItalic.Normal;
    }
    return fallbackVal;
}
function getNormalBold(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "bold") {
        return NormalBold.Bold;
    }
    if (s == "normal") {
        return NormalBold.Normal;
    }
    return fallbackVal;
}
/**
 * Slurs, tuplets, and many other features can be
 * concurrent and overlapping within a single musical
 * part. The number-level attribute distinguishes up to
 * six concurrent objects of the same type. A reading
 * program should be prepared to handle cases where
 * the number-levels stop in an arbitrary order.
 * Different numbers are needed when the features
 * overlap in MusicXML document order. When a number-level
 * value is implied, the value is 1 by default.
 */
function verifyNumberLevel(m) {
    // assert(m >= 1 && m <= 6);
}
function xmlToNumberLevel(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 * The MusicXML format supports eight levels of beaming, up
 * to 1024th notes. Unlike the number-level attribute, the
 * beam-level attribute identifies concurrent beams in a beam
 * group. It does not distinguish overlapping beams such as
 * grace notes within regular notes, or beams used in different
 * voices.
 */
function verifyBeamLevel(m) {
    // assert(m >= 1 && m <= 8);
}
function xmlToBeamLevel(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
function xmlToPosition(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
    }
    return ret;
}
function xmlToPlacement(node) {
    var ret = {};
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToDirectiveEntity(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "directive") {
            var dataDirective = xmlToYesNo(ch2);
            ret.directive = dataDirective;
        }
    }
    return ret;
}
function xmlToBezier(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "bezier-x2") {
            var dataBezierX2 = getNumber(ch2, true);
            ret.bezierX2 = dataBezierX2;
        }
        if (ch2.name === "bezier-offset") {
            var dataBezierOffset = getNumber(ch2, true);
            ret.bezierOffset = dataBezierOffset;
        }
        if (ch2.name === "bezier-offset2") {
            var dataBezierOffset2 = getNumber(ch2, true);
            ret.bezierOffset2 = dataBezierOffset2;
        }
        if (ch2.name === "bezier-x") {
            var dataBezierX = getNumber(ch2, true);
            ret.bezierX = dataBezierX;
        }
        if (ch2.name === "bezier-y") {
            var dataBezierY = getNumber(ch2, true);
            ret.bezierY = dataBezierY;
        }
        if (ch2.name === "bezier-y2") {
            var dataBezierY2 = getNumber(ch2, true);
            ret.bezierY2 = dataBezierY2;
        }
    }
    return ret;
}
function xmlToOrientation(node) {
    var ret = {};
    var foundOrientation = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "orientation") {
            var dataOrientation = getOverUnder(ch2, OverUnder.Unspecified);
            ret.orientation = dataOrientation;
            foundOrientation = true;
        }
    }
    if (!foundOrientation) {
        ret.orientation = OverUnder.Unspecified;
    }
    return ret;
}
function xmlToFont(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    return ret;
}
function getLeftCenterRight(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "right") {
        return LeftCenterRight.Right;
    }
    if (s == "center") {
        return LeftCenterRight.Center;
    }
    if (s == "left") {
        return LeftCenterRight.Left;
    }
    return fallbackVal;
}
function getTopMiddleBottomBaseline(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "top") {
        return TopMiddleBottomBaseline.Top;
    }
    if (s == "middle") {
        return TopMiddleBottomBaseline.Middle;
    }
    if (s == "baseline") {
        return TopMiddleBottomBaseline.Baseline;
    }
    if (s == "bottom") {
        return TopMiddleBottomBaseline.Bottom;
    }
    return fallbackVal;
}
function getDirectionMode(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "lro") {
        return DirectionMode.Lro;
    }
    if (s == "rlo") {
        return DirectionMode.Rlo;
    }
    if (s == "ltr") {
        return DirectionMode.Ltr;
    }
    if (s == "rtl") {
        return DirectionMode.Rtl;
    }
    return fallbackVal;
}
function getStraightCurved(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "curved") {
        return StraightCurved.Curved;
    }
    if (s == "straight") {
        return StraightCurved.Straight;
    }
    return fallbackVal;
}
function getSolidDashedDottedWavy(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "dashed") {
        return SolidDashedDottedWavy.Dashed;
    }
    if (s == "wavy") {
        return SolidDashedDottedWavy.Wavy;
    }
    if (s == "dotted") {
        return SolidDashedDottedWavy.Dotted;
    }
    if (s == "solid") {
        return SolidDashedDottedWavy.Solid;
    }
    return fallbackVal;
}
function getNormalAngledSquare(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "angled") {
        return NormalAngledSquare.Angled;
    }
    if (s == "square") {
        return NormalAngledSquare.Square;
    }
    if (s == "normal") {
        return NormalAngledSquare.Normal;
    }
    return fallbackVal;
}
function getUprightInverted(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "upright") {
        return UprightInverted.Upright;
    }
    if (s == "inverted") {
        return UprightInverted.Inverted;
    }
    return fallbackVal;
}
function getUpperMainBelow(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "main") {
        return UpperMainBelow.Main;
    }
    if (s == "below") {
        return UpperMainBelow.Below;
    }
    if (s == "upper") {
        return UpperMainBelow.Upper;
    }
    return fallbackVal;
}
function getWholeHalfUnison(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "unison") {
        return WholeHalfUnison.Unison;
    }
    if (s == "whole") {
        return WholeHalfUnison.Whole;
    }
    if (s == "half") {
        return WholeHalfUnison.Half;
    }
    return fallbackVal;
}
function getWholeHalfNone(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return WholeHalfNone.None;
    }
    if (s == "whole") {
        return WholeHalfNone.Whole;
    }
    if (s == "half") {
        return WholeHalfNone.Half;
    }
    return fallbackVal;
}
function xmlToColor(node) {
    var ret = {};
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToTextDecoration(node) {
    var ret = {};
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    return ret;
}
function xmlToJustify(node) {
    var ret = {};
    var foundJustify = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    return ret;
}
function xmlToHalign(node) {
    var ret = {};
    var foundHalign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    return ret;
}
function xmlToValign(node) {
    var ret = {};
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToValignImage(node) {
    var ret = {};
    var foundValignImage = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "valign") {
            var dataValignImage = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valignImage = dataValignImage;
            foundValignImage = true;
        }
    }
    if (!foundValignImage) {
        ret.valignImage = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToLetterSpacing(node) {
    var ret = {};
    var foundLetterSpacing = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    return ret;
}
function xmlToLineHeight(node) {
    var ret = {};
    var foundLineHeight = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    return ret;
}
function xmlToTextDirection(node) {
    var ret = {};
    var foundDir = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    return ret;
}
function xmlToTextRotation(node) {
    var ret = {};
    var foundRotation = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    return ret;
}
function xmlToEnclosure(node) {
    var ret = {};
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToPrintStyle(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToPrintStyleAlign(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToLineShape(node) {
    var ret = {};
    var foundLineShape = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
    }
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    return ret;
}
function xmlToDashedFormatting(node) {
    var ret = {};
    var foundDashLength = false;
    var foundSpaceLength = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    return ret;
}
function xmlToPrintObject(node) {
    var ret = {};
    var foundPrintObject = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    return ret;
}
function xmlToPrintSpacing(node) {
    var ret = {};
    var foundPrintSpacing = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-spacing") {
            var dataPrintSpacing = xmlToYesNo(ch2);
            ret.printSpacing = dataPrintSpacing;
            foundPrintSpacing = true;
        }
    }
    if (!foundPrintSpacing) {
        ret.printSpacing = true;
    }
    return ret;
}
function xmlToTextFormatting(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToLevelDisplay(node) {
    var ret = {};
    var foundBracket = false;
    var foundSize = false;
    var foundParentheses = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "bracket") {
            var dataBracket = xmlToYesNo(ch2);
            ret.bracket = dataBracket;
            foundBracket = true;
        }
        if (ch2.name === "size") {
            var dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
            ret.size = dataSize;
            foundSize = true;
        }
        if (ch2.name === "parentheses") {
            var dataParentheses = xmlToYesNo(ch2);
            ret.parentheses = dataParentheses;
            foundParentheses = true;
        }
    }
    if (!foundBracket) {
        ret.bracket = false;
    }
    if (!foundSize) {
        ret.size = SymbolSize.Unspecified;
    }
    if (!foundParentheses) {
        ret.parentheses = false;
    }
    return ret;
}
function xmlToTrillSound(node) {
    var ret = {};
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 24;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 12;
    }
    return ret;
}
function xmlToBendSound(node) {
    var ret = {};
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "first-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.firstBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundSecondBeat) {
        ret.firstBeat = 25;
    }
    return ret;
}
function xmlToTimeOnly(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "time-only") {
            var dataTimeOnly = getString(ch2, true);
            ret.timeOnly = dataTimeOnly;
        }
    }
    return ret;
}
function xmlToDocumentAttributes(node) {
    var ret = {};
    var foundVersion_ = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "version") {
            var dataVersion = getString(ch2, true);
            ret.version = dataVersion;
            foundVersion_ = true;
        }
    }
    if (!foundVersion_) {
        ret.version = "1.0";
    }
    return ret;
}
function xmlToEditorial(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToEditorialVoice(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "voice") {
            var dataVoice = getNumber(ch, true);
            ret.voice = dataVoice;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToFootnote(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToLevel(node) {
    var ret = {};
    var foundBracket = false;
    var foundSize = false;
    var foundParentheses = false;
    var foundReference = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "bracket") {
            var dataBracket = xmlToYesNo(ch2);
            ret.bracket = dataBracket;
            foundBracket = true;
        }
        if (ch2.name === "size") {
            var dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
            ret.size = dataSize;
            foundSize = true;
        }
        if (ch2.name === "parentheses") {
            var dataParentheses = xmlToYesNo(ch2);
            ret.parentheses = dataParentheses;
            foundParentheses = true;
        }
        if (ch2.name === "reference") {
            var dataReference = xmlToYesNo(ch2);
            ret.reference = dataReference;
            foundReference = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundBracket) {
        ret.bracket = false;
    }
    if (!foundSize) {
        ret.size = SymbolSize.Unspecified;
    }
    if (!foundParentheses) {
        ret.parentheses = false;
    }
    if (!foundReference) {
        ret.reference = false;
    }
    return ret;
}
function xmlToFermata(node) {
    var ret = {};
    var foundShape = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundType = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getUprightInverted(ch2, UprightInverted.Upright);
            ret.type = dataType;
            foundType = true;
        }
    }
    var ch3 = node;
    var dataShape = getNormalAngledSquare(ch3, NormalAngledSquare.Normal);
    ret.shape = dataShape;
    if (!foundShape) {
        ret.shape = NormalAngledSquare.Normal;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundType) {
        ret.type = UprightInverted.Upright;
    }
    return ret;
}
function xmlToWavyLine(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundPlacement = false;
    var foundColor = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopContinue(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToSegno(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToCoda(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToNormalDot(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToDynamics(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundPlacement = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "fp") {
            var dataFp = true;
            ret.fp = dataFp;
        }
        if (ch.nodeName === "pp") {
            var dataPp = true;
            ret.pp = dataPp;
        }
        if (ch.nodeName === "ppp") {
            var dataPpp = true;
            ret.ppp = dataPpp;
        }
        if (ch.nodeName === "fff") {
            var dataFff = true;
            ret.fff = dataFff;
        }
        if (ch.nodeName === "sf") {
            var dataSf = true;
            ret.sf = dataSf;
        }
        if (ch.nodeName === "rf") {
            var dataRf = true;
            ret.rf = dataRf;
        }
        if (ch.nodeName === "mp") {
            var dataMp = true;
            ret.mp = dataMp;
        }
        if (ch.nodeName === "sfpp") {
            var dataSfpp = true;
            ret.sfpp = dataSfpp;
        }
        if (ch.nodeName === "f") {
            var dataF = true;
            ret.f = dataF;
        }
        if (ch.nodeName === "ffffff") {
            var dataFfffff = true;
            ret.ffffff = dataFfffff;
        }
        if (ch.nodeName === "sfz") {
            var dataSfz = true;
            ret.sfz = dataSfz;
        }
        if (ch.nodeName === "ff") {
            var dataFf = true;
            ret.ff = dataFf;
        }
        if (ch.nodeName === "pppppp") {
            var dataPppppp = true;
            ret.pppppp = dataPppppp;
        }
        if (ch.nodeName === "rfz") {
            var dataRfz = true;
            ret.rfz = dataRfz;
        }
        if (ch.nodeName === "other-dynamics") {
            var dataOtherDynamics = getString(ch, true);
            ret.otherDynamics = dataOtherDynamics;
        }
        if (ch.nodeName === "fz") {
            var dataFz = true;
            ret.fz = dataFz;
        }
        if (ch.nodeName === "ppppp") {
            var dataPpppp = true;
            ret.ppppp = dataPpppp;
        }
        if (ch.nodeName === "mf") {
            var dataMf = true;
            ret.mf = dataMf;
        }
        if (ch.nodeName === "pppp") {
            var dataPppp = true;
            ret.pppp = dataPppp;
        }
        if (ch.nodeName === "fffff") {
            var dataFffff = true;
            ret.fffff = dataFffff;
        }
        if (ch.nodeName === "sffz") {
            var dataSffz = true;
            ret.sffz = dataSffz;
        }
        if (ch.nodeName === "sfp") {
            var dataSfp = true;
            ret.sfp = dataSfp;
        }
        if (ch.nodeName === "p") {
            var dataP = true;
            ret.p = dataP;
        }
        if (ch.nodeName === "ffff") {
            var dataFfff = true;
            ret.ffff = dataFfff;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToFingering(node) {
    var ret = {};
    var foundFinger = false;
    var foundSubstitution = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundAlternate = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "substitution") {
            var dataSubstitution = xmlToYesNo(ch2);
            ret.substitution = dataSubstitution;
            foundSubstitution = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "alternate") {
            var dataAlternate = xmlToYesNo(ch2);
            ret.alternate = dataAlternate;
            foundAlternate = true;
        }
    }
    var ch3 = node;
    var dataFinger = getNumber(ch3, false);
    ret.finger = dataFinger;
    if (!foundFinger) {
        ret.finger = -1;
    }
    if (!foundSubstitution) {
        ret.substitution = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundAlternate) {
        ret.alternate = false;
    }
    return ret;
}
function xmlToFret(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataFret = getNumber(ch3, true);
    ret.fret = dataFret;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToString(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataStringNum = getNumber(ch3, true);
    ret.stringNum = dataStringNum;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToDisplayText(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToAccidentalText(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToMidiDevice(node) {
    var ret = {};
    var foundDeviceName = false;
    var foundPort = false;
    var foundId = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "port") {
            var dataPort = getNumber(ch2, true);
            ret.port = dataPort;
            foundPort = true;
        }
        if (ch2.name === "id") {
            var dataId = getNumber(ch2, true);
            ret.id = dataId;
            foundId = true;
        }
    }
    var ch3 = node;
    var dataDeviceName = getString(ch3, true);
    ret.deviceName = dataDeviceName;
    if (!foundDeviceName) {
        ret.deviceName = "";
    }
    if (!foundPort) {
        ret.port = NaN;
    }
    if (!foundId) {
        ret.id = NaN;
    }
    return ret;
}
/**
 * MIDI 1.0 channel numbers range from 1 to 16.
 */
function verifyMidiChannel(m) {
    // assert(m >= 1 && m <= 16);
}
function xmlToMidiChannel(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 *  midi 1.0 bank numbers range from 1 to 16,384.
 */
function verifyMidiBank(m) {
    // assert(m >= 1 && m <= 16384);
}
function xmlToMidiBank(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 *  MIDI 1.0 program numbers range from 1 to 128.
 */
function verifyMidiProgram(m) {
    // assert(m >= 1 && m <= 128);
}
function xmlToMidiProgram(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 * For unpitched instruments, specify a MIDI 1.0 note number
 * ranging from 1 to 128. It is usually used with MIDI banks for
 * percussion. Note that MIDI 1.0 note numbers are generally
 * specified from 0 to 127 rather than the 1 to 128 numbering
 * used in this element.
 */
function verifyMidiUnpitched(m) {
    // assert(m >= 1 && m <= 128);
}
function xmlToMidiUnpitched(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 * The volume value is a percentage of the maximum
 * ranging from 0 to 100, with decimal values allowed.
 * This corresponds to a scaling value for the MIDI 1.0
 * channel volume controller.
 */
function verifyVolume(m) {
    // assert(m >= 1 && m <= 100);
}
function xmlToVolume(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 * Pan and elevation allow placing of sound in a 3-D space
 * relative to the listener. Both are expressed in degrees
 * ranging from -180 to 180. For pan, 0 is straight ahead,
 * -90 is hard left, 90 is hard right, and -180 and 180
 * are directly behind the listener. For elevation, 0 is
 * level with the listener, 90 is directly above, and -90
 * is directly below.
 */
function verifyPan(m) {
    // assert(m >= -180 && m <= 180);
}
function xmlToPan(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
/**
 * Pan and elevation allow placing of sound in a 3-D space
 * relative to the listener. Both are expressed in degrees
 * ranging from -180 to 180. For pan, 0 is straight ahead,
 * -90 is hard left, 90 is hard right, and -180 and 180
 * are directly behind the listener. For elevation, 0 is
 * level with the listener, 90 is directly above, and -90
 * is directly below.
 */
function verifyElevation(m) {
    // assert(m >= -180 && m <= 180);
}
function xmlToElevation(node) {
    var str = node.textContent;
    var num = str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
    return num;
}
function xmlToMidiInstrument(node) {
    var ret = {
        midiUnpitched: null,
        volume: null,
        pan: null,
        elevation: null,
        midiBank: null,
        midiProgram: null,
        id: "",
        midiChannel: null,
        midiName: ""
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "midi-unpitched") {
            var dataMidiUnpitched = getNumber(ch, true);
            ret.midiUnpitched = dataMidiUnpitched;
        }
        if (ch.nodeName === "volume") {
            var dataVolume = getNumber(ch, true);
            ret.volume = dataVolume;
        }
        if (ch.nodeName === "pan") {
            var dataPan = getNumber(ch, true);
            ret.pan = dataPan;
        }
        if (ch.nodeName === "elevation") {
            var dataElevation = getNumber(ch, true);
            ret.elevation = dataElevation;
        }
        if (ch.nodeName === "midi-bank") {
            var dataMidiBank = getNumber(ch, true);
            ret.midiBank = dataMidiBank;
        }
        if (ch.nodeName === "midi-program") {
            var dataMidiProgram = getNumber(ch, true);
            ret.midiProgram = dataMidiProgram;
        }
        if (ch.nodeName === "midi-channel") {
            var dataMidiChannel = getNumber(ch, true);
            ret.midiChannel = dataMidiChannel;
        }
        if (ch.nodeName === "midi-name") {
            var dataMidiName = getString(ch, true);
            ret.midiName = dataMidiName;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "id") {
            var dataId = getString(ch2, true);
            ret.id = dataId;
        }
    }
    return ret;
}
function xmlToPlay(node) {
    var ret = {
        ipa: "",
        mute: "",
        otherPlay: null,
        semiPitched: "",
        id: ""
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "ipa") {
            var dataIpa = getString(ch, true);
            ret.ipa = dataIpa;
        }
        if (ch.nodeName === "mute") {
            var dataMute = getString(ch, true);
            ret.mute = dataMute;
        }
        if (ch.nodeName === "other-play") {
            var dataOtherPlay = xmlToOtherPlay(ch);
            ret.otherPlay = dataOtherPlay;
        }
        if (ch.nodeName === "semi-pitched") {
            var dataSemiPitched = getString(ch, true);
            ret.semiPitched = dataSemiPitched;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "id") {
            var dataId = getString(ch2, true);
            ret.id = dataId;
        }
    }
    return ret;
}
function xmlToOtherPlay(node) {
    var ret = {
        data: "",
        type: ""
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    return ret;
}
function xmlToScaling(node) {
    var ret = {
        tenths: null,
        millimeters: null
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "tenths") {
            var dataTenths = getNumber(ch, true);
            ret.tenths = dataTenths;
        }
        if (ch.nodeName === "millimeters") {
            var dataMillimeters = getNumber(ch, true);
            ret.millimeters = dataMillimeters;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
(function (OddEvenBoth) {
    OddEvenBoth[OddEvenBoth["Both"] = 2] = "Both";
    OddEvenBoth[OddEvenBoth["Even"] = 1] = "Even";
    OddEvenBoth[OddEvenBoth["Odd"] = 0] = "Odd";
})(exports.OddEvenBoth || (exports.OddEvenBoth = {}));
var OddEvenBoth = exports.OddEvenBoth;
function getOddEvenBoth(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "both") {
        return OddEvenBoth.Both;
    }
    if (s == "even") {
        return OddEvenBoth.Even;
    }
    if (s == "odd") {
        return OddEvenBoth.Odd;
    }
    return fallbackVal;
}
function xmlToPageMargins(node) {
    var ret = {};
    var foundType = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "top-margin") {
            var dataTopMargin = getNumber(ch, true);
            ret.topMargin = dataTopMargin;
        }
        if (ch.nodeName === "left-margin") {
            var dataLeftMargin = getNumber(ch, true);
            ret.leftMargin = dataLeftMargin;
        }
        if (ch.nodeName === "bottom-margin") {
            var dataBottomMargin = getNumber(ch, true);
            ret.bottomMargin = dataBottomMargin;
        }
        if (ch.nodeName === "right-margin") {
            var dataRightMargin = getNumber(ch, true);
            ret.rightMargin = dataRightMargin;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getOddEvenBoth(ch2, OddEvenBoth.Both);
            ret.type = dataType;
            foundType = true;
        }
    }
    if (!foundType) {
        ret.type = OddEvenBoth.Both;
    }
    return ret;
}
function xmlToPageLayout(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "page-height") {
            var dataPageHeight = getNumber(ch, true);
            ret.pageHeight = dataPageHeight;
        }
        if (ch.nodeName === "page-width") {
            var dataPageWidth = getNumber(ch, true);
            ret.pageWidth = dataPageWidth;
        }
        if (ch.nodeName === "page-margins") {
            var dataPageMargins = xmlToPageMargins(ch);
            ret.pageMargins = (ret.pageMargins || []).concat(dataPageMargins);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToSystemLayout(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "system-dividers") {
            var dataSystemDividers = xmlToSystemDividers(ch);
            ret.systemDividers = dataSystemDividers;
        }
        if (ch.nodeName === "system-margins") {
            var dataSystemMargins = xmlToSystemMargins(ch);
            ret.systemMargins = dataSystemMargins;
        }
        if (ch.nodeName === "system-distance") {
            var dataSystemDistance = getNumber(ch, true);
            ret.systemDistance = dataSystemDistance;
        }
        if (ch.nodeName === "top-system-distance") {
            var dataTopSystemDistance = getNumber(ch, true);
            ret.topSystemDistance = dataTopSystemDistance;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToSystemMargins(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "left-margin") {
            var dataLeftMargin = getNumber(ch, true);
            ret.leftMargin = dataLeftMargin;
        }
        if (ch.nodeName === "right-margin") {
            var dataRightMargin = getNumber(ch, true);
            ret.rightMargin = dataRightMargin;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToSystemDividers(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "right-divider") {
            var dataRightDivider = xmlToRightDivider(ch);
            ret.rightDivider = dataRightDivider;
        }
        if (ch.nodeName === "left-divider") {
            var dataLeftDivider = xmlToLeftDivider(ch);
            ret.leftDivider = dataLeftDivider;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToLeftDivider(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToRightDivider(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToStaffLayout(node) {
    var ret = {};
    var foundNum = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "staff-distance") {
            var dataStaffDistance = getNumber(ch, true);
            ret.staffDistance = dataStaffDistance;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "num") {
            var dataNum = getNumber(ch2, true);
            ret.num = dataNum;
            foundNum = true;
        }
    }
    if (!foundNum) {
        ret.num = 1;
    }
    return ret;
}
function xmlToMeasureLayout(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "measure-distance") {
            var dataMeasureDistance = getNumber(ch, true);
            ret.measureDistance = dataMeasureDistance;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToLineWidth(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataTenths = getNumber(ch3, true);
    ret.tenths = dataTenths;
    return ret;
}
(function (CueGraceLarge) {
    CueGraceLarge[CueGraceLarge["Grace"] = 1] = "Grace";
    CueGraceLarge[CueGraceLarge["Cue"] = 0] = "Cue";
    CueGraceLarge[CueGraceLarge["Large"] = 2] = "Large";
})(exports.CueGraceLarge || (exports.CueGraceLarge = {}));
var CueGraceLarge = exports.CueGraceLarge;
function getCueGraceLarge(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "grace") {
        return CueGraceLarge.Grace;
    }
    if (s == "cue") {
        return CueGraceLarge.Cue;
    }
    if (s == "large") {
        return CueGraceLarge.Large;
    }
    return fallbackVal;
}
function xmlToNoteSize(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getCueGraceLarge(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataSize = getNumber(ch3, true);
    ret.size = dataSize;
    return ret;
}
function xmlToDistance(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataTenths = getNumber(ch3, true);
    ret.tenths = dataTenths;
    return ret;
}
function xmlToAppearance(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "line-width") {
            var dataLineWidths = xmlToLineWidth(ch);
            ret.lineWidths = ret.lineWidths || {};
            ret.lineWidths[popFront(toCamelCase((dataLineWidths.type.length ? "_" : "") + dataLineWidths.type))] = dataLineWidths;
        }
        if (ch.nodeName === "distance") {
            var dataDistances = xmlToDistance(ch);
            ret.distances = ret.distances || {};
            ret.distances[popFront(toCamelCase((dataDistances.type.length ? "_" : "") + dataDistances.type))] = dataDistances;
        }
        if (ch.nodeName === "other-appearance") {
            var dataOtherAppearances = getString(ch, true);
            ret.otherAppearances = (ret.otherAppearances || []).concat(dataOtherAppearances);
        }
        if (ch.nodeName === "note-size") {
            var dataNoteSizes = xmlToNoteSize(ch);
            ret.noteSizes = ret.noteSizes || {};
            ret.noteSizes[dataNoteSizes.type] = dataNoteSizes;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToCreator(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataCreator = getString(ch3, true);
    ret.creator = dataCreator;
    return ret;
}
function xmlToRights(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataRights = getString(ch3, true);
    ret.rights = dataRights;
    return ret;
}
function xmlToEncoder(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataEncoder = getString(ch3, true);
    ret.encoder = dataEncoder;
    return ret;
}
function xmlToRelation(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    return ret;
}
function xmlToMiscellaneousField(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "name") {
            var dataName = getString(ch2, true);
            ret.name = dataName;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    return ret;
}
function xmlToMiscellaneous(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "miscellaneous-field") {
            var dataMiscellaneousFields = xmlToMiscellaneousField(ch);
            ret.miscellaneousFields = (ret.miscellaneousFields || []).concat(dataMiscellaneousFields);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToIdentification(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "miscellaneous") {
            var dataMiscellaneous = xmlToMiscellaneous(ch);
            ret.miscellaneous = dataMiscellaneous;
        }
        if (ch.nodeName === "creator") {
            var dataCreators = xmlToCreator(ch);
            ret.creators = (ret.creators || []).concat(dataCreators);
        }
        if (ch.nodeName === "relation") {
            var dataRelations = xmlToRelation(ch);
            ret.relations = (ret.relations || []).concat(dataRelations);
        }
        if (ch.nodeName === "rights") {
            var dataRights = xmlToRights(ch);
            ret.rights = (ret.rights || []).concat(dataRights);
        }
        if (ch.nodeName === "encoding") {
            var dataEncoding = xmlToEncoding(ch);
            ret.encoding = dataEncoding;
        }
        if (ch.nodeName === "source") {
            var dataSource = getString(ch, true);
            ret.source = dataSource;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToSupports(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "element") {
            var dataElement = getString(ch2, true);
            ret.element = dataElement;
        }
        if (ch2.name === "attribute") {
            var dataAttribute = getString(ch2, true);
            ret.attribute = dataAttribute;
        }
        if (ch2.name === "value") {
            var dataValue = getString(ch2, true);
            ret.value = dataValue;
        }
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    ret.element = ret.element || "";
    ret.attribute = ret.attribute || "";
    ret.value = ret.value || "";
    ret.type = ret.type || "";
    return ret;
}
function xmlToEncoding(node) {
    var ret = {
        encodingDescriptions: [],
        encodingDate: null,
        supports: {},
        encoders: [],
        softwares: []
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "encoding-description") {
            var dataEncodingDescriptions = getString(ch, true);
            ret.encodingDescriptions = (ret.encodingDescriptions || []).concat(dataEncodingDescriptions);
        }
        if (ch.nodeName === "encoding-date") {
            var dataEncodingDate = xmlToEncodingDate(ch);
            ret.encodingDate = dataEncodingDate;
        }
        if (ch.nodeName === "supports") {
            var dataSupports = xmlToSupports(ch);
            ret.supports = ret.supports || {};
            ret.supports[popFront(toCamelCase((dataSupports.element.length ? "_" : "") + dataSupports.element) + (dataSupports.attribute.length ? "_" : "") + toCamelCase(dataSupports.attribute))] = dataSupports;
        }
        if (ch.nodeName === "encoder") {
            var dataEncoders = xmlToEncoder(ch);
            ret.encoders = (ret.encoders || []).concat(dataEncoders);
        }
        if (ch.nodeName === "software") {
            var dataSoftwares = getString(ch, true);
            ret.softwares = (ret.softwares || []).concat(dataSoftwares);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
(function (SeparatorType) {
    SeparatorType[SeparatorType["None"] = 0] = "None";
    SeparatorType[SeparatorType["Horizontal"] = 1] = "Horizontal";
    SeparatorType[SeparatorType["Diagonal"] = 2] = "Diagonal";
    SeparatorType[SeparatorType["Vertical"] = 3] = "Vertical";
    SeparatorType[SeparatorType["Adjacent"] = 4] = "Adjacent";
})(exports.SeparatorType || (exports.SeparatorType = {}));
var SeparatorType = exports.SeparatorType;
function getSeparatorType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return SeparatorType.None;
    }
    if (s == "horizontal") {
        return SeparatorType.Horizontal;
    }
    if (s == "diagonal") {
        return SeparatorType.Diagonal;
    }
    if (s == "vertical") {
        return SeparatorType.Vertical;
    }
    if (s == "adjacent") {
        return SeparatorType.Adjacent;
    }
    return fallbackVal;
}
function xmlToTimeSeparator(node) {
    var ret = {};
    var foundSeparator = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "separator") {
            var dataSeparator = getSeparatorType(ch2, SeparatorType.None);
            ret.separator = dataSeparator;
            foundSeparator = true;
        }
    }
    if (!foundSeparator) {
        ret.separator = SeparatorType.None;
    }
    return ret;
}
(function (TimeSymbolType) {
    TimeSymbolType[TimeSymbolType["DottedNote"] = 4] = "DottedNote";
    TimeSymbolType[TimeSymbolType["Cut"] = 1] = "Cut";
    TimeSymbolType[TimeSymbolType["SingleNumber"] = 2] = "SingleNumber";
    TimeSymbolType[TimeSymbolType["Note"] = 3] = "Note";
    TimeSymbolType[TimeSymbolType["Common"] = 0] = "Common";
    TimeSymbolType[TimeSymbolType["Normal"] = 5] = "Normal";
})(exports.TimeSymbolType || (exports.TimeSymbolType = {}));
var TimeSymbolType = exports.TimeSymbolType;
function getTimeSymbolType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "dotted-note") {
        return TimeSymbolType.DottedNote;
    }
    if (s == "cut") {
        return TimeSymbolType.Cut;
    }
    if (s == "single-number") {
        return TimeSymbolType.SingleNumber;
    }
    if (s == "note") {
        return TimeSymbolType.Note;
    }
    if (s == "common") {
        return TimeSymbolType.Common;
    }
    if (s == "normal") {
        return TimeSymbolType.Normal;
    }
    return fallbackVal;
}
function xmlToTimeSymbol(node) {
    var ret = {};
    var foundSymbol = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "symbol") {
            var dataSymbol = getTimeSymbolType(ch2, TimeSymbolType.Normal);
            ret.symbol = dataSymbol;
            foundSymbol = true;
        }
    }
    if (!foundSymbol) {
        ret.symbol = TimeSymbolType.Normal;
    }
    return ret;
}
(function (CancelLocation) {
    CancelLocation[CancelLocation["Right"] = 1] = "Right";
    CancelLocation[CancelLocation["BeforeBarline"] = 2] = "BeforeBarline";
    CancelLocation[CancelLocation["Left"] = 0] = "Left";
})(exports.CancelLocation || (exports.CancelLocation = {}));
var CancelLocation = exports.CancelLocation;
function getCancelLocation(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "right") {
        return CancelLocation.Right;
    }
    if (s == "before-barline") {
        return CancelLocation.BeforeBarline;
    }
    if (s == "left") {
        return CancelLocation.Left;
    }
    return fallbackVal;
}
function xmlToCancel(node) {
    var ret = {};
    var foundLocation = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "location") {
            var dataLocation = getCancelLocation(ch2, CancelLocation.Left);
            ret.location = dataLocation;
            foundLocation = true;
        }
    }
    var ch3 = node;
    var dataFifths = getNumber(ch3, true);
    ret.fifths = dataFifths;
    if (!foundLocation) {
        ret.location = CancelLocation.Left;
    }
    return ret;
}
function xmlToKeyOctave(node) {
    var ret = {};
    var foundCancel = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "cancel") {
            var dataCancel = xmlToYesNo(ch2);
            ret.cancel = dataCancel;
            foundCancel = true;
        }
    }
    var ch3 = node;
    var dataOctave = getNumber(ch3, true);
    ret.octave = dataOctave;
    if (!foundCancel) {
        ret.cancel = false;
    }
    return ret;
}
function xmlToKey(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPrintObject = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "cancel") {
            var dataCancel = xmlToCancel(ch);
            ret.cancel = dataCancel;
        }
        if (ch.nodeName === "key-step") {
            var dataKeySteps = getString(ch, true);
            ret.keySteps = (ret.keySteps || []).concat(dataKeySteps);
        }
        if (ch.nodeName === "key-octave") {
            var dataKeyOctaves = xmlToKeyOctave(ch);
            ret.keyOctaves = (ret.keyOctaves || []).concat(dataKeyOctaves);
        }
        if (ch.nodeName === "fifths") {
            var dataFifths = getNumber(ch, true);
            ret.fifths = dataFifths;
        }
        if (ch.nodeName === "key-alter") {
            var dataKeyAlters = getString(ch, true);
            ret.keyAlters = (ret.keyAlters || []).concat(dataKeyAlters);
        }
        if (ch.nodeName === "key-accidental") {
            var dataKeyAccidentals = getString(ch, true);
            ret.keyAccidentals = (ret.keyAccidentals || []);
            ret.keyAccidentals.length = Math.max(ret.keyAccidentals.length, ret.keySteps.length);
            ret.keyAccidentals[ret.keySteps.length - 1] = dataKeyAccidentals;
        }
        if (ch.nodeName === "mode") {
            var dataMode = getString(ch, true);
            ret.mode = dataMode;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!ret.keyAccidentals) {
        ret.keyAccidentals = [];
    }
    ret._class = "Key";
    return ret;
}
function xmlToTime(node) {
    var ret = {};
    var foundSymbol = false;
    var foundSeparator = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundPrintObject = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "interchangeable") {
            var dataInterchangeable = xmlToInterchangeable(ch);
            ret.interchangeable = dataInterchangeable;
        }
        if (ch.nodeName === "beats") {
            var dataBeats = getString(ch, true);
            ret.beats = (ret.beats || []).concat(dataBeats);
        }
        if (ch.nodeName === "beat-type") {
            var dataBeatTypes = getNumber(ch, true);
            ret.beatTypes = (ret.beatTypes || []).concat(dataBeatTypes);
        }
        if (ch.nodeName === "senza-misura") {
            var dataSenzaMisura = getString(ch, true);
            ret.senzaMisura = dataSenzaMisura;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "symbol") {
            var dataSymbol = getTimeSymbolType(ch2, TimeSymbolType.Normal);
            ret.symbol = dataSymbol;
            foundSymbol = true;
        }
        if (ch2.name === "separator") {
            var dataSeparator = getSeparatorType(ch2, SeparatorType.None);
            ret.separator = dataSeparator;
            foundSeparator = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
    }
    if (!foundSymbol) {
        ret.symbol = TimeSymbolType.Normal;
    }
    if (!foundSeparator) {
        ret.separator = SeparatorType.None;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    ret._class = "Time";
    return ret;
}
function xmlToInterchangeable(node) {
    var ret = {};
    var foundSymbol = false;
    var foundSeparator = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "beats") {
            var dataBeats = getString(ch, true);
            ret.beats = (ret.beats || []).concat(dataBeats);
        }
        if (ch.nodeName === "beat-type") {
            var dataBeatTypes = getNumber(ch, true);
            ret.beatTypes = (ret.beatTypes || []).concat(dataBeatTypes);
        }
        if (ch.nodeName === "time-relation") {
            var dataTimeRelation = getString(ch, true);
            ret.timeRelation = dataTimeRelation;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "symbol") {
            var dataSymbol = getTimeSymbolType(ch2, TimeSymbolType.Normal);
            ret.symbol = dataSymbol;
            foundSymbol = true;
        }
        if (ch2.name === "separator") {
            var dataSeparator = getSeparatorType(ch2, SeparatorType.None);
            ret.separator = dataSeparator;
            foundSeparator = true;
        }
    }
    if (!foundSymbol) {
        ret.symbol = TimeSymbolType.Normal;
    }
    if (!foundSeparator) {
        ret.separator = SeparatorType.None;
    }
    return ret;
}
(function (PartSymbolType) {
    PartSymbolType[PartSymbolType["None"] = 0] = "None";
    PartSymbolType[PartSymbolType["Line"] = 2] = "Line";
    PartSymbolType[PartSymbolType["Bracket"] = 3] = "Bracket";
    PartSymbolType[PartSymbolType["Square"] = 4] = "Square";
    PartSymbolType[PartSymbolType["Brace"] = 1] = "Brace";
})(exports.PartSymbolType || (exports.PartSymbolType = {}));
var PartSymbolType = exports.PartSymbolType;
function getPartSymbolType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return PartSymbolType.None;
    }
    if (s == "line") {
        return PartSymbolType.Line;
    }
    if (s == "bracket") {
        return PartSymbolType.Bracket;
    }
    if (s == "square") {
        return PartSymbolType.Square;
    }
    if (s == "brace") {
        return PartSymbolType.Brace;
    }
    return fallbackVal;
}
function xmlToPartSymbol(node) {
    var ret = {};
    var foundTopStaff = false;
    var foundColor = false;
    var foundBottomStaff = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "top-staff") {
            var dataTopStaff = getNumber(ch2, true);
            ret.topStaff = dataTopStaff;
            foundTopStaff = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "bottom-staff") {
            var dataBottomStaff = getNumber(ch2, true);
            ret.bottomStaff = dataBottomStaff;
            foundBottomStaff = true;
        }
    }
    var ch3 = node;
    var dataType = getPartSymbolType(ch3, null);
    ret.type = dataType;
    if (!foundTopStaff) {
        ret.topStaff = -1;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundBottomStaff) {
        ret.bottomStaff = -1;
    }
    ret._class = "PartSymbol";
    return ret;
}
function xmlToClef(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundSize = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPrintObject = false;
    var foundAfterBarline = false;
    var foundAdditional = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "clef-octave-change") {
            var dataClefOctaveChange = getString(ch, true);
            ret.clefOctaveChange = dataClefOctaveChange;
        }
        if (ch.nodeName === "sign") {
            var dataSign = getString(ch, true);
            ret.sign = dataSign;
        }
        if (ch.nodeName === "line") {
            var dataLine = getNumber(ch, true);
            ret.line = dataLine;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "size") {
            var dataSize = getSymbolSize(ch2, SymbolSize.Full);
            ret.size = dataSize;
            foundSize = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "after-barline") {
            var dataAfterBarline = xmlToYesNo(ch2);
            ret.afterBarline = dataAfterBarline;
            foundAfterBarline = true;
        }
        if (ch2.name === "additional") {
            var dataAdditional = xmlToYesNo(ch2);
            ret.additional = dataAdditional;
            foundAdditional = true;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundSize) {
        ret.size = SymbolSize.Full;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundAfterBarline) {
        ret.afterBarline = false;
    }
    if (!foundAdditional) {
        ret.additional = false;
    }
    return ret;
}
function xmlToStaffTuning(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "tuning-alter") {
            var dataTuningAlter = getString(ch, true);
            ret.tuningAlter = dataTuningAlter;
        }
        if (ch.nodeName === "tuning-step") {
            var dataTuningStep = getString(ch, true);
            ret.tuningStep = dataTuningStep;
        }
        if (ch.nodeName === "tuning-octave") {
            var dataTuningOctave = getString(ch, true);
            ret.tuningOctave = dataTuningOctave;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line") {
            var dataLine = getString(ch2, true);
            ret.line = dataLine;
        }
    }
    return ret;
}
(function (ShowFretsType) {
    ShowFretsType[ShowFretsType["Letters"] = 1] = "Letters";
    ShowFretsType[ShowFretsType["Numbers"] = 0] = "Numbers";
})(exports.ShowFretsType || (exports.ShowFretsType = {}));
var ShowFretsType = exports.ShowFretsType;
function getShowFretsType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "letters") {
        return ShowFretsType.Letters;
    }
    if (s == "numbers") {
        return ShowFretsType.Numbers;
    }
    return fallbackVal;
}
function xmlToStaffDetails(node) {
    var ret = {};
    var foundShowFrets = false;
    var foundNumber_ = false;
    var foundPrintObject = false;
    var foundPrintSpacing = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "staff-lines") {
            var dataStaffLines = getNumber(ch, true);
            ret.staffLines = dataStaffLines;
        }
        if (ch.nodeName === "staff-tuning") {
            var dataStaffTunings = xmlToStaffTuning(ch);
            ret.staffTunings = (ret.staffTunings || []).concat(dataStaffTunings);
        }
        if (ch.nodeName === "staff-size") {
            var dataStaffSize = getNumber(ch, true);
            ret.staffSize = dataStaffSize;
        }
        if (ch.nodeName === "capo") {
            var dataCapo = getString(ch, true);
            ret.capo = dataCapo;
        }
        if (ch.nodeName === "staff-type") {
            var dataStaffType = getString(ch, true);
            ret.staffType = dataStaffType;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "show-frets") {
            var dataShowFrets = getShowFretsType(ch2, ShowFretsType.Numbers);
            ret.showFrets = dataShowFrets;
            foundShowFrets = true;
        }
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "print-spacing") {
            var dataPrintSpacing = xmlToYesNo(ch2);
            ret.printSpacing = dataPrintSpacing;
            foundPrintSpacing = true;
        }
    }
    if (!foundShowFrets) {
        ret.showFrets = ShowFretsType.Numbers;
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundPrintSpacing) {
        ret.printSpacing = true;
    }
    return ret;
}
function xmlToDouble(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToTranspose(node) {
    var ret = {};
    var foundNumber_ = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "diatonic") {
            var dataDiatonic = getString(ch, true);
            ret.diatonic = dataDiatonic;
        }
        if (ch.nodeName === "octave-change") {
            var dataOctaveChange = getString(ch, true);
            ret.octaveChange = dataOctaveChange;
        }
        if (ch.nodeName === "double") {
            var dataDouble = xmlToDouble(ch);
            ret.double = dataDouble;
        }
        if (ch.nodeName === "chromatic") {
            var dataChromatic = getString(ch, true);
            ret.chromatic = dataChromatic;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
    }
    if (!foundNumber_) {
        ret.number = NaN;
    }
    return ret;
}
function xmlToDirective(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToSlashDot(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToMultipleRest(node) {
    var ret = {};
    var foundUseSymbols = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "use-symbols") {
            var dataUseSymbols = xmlToYesNo(ch2);
            ret.useSymbols = dataUseSymbols;
            foundUseSymbols = true;
        }
    }
    var ch3 = node;
    var dataCount = getNumber(ch3, true);
    ret.count = dataCount;
    if (!foundUseSymbols) {
        ret.useSymbols = false;
    }
    return ret;
}
function xmlToMeasureRepeat(node) {
    var ret = {};
    var foundSlashes = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
        if (ch2.name === "slashes") {
            var dataSlashes = getNumber(ch2, true);
            ret.slashes = dataSlashes;
            foundSlashes = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundSlashes) {
        ret.slashes = 1;
    }
    return ret;
}
function xmlToBeatRepeat(node) {
    var ret = {};
    var foundUseDots = false;
    var foundSlases = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "slash-type") {
            var dataSlashType = getString(ch, true);
            ret.slashType = dataSlashType;
        }
        if (ch.nodeName === "slash-dot") {
            var dataSlashDots = xmlToSlashDot(ch);
            ret.slashDots = (ret.slashDots || []).concat(dataSlashDots);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "use-dots") {
            var dataUseDots = xmlToYesNo(ch2);
            ret.useDots = dataUseDots;
            foundUseDots = true;
        }
        if (ch2.name === "slases") {
            var dataSlases = getNumber(ch2, true);
            ret.slases = dataSlases;
            foundSlases = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundUseDots) {
        ret.useDots = false;
    }
    if (!foundSlases) {
        ret.slases = 1;
    }
    return ret;
}
function xmlToSlash(node) {
    var ret = {};
    var foundUseDots = false;
    var foundUseStems = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "slash-type") {
            var dataSlashType = getString(ch, true);
            ret.slashType = dataSlashType;
        }
        if (ch.nodeName === "slash-dot") {
            var dataSlashDots = xmlToSlashDot(ch);
            ret.slashDots = (ret.slashDots || []).concat(dataSlashDots);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "use-dots") {
            var dataUseDots = xmlToYesNo(ch2);
            ret.useDots = dataUseDots;
            foundUseDots = true;
        }
        if (ch2.name === "use-stems") {
            var dataUseStems = xmlToYesNo(ch2);
            ret.useStems = dataUseStems;
            foundUseStems = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundUseDots) {
        ret.useDots = false;
    }
    if (!foundUseStems) {
        ret.useStems = false;
    }
    return ret;
}
function xmlToMeasureStyle(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "measure-repeat") {
            var dataMeasureRepeat = xmlToMeasureRepeat(ch);
            ret.measureRepeat = dataMeasureRepeat;
        }
        if (ch.nodeName === "beat-repeat") {
            var dataBeatRepeat = xmlToBeatRepeat(ch);
            ret.beatRepeat = dataBeatRepeat;
        }
        if (ch.nodeName === "multiple-rest") {
            var dataMultipleRest = xmlToMultipleRest(ch);
            ret.multipleRest = dataMultipleRest;
        }
        if (ch.nodeName === "slash") {
            var dataSlash = xmlToSlash(ch);
            ret.slash = dataSlash;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToAttributes(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "divisions") {
            var dataDivisions = getNumber(ch, true);
            ret.divisions = dataDivisions;
        }
        if (ch.nodeName === "part-symbol") {
            var dataPartSymbol = xmlToPartSymbol(ch);
            ret.partSymbol = dataPartSymbol;
        }
        if (ch.nodeName === "clef") {
            var dataClefs = xmlToClef(ch);
            ret.clefs = (ret.clefs || []).concat(dataClefs);
        }
        if (ch.nodeName === "measure-style") {
            var dataMeasureStyle = xmlToMeasureStyle(ch);
            ret.measureStyles = (ret.measureStyles || []).concat(dataMeasureStyle);
        }
        if (ch.nodeName === "time") {
            var dataTimes = xmlToTime(ch);
            ret.times = (ret.times || []).concat(dataTimes);
        }
        if (ch.nodeName === "staff-details") {
            var dataStaffDetails = xmlToStaffDetails(ch);
            ret.staffDetails = (ret.staffDetails || []).concat(dataStaffDetails);
        }
        if (ch.nodeName === "transpose") {
            var dataTransposes = xmlToTranspose(ch);
            ret.transposes = (ret.transposes || []).concat(dataTransposes);
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "staves") {
            var dataStaves = getNumber(ch, true);
            ret.staves = dataStaves;
        }
        if (ch.nodeName === "instruments") {
            var dataInstruments = getString(ch, true);
            ret.instruments = dataInstruments;
        }
        if (ch.nodeName === "key") {
            var dataKeySignatures = xmlToKey(ch);
            ret.keySignatures = (ret.keySignatures || []).concat(dataKeySignatures);
        }
        if (ch.nodeName === "directive") {
            var dataDirectives = xmlToDirective(ch);
            ret.directives = (ret.directives || []).concat(dataDirectives);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "Attributes";
    return ret;
}
function xmlToCue(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToGrace(node) {
    var ret = {};
    var foundSlash = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "make-time") {
            var dataMakeTime = getString(ch2, true);
            ret.makeTime = dataMakeTime;
        }
        if (ch2.name === "steal-time-previous") {
            var dataStealTimePrevious = getString(ch2, true);
            ret.stealTimePrevious = dataStealTimePrevious;
        }
        if (ch2.name === "slash") {
            var dataSlash = xmlToYesNo(ch2);
            ret.slash = dataSlash;
            foundSlash = true;
        }
        if (ch2.name === "steal-time-following") {
            var dataStealTimeFollowing = getString(ch2, true);
            ret.stealTimeFollowing = dataStealTimeFollowing;
        }
    }
    if (!foundSlash) {
        ret.slash = false;
    }
    return ret;
}
function xmlToChord(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToUnpitched(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "display-step") {
            var dataDisplayStep = getString(ch, true);
            ret.displayStep = dataDisplayStep;
        }
        if (ch.nodeName === "display-octave") {
            var dataDisplayOctave = getString(ch, true);
            ret.displayOctave = dataDisplayOctave;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToPitch(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "alter") {
            var dataAlter = getNumber(ch, true);
            ret.alter = dataAlter;
        }
        if (ch.nodeName === "step") {
            var dataStep = getString(ch, true);
            ret.step = dataStep;
        }
        if (ch.nodeName === "octave") {
            var dataOctave = getNumber(ch, true);
            ret.octave = dataOctave;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToFullNote(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "unpitched") {
            var dataUnpitched = xmlToUnpitched(ch);
            ret.unpitched = dataUnpitched;
        }
        if (ch.nodeName === "chord") {
            var dataChord = xmlToChord(ch);
            ret.chord = dataChord;
        }
        if (ch.nodeName === "pitch") {
            var dataPitch = xmlToPitch(ch);
            ret.pitch = dataPitch;
        }
        if (ch.nodeName === "rest") {
            var dataRest = xmlToRest(ch);
            ret.rest = dataRest;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToRest(node) {
    var ret = {};
    var foundMeasure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "display-step") {
            var dataDisplayStep = getString(ch, true);
            ret.displayStep = dataDisplayStep;
        }
        if (ch.nodeName === "display-octave") {
            var dataDisplayOctave = getString(ch, true);
            ret.displayOctave = dataDisplayOctave;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "measure") {
            var dataMeasure = xmlToYesNo(ch2);
            ret.measure = dataMeasure;
            foundMeasure = true;
        }
    }
    if (!foundMeasure) {
        ret.measure = false;
    }
    return ret;
}
function xmlToTie(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "time-only") {
            var dataTimeOnly = getString(ch2, true);
            ret.timeOnly = dataTimeOnly;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    return ret;
}
function xmlToInstrument(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "id") {
            var dataId = getString(ch2, true);
            ret.id = dataId;
        }
    }
    return ret;
}
function xmlToNote(node) {
    var ret = {};
    var foundAttack = false;
    var foundEndDynamics = false;
    var foundPizzicato = false;
    var foundDynamics = false;
    var foundRelease = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPrintObject = false;
    var foundPrintSpacing = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "notehead-text") {
            var dataNoteheadText = xmlToNoteheadText(ch);
            ret.noteheadText = dataNoteheadText;
        }
        if (ch.nodeName === "time-modification") {
            var dataTimeModification = xmlToTimeModification(ch);
            ret.timeModification = dataTimeModification;
        }
        if (ch.nodeName === "accidental") {
            var dataAccidental = xmlToAccidental(ch);
            ret.accidental = dataAccidental;
        }
        if (ch.nodeName === "instrument") {
            var dataInstrument = xmlToInstrument(ch);
            ret.instrument = dataInstrument;
        }
        if (ch.nodeName === "lyric") {
            var dataLyrics = xmlToLyric(ch);
            ret.lyrics = (ret.lyrics || []).concat(dataLyrics);
        }
        if (ch.nodeName === "dot") {
            var dataDots = xmlToDot(ch);
            ret.dots = (ret.dots || []).concat(dataDots);
        }
        if (ch.nodeName === "notations") {
            var dataNotations = xmlToNotations(ch);
            ret.notations = (ret.notations || []).concat(dataNotations);
        }
        if (ch.nodeName === "stem") {
            var dataStem = xmlToStem(ch);
            ret.stem = dataStem;
        }
        if (ch.nodeName === "type") {
            var dataNoteType = xmlToType(ch);
            ret.noteType = dataNoteType;
        }
        if (ch.nodeName === "cue") {
            var dataCue = xmlToCue(ch);
            ret.cue = dataCue;
        }
        if (ch.nodeName === "duration") {
            var dataDuration = getNumber(ch, true);
            ret.duration = dataDuration;
        }
        if (ch.nodeName === "tie") {
            var dataTies = xmlToTie(ch);
            ret.ties = (ret.ties || []).concat(dataTies);
        }
        if (ch.nodeName === "play") {
            var dataPlay = xmlToPlay(ch);
            ret.play = dataPlay;
        }
        if (ch.nodeName === "staff") {
            var dataStaff = getNumber(ch, true);
            ret.staff = dataStaff;
        }
        if (ch.nodeName === "grace") {
            var dataGrace = xmlToGrace(ch);
            ret.grace = dataGrace;
        }
        if (ch.nodeName === "notehead") {
            var dataNotehead = xmlToNotehead(ch);
            ret.notehead = dataNotehead;
        }
        if (ch.nodeName === "voice") {
            var dataVoice = getNumber(ch, true);
            ret.voice = dataVoice;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "unpitched") {
            var dataUnpitched = xmlToUnpitched(ch);
            ret.unpitched = dataUnpitched;
        }
        if (ch.nodeName === "chord") {
            var dataChord = xmlToChord(ch);
            ret.chord = dataChord;
        }
        if (ch.nodeName === "pitch") {
            var dataPitch = xmlToPitch(ch);
            ret.pitch = dataPitch;
        }
        if (ch.nodeName === "rest") {
            var dataRest = xmlToRest(ch);
            ret.rest = dataRest;
        }
        if (ch.nodeName === "beam") {
            var dataBeams = xmlToBeam(ch);
            ret.beams = (ret.beams || []).concat(dataBeams);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "attack") {
            var dataAttack = getNumber(ch2, true);
            ret.attack = dataAttack;
            foundAttack = true;
        }
        if (ch2.name === "end-dynamics") {
            var dataEndDynamics = getNumber(ch2, true);
            ret.endDynamics = dataEndDynamics;
            foundEndDynamics = true;
        }
        if (ch2.name === "pizzicato") {
            var dataPizzicato = xmlToYesNo(ch2);
            ret.pizzicato = dataPizzicato;
            foundPizzicato = true;
        }
        if (ch2.name === "dynamics") {
            var dataDynamics = getNumber(ch2, true);
            ret.dynamics = dataDynamics;
            foundDynamics = true;
        }
        if (ch2.name === "release") {
            var dataRelease = getNumber(ch2, true);
            ret.release = dataRelease;
            foundRelease = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-dot") {
            var dataPrintDot = xmlToYesNo(ch2);
            ret.printDot = dataPrintDot;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "print-spacing") {
            var dataPrintSpacing = xmlToYesNo(ch2);
            ret.printSpacing = dataPrintSpacing;
            foundPrintSpacing = true;
        }
        if (ch2.name === "print-lyric") {
            var dataPrintLyric = xmlToYesNo(ch2);
            ret.printLyric = dataPrintLyric;
        }
        if (ch2.name === "time-only") {
            var dataTimeOnly = getString(ch2, true);
            ret.timeOnly = dataTimeOnly;
        }
    }
    if (!foundAttack) {
        ret.attack = NaN;
    }
    if (!foundEndDynamics) {
        ret.endDynamics = 90;
    }
    if (!foundPizzicato) {
        ret.pizzicato = false;
    }
    if (!foundDynamics) {
        ret.dynamics = 90;
    }
    if (!foundRelease) {
        ret.release = NaN;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundPrintSpacing) {
        ret.printSpacing = true;
    }
    ret._class = "Note";
    return ret;
}
(function (Count) {
    Count[Count["Quarter"] = 4] = "Quarter";
    Count[Count["Breve"] = 9990] = "Breve";
    Count[Count["Long"] = 9991] = "Long";
    Count[Count["_1024th"] = 1024] = "_1024th";
    Count[Count["_32nd"] = 32] = "_32nd";
    Count[Count["_16th"] = 16] = "_16th";
    Count[Count["Eighth"] = 8] = "Eighth";
    Count[Count["Maxima"] = 9992] = "Maxima";
    Count[Count["_512th"] = 512] = "_512th";
    Count[Count["_64th"] = 64] = "_64th";
    Count[Count["_256th"] = 256] = "_256th";
    Count[Count["_128th"] = 128] = "_128th";
    Count[Count["Half"] = 2] = "Half";
    Count[Count["Whole"] = 1] = "Whole";
})(exports.Count || (exports.Count = {}));
var Count = exports.Count;
function getCount(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "quarter") {
        return Count.Quarter;
    }
    if (s == "breve") {
        return Count.Breve;
    }
    if (s == "long") {
        return Count.Long;
    }
    if (s == "1024th") {
        return Count._1024th;
    }
    if (s == "32nd") {
        return Count._32nd;
    }
    if (s == "16th") {
        return Count._16th;
    }
    if (s == "eighth") {
        return Count.Eighth;
    }
    if (s == "maxima") {
        return Count.Maxima;
    }
    if (s == "512th") {
        return Count._512th;
    }
    if (s == "64th") {
        return Count._64th;
    }
    if (s == "256th") {
        return Count._256th;
    }
    if (s == "128th") {
        return Count._128th;
    }
    if (s == "half") {
        return Count.Half;
    }
    if (s == "whole") {
        return Count.Whole;
    }
    return fallbackVal;
}
function xmlToType(node) {
    var ret = {};
    var foundSize = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "size") {
            var dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
            ret.size = dataSize;
            foundSize = true;
        }
    }
    var ch3 = node;
    var dataDuration = getCount(ch3, null);
    ret.duration = dataDuration;
    if (!foundSize) {
        ret.size = SymbolSize.Unspecified;
    }
    return ret;
}
function xmlToDot(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
(function (MxmlAccidental) {
    MxmlAccidental[MxmlAccidental["NaturalFlat"] = 7] = "NaturalFlat";
    MxmlAccidental[MxmlAccidental["SharpUp"] = 13] = "SharpUp";
    MxmlAccidental[MxmlAccidental["ThreeQuartersFlat"] = 10] = "ThreeQuartersFlat";
    MxmlAccidental[MxmlAccidental["ThreeQuartersSharp"] = 11] = "ThreeQuartersSharp";
    MxmlAccidental[MxmlAccidental["QuarterFlat"] = 8] = "QuarterFlat";
    MxmlAccidental[MxmlAccidental["Flat"] = 2] = "Flat";
    MxmlAccidental[MxmlAccidental["TripleSharp"] = 18] = "TripleSharp";
    MxmlAccidental[MxmlAccidental["Flat1"] = 27] = "Flat1";
    MxmlAccidental[MxmlAccidental["Flat2"] = 28] = "Flat2";
    MxmlAccidental[MxmlAccidental["Flat3"] = 29] = "Flat3";
    MxmlAccidental[MxmlAccidental["Flat4"] = 291] = "Flat4";
    MxmlAccidental[MxmlAccidental["TripleFlat"] = 191] = "TripleFlat";
    MxmlAccidental[MxmlAccidental["Flat5"] = 30] = "Flat5";
    MxmlAccidental[MxmlAccidental["Sharp"] = 0] = "Sharp";
    MxmlAccidental[MxmlAccidental["QuarterSharp"] = 9] = "QuarterSharp";
    MxmlAccidental[MxmlAccidental["SlashFlat"] = 21] = "SlashFlat";
    MxmlAccidental[MxmlAccidental["FlatDown"] = 16] = "FlatDown";
    MxmlAccidental[MxmlAccidental["NaturalDown"] = 14] = "NaturalDown";
    MxmlAccidental[MxmlAccidental["SlashQuarterSharp"] = 19] = "SlashQuarterSharp";
    MxmlAccidental[MxmlAccidental["SharpSharp"] = 4] = "SharpSharp";
    MxmlAccidental[MxmlAccidental["Sharp1"] = 23] = "Sharp1";
    MxmlAccidental[MxmlAccidental["FlatUp"] = 17] = "FlatUp";
    MxmlAccidental[MxmlAccidental["Sharp2"] = 24] = "Sharp2";
    MxmlAccidental[MxmlAccidental["Sharp3"] = 25] = "Sharp3";
    MxmlAccidental[MxmlAccidental["DoubleSharp"] = 3] = "DoubleSharp";
    MxmlAccidental[MxmlAccidental["Sharp4"] = 251] = "Sharp4";
    MxmlAccidental[MxmlAccidental["Sharp5"] = 26] = "Sharp5";
    MxmlAccidental[MxmlAccidental["Sori"] = 31] = "Sori";
    MxmlAccidental[MxmlAccidental["DoubleSlashFlat"] = 22] = "DoubleSlashFlat";
    MxmlAccidental[MxmlAccidental["SharpDown"] = 12] = "SharpDown";
    MxmlAccidental[MxmlAccidental["Koron"] = 32] = "Koron";
    MxmlAccidental[MxmlAccidental["NaturalUp"] = 15] = "NaturalUp";
    MxmlAccidental[MxmlAccidental["SlashSharp"] = 20] = "SlashSharp";
    MxmlAccidental[MxmlAccidental["NaturalSharp"] = 6] = "NaturalSharp";
    MxmlAccidental[MxmlAccidental["FlatFlat"] = 5] = "FlatFlat";
    MxmlAccidental[MxmlAccidental["Natural"] = 1] = "Natural";
    MxmlAccidental[MxmlAccidental["DoubleFlat"] = 33] = "DoubleFlat";
})(exports.MxmlAccidental || (exports.MxmlAccidental = {}));
var MxmlAccidental = exports.MxmlAccidental;
function getMxmlAccidental(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "natural-flat") {
        return MxmlAccidental.NaturalFlat;
    }
    if (s == "sharp-up") {
        return MxmlAccidental.SharpUp;
    }
    if (s == "three-quarters-flat") {
        return MxmlAccidental.ThreeQuartersFlat;
    }
    if (s == "three-quarters-sharp") {
        return MxmlAccidental.ThreeQuartersSharp;
    }
    if (s == "quarter-flat") {
        return MxmlAccidental.QuarterFlat;
    }
    if (s == "flat") {
        return MxmlAccidental.Flat;
    }
    if (s == "triple-sharp") {
        return MxmlAccidental.TripleSharp;
    }
    if (s == "flat-1") {
        return MxmlAccidental.Flat1;
    }
    if (s == "flat-2") {
        return MxmlAccidental.Flat2;
    }
    if (s == "flat-3") {
        return MxmlAccidental.Flat3;
    }
    if (s == "flat-4") {
        return MxmlAccidental.Flat4;
    }
    if (s == "triple-flat") {
        return MxmlAccidental.TripleFlat;
    }
    if (s == "flat-5") {
        return MxmlAccidental.Flat5;
    }
    if (s == "sharp") {
        return MxmlAccidental.Sharp;
    }
    if (s == "quarter-sharp") {
        return MxmlAccidental.QuarterSharp;
    }
    if (s == "slash-flat") {
        return MxmlAccidental.SlashFlat;
    }
    if (s == "flat-down") {
        return MxmlAccidental.FlatDown;
    }
    if (s == "natural-down") {
        return MxmlAccidental.NaturalDown;
    }
    if (s == "slash-quarter-sharp") {
        return MxmlAccidental.SlashQuarterSharp;
    }
    if (s == "sharp-sharp") {
        return MxmlAccidental.SharpSharp;
    }
    if (s == "sharp-1") {
        return MxmlAccidental.Sharp1;
    }
    if (s == "flat-up") {
        return MxmlAccidental.FlatUp;
    }
    if (s == "sharp-2") {
        return MxmlAccidental.Sharp2;
    }
    if (s == "sharp-3") {
        return MxmlAccidental.Sharp3;
    }
    if (s == "double-sharp") {
        return MxmlAccidental.DoubleSharp;
    }
    if (s == "sharp-4") {
        return MxmlAccidental.Sharp4;
    }
    if (s == "sharp-5") {
        return MxmlAccidental.Sharp5;
    }
    if (s == "sori") {
        return MxmlAccidental.Sori;
    }
    if (s == "double-slash-flat") {
        return MxmlAccidental.DoubleSlashFlat;
    }
    if (s == "sharp-down") {
        return MxmlAccidental.SharpDown;
    }
    if (s == "koron") {
        return MxmlAccidental.Koron;
    }
    if (s == "natural-up") {
        return MxmlAccidental.NaturalUp;
    }
    if (s == "slash-sharp") {
        return MxmlAccidental.SlashSharp;
    }
    if (s == "natural-sharp") {
        return MxmlAccidental.NaturalSharp;
    }
    if (s == "flat-flat") {
        return MxmlAccidental.FlatFlat;
    }
    if (s == "natural") {
        return MxmlAccidental.Natural;
    }
    if (s == "double-flat") {
        return MxmlAccidental.DoubleFlat;
    }
    return fallbackVal;
}
function xmlToAccidental(node) {
    var ret = {};
    var foundCautionary = false;
    var foundBracket = false;
    var foundSize = false;
    var foundParentheses = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundEditorial = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "cautionary") {
            var dataCautionary = xmlToYesNo(ch2);
            ret.cautionary = dataCautionary;
            foundCautionary = true;
        }
        if (ch2.name === "bracket") {
            var dataBracket = xmlToYesNo(ch2);
            ret.bracket = dataBracket;
            foundBracket = true;
        }
        if (ch2.name === "size") {
            var dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
            ret.size = dataSize;
            foundSize = true;
        }
        if (ch2.name === "parentheses") {
            var dataParentheses = xmlToYesNo(ch2);
            ret.parentheses = dataParentheses;
            foundParentheses = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "editorial") {
            var dataEditorial = xmlToYesNo(ch2);
            ret.editorial = dataEditorial;
            foundEditorial = true;
        }
    }
    var ch3 = node;
    var dataAccidental = getMxmlAccidental(ch3, null);
    ret.accidental = dataAccidental;
    if (!foundCautionary) {
        ret.cautionary = false;
    }
    if (!foundBracket) {
        ret.bracket = false;
    }
    if (!foundSize) {
        ret.size = SymbolSize.Unspecified;
    }
    if (!foundParentheses) {
        ret.parentheses = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundEditorial) {
        ret.editorial = false;
    }
    return ret;
}
function xmlToTimeModification(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "actual-notes") {
            var dataActualNotes = getNumber(ch, true);
            ret.actualNotes = dataActualNotes;
        }
        if (ch.nodeName === "normal-type") {
            var dataNormalType = getString(ch, true);
            ret.normalType = dataNormalType;
        }
        if (ch.nodeName === "normal-notes") {
            var dataNormalNotes = getNumber(ch, true);
            ret.normalNotes = dataNormalNotes;
        }
        if (ch.nodeName === "normal-dot") {
            var dataNormalDots = xmlToNormalDot(ch);
            ret.normalDots = (ret.normalDots || []).concat(dataNormalDots);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
(function (StemType) {
    StemType[StemType["None"] = 2] = "None";
    StemType[StemType["Double"] = 3] = "Double";
    StemType[StemType["Down"] = 0] = "Down";
    StemType[StemType["Up"] = 1] = "Up";
})(exports.StemType || (exports.StemType = {}));
var StemType = exports.StemType;
function getStemType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return StemType.None;
    }
    if (s == "double") {
        return StemType.Double;
    }
    if (s == "down") {
        return StemType.Down;
    }
    if (s == "up") {
        return StemType.Up;
    }
    return fallbackVal;
}
function xmlToStem(node) {
    var ret = {};
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataType = getStemType(ch3, null);
    ret.type = dataType;
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (NoteheadType) {
    NoteheadType[NoteheadType["InvertedTriangle"] = 7] = "InvertedTriangle";
    NoteheadType[NoteheadType["CircleDot"] = 14] = "CircleDot";
    NoteheadType[NoteheadType["ArrowUp"] = 9] = "ArrowUp";
    NoteheadType[NoteheadType["Do"] = 18] = "Do";
    NoteheadType[NoteheadType["Mi"] = 20] = "Mi";
    NoteheadType[NoteheadType["Cross"] = 4] = "Cross";
    NoteheadType[NoteheadType["Slash"] = 0] = "Slash";
    NoteheadType[NoteheadType["Fa"] = 21] = "Fa";
    NoteheadType[NoteheadType["Triangle"] = 1] = "Triangle";
    NoteheadType[NoteheadType["FaUp"] = 22] = "FaUp";
    NoteheadType[NoteheadType["So"] = 23] = "So";
    NoteheadType[NoteheadType["LeftTriangle"] = 15] = "LeftTriangle";
    NoteheadType[NoteheadType["BackSlashed"] = 11] = "BackSlashed";
    NoteheadType[NoteheadType["None"] = 17] = "None";
    NoteheadType[NoteheadType["La"] = 24] = "La";
    NoteheadType[NoteheadType["Slashed"] = 10] = "Slashed";
    NoteheadType[NoteheadType["Normal"] = 12] = "Normal";
    NoteheadType[NoteheadType["Cluster"] = 13] = "Cluster";
    NoteheadType[NoteheadType["Ti"] = 25] = "Ti";
    NoteheadType[NoteheadType["Re"] = 19] = "Re";
    NoteheadType[NoteheadType["Rectangle"] = 16] = "Rectangle";
    NoteheadType[NoteheadType["Square"] = 3] = "Square";
    NoteheadType[NoteheadType["ArrowDown"] = 8] = "ArrowDown";
    NoteheadType[NoteheadType["X"] = 5] = "X";
    NoteheadType[NoteheadType["Diamond"] = 2] = "Diamond";
    NoteheadType[NoteheadType["CircleX"] = 6] = "CircleX";
})(exports.NoteheadType || (exports.NoteheadType = {}));
var NoteheadType = exports.NoteheadType;
function getNoteheadType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "inverted triangle") {
        return NoteheadType.InvertedTriangle;
    }
    if (s == "circle dot") {
        return NoteheadType.CircleDot;
    }
    if (s == "arrow up") {
        return NoteheadType.ArrowUp;
    }
    if (s == "do") {
        return NoteheadType.Do;
    }
    if (s == "mi") {
        return NoteheadType.Mi;
    }
    if (s == "cross") {
        return NoteheadType.Cross;
    }
    if (s == "slash") {
        return NoteheadType.Slash;
    }
    if (s == "fa") {
        return NoteheadType.Fa;
    }
    if (s == "triangle") {
        return NoteheadType.Triangle;
    }
    if (s == "fa up") {
        return NoteheadType.FaUp;
    }
    if (s == "so") {
        return NoteheadType.So;
    }
    if (s == "left triangle") {
        return NoteheadType.LeftTriangle;
    }
    if (s == "back slashed") {
        return NoteheadType.BackSlashed;
    }
    if (s == "none") {
        return NoteheadType.None;
    }
    if (s == "la") {
        return NoteheadType.La;
    }
    if (s == "slashed") {
        return NoteheadType.Slashed;
    }
    if (s == "normal") {
        return NoteheadType.Normal;
    }
    if (s == "cluster") {
        return NoteheadType.Cluster;
    }
    if (s == "ti") {
        return NoteheadType.Ti;
    }
    if (s == "re") {
        return NoteheadType.Re;
    }
    if (s == "rectangle") {
        return NoteheadType.Rectangle;
    }
    if (s == "square") {
        return NoteheadType.Square;
    }
    if (s == "arrow down") {
        return NoteheadType.ArrowDown;
    }
    if (s == "x") {
        return NoteheadType.X;
    }
    if (s == "diamond") {
        return NoteheadType.Diamond;
    }
    if (s == "circle-x") {
        return NoteheadType.CircleX;
    }
    return fallbackVal;
}
function xmlToNotehead(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "filled") {
            var dataFilled = xmlToYesNo(ch2);
            ret.filled = dataFilled;
        }
        if (ch2.name === "parentheses") {
            var dataParentheses = xmlToYesNo(ch2);
            ret.parentheses = dataParentheses;
        }
    }
    var ch3 = node;
    var dataType = getNoteheadType(ch3, null);
    ret.type = dataType;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (BeamType) {
    BeamType[BeamType["BackwardHook"] = 4] = "BackwardHook";
    BeamType[BeamType["Begin"] = 0] = "Begin";
    BeamType[BeamType["ForwardHook"] = 3] = "ForwardHook";
    BeamType[BeamType["Continue"] = 1] = "Continue";
    BeamType[BeamType["End"] = 2] = "End";
})(exports.BeamType || (exports.BeamType = {}));
var BeamType = exports.BeamType;
function getBeamType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "backward hook") {
        return BeamType.BackwardHook;
    }
    if (s == "begin") {
        return BeamType.Begin;
    }
    if (s == "forward hook") {
        return BeamType.ForwardHook;
    }
    if (s == "continue") {
        return BeamType.Continue;
    }
    if (s == "end") {
        return BeamType.End;
    }
    return fallbackVal;
}
(function (AccelRitNone) {
    AccelRitNone[AccelRitNone["Accel"] = 0] = "Accel";
    AccelRitNone[AccelRitNone["None"] = 2] = "None";
    AccelRitNone[AccelRitNone["Rit"] = 1] = "Rit";
})(exports.AccelRitNone || (exports.AccelRitNone = {}));
var AccelRitNone = exports.AccelRitNone;
function getAccelRitNone(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "accel") {
        return AccelRitNone.Accel;
    }
    if (s == "none") {
        return AccelRitNone.None;
    }
    if (s == "rit") {
        return AccelRitNone.Rit;
    }
    return fallbackVal;
}
function xmlToBeam(node) {
    var ret = {};
    var foundRepeater = false;
    var foundNumber_ = false;
    var foundFan = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "repeater") {
            var dataRepeater = xmlToYesNo(ch2);
            ret.repeater = dataRepeater;
            foundRepeater = true;
        }
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "fan") {
            var dataFan = getAccelRitNone(ch2, AccelRitNone.None);
            ret.fan = dataFan;
            foundFan = true;
        }
    }
    var ch3 = node;
    var dataType = getBeamType(ch3, null);
    ret.type = dataType;
    if (!foundRepeater) {
        ret.repeater = false;
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundFan) {
        ret.fan = AccelRitNone.None;
    }
    return ret;
}
function xmlToNotations(node) {
    var ret = {};
    var foundPrintObject = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "slur") {
            var dataSlurs = xmlToSlur(ch);
            ret.slurs = (ret.slurs || []).concat(dataSlurs);
        }
        if (ch.nodeName === "articulations") {
            var dataArticulations = xmlToArticulations(ch);
            ret.articulations = (ret.articulations || []).concat(dataArticulations);
        }
        if (ch.nodeName === "slide") {
            var dataSlides = xmlToSlide(ch);
            ret.slides = (ret.slides || []).concat(dataSlides);
        }
        if (ch.nodeName === "technical") {
            var dataTechnicals = xmlToTechnical(ch);
            ret.technicals = (ret.technicals || []).concat(dataTechnicals);
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "tied") {
            var dataTieds = xmlToTied(ch);
            ret.tieds = (ret.tieds || []).concat(dataTieds);
        }
        if (ch.nodeName === "tuplet") {
            var dataTuplets = xmlToTuplet(ch);
            ret.tuplets = (ret.tuplets || []).concat(dataTuplets);
        }
        if (ch.nodeName === "glissando") {
            var dataGlissandos = xmlToGlissando(ch);
            ret.glissandos = (ret.glissandos || []).concat(dataGlissandos);
        }
        if (ch.nodeName === "dynamics") {
            var dataDynamics = xmlToDynamics(ch);
            ret.dynamics = (ret.dynamics || []).concat(dataDynamics);
        }
        if (ch.nodeName === "fermata") {
            var dataFermatas = xmlToFermata(ch);
            ret.fermatas = (ret.fermatas || []).concat(dataFermatas);
        }
        if (ch.nodeName === "accidental-mark") {
            var dataAccidentalMarks = xmlToAccidentalMark(ch);
            ret.accidentalMarks = (ret.accidentalMarks || []).concat(dataAccidentalMarks);
        }
        if (ch.nodeName === "ornaments") {
            var dataOrnaments = xmlToOrnaments(ch);
            ret.ornaments = (ret.ornaments || []).concat(dataOrnaments);
        }
        if (ch.nodeName === "arpeggiate") {
            var dataArpeggiates = xmlToArpeggiate(ch);
            ret.arpeggiates = (ret.arpeggiates || []).concat(dataArpeggiates);
        }
        if (ch.nodeName === "non-arpeggiate") {
            var dataNonArpeggiates = xmlToNonArpeggiate(ch);
            ret.nonArpeggiates = (ret.nonArpeggiates || []).concat(dataNonArpeggiates);
        }
        if (ch.nodeName === "other-notation") {
            var dataOtherNotations = xmlToOtherNotation(ch);
            ret.otherNotations = (ret.otherNotations || []).concat(dataOtherNotations);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    return ret;
}
function xmlToTied(node) {
    var ret = {};
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundPlacement = false;
    var foundOrientation = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "orientation") {
            var dataOrientation = getOverUnder(ch2, OverUnder.Unspecified);
            ret.orientation = dataOrientation;
            foundOrientation = true;
        }
        if (ch2.name === "bezier-x2") {
            var dataBezierX2 = getNumber(ch2, true);
            ret.bezierX2 = dataBezierX2;
        }
        if (ch2.name === "bezier-offset") {
            var dataBezierOffset = getNumber(ch2, true);
            ret.bezierOffset = dataBezierOffset;
        }
        if (ch2.name === "bezier-offset2") {
            var dataBezierOffset2 = getNumber(ch2, true);
            ret.bezierOffset2 = dataBezierOffset2;
        }
        if (ch2.name === "bezier-x") {
            var dataBezierX = getNumber(ch2, true);
            ret.bezierX = dataBezierX;
        }
        if (ch2.name === "bezier-y") {
            var dataBezierY = getNumber(ch2, true);
            ret.bezierY = dataBezierY;
        }
        if (ch2.name === "bezier-y2") {
            var dataBezierY2 = getNumber(ch2, true);
            ret.bezierY2 = dataBezierY2;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopContinue(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundOrientation) {
        ret.orientation = OverUnder.Unspecified;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToSlur(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundPlacement = false;
    var foundOrientation = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "orientation") {
            var dataOrientation = getOverUnder(ch2, OverUnder.Unspecified);
            ret.orientation = dataOrientation;
            foundOrientation = true;
        }
        if (ch2.name === "bezier-x2") {
            var dataBezierX2 = getNumber(ch2, true);
            ret.bezierX2 = dataBezierX2;
        }
        if (ch2.name === "bezier-offset") {
            var dataBezierOffset = getNumber(ch2, true);
            ret.bezierOffset = dataBezierOffset;
        }
        if (ch2.name === "bezier-offset2") {
            var dataBezierOffset2 = getNumber(ch2, true);
            ret.bezierOffset2 = dataBezierOffset2;
        }
        if (ch2.name === "bezier-x") {
            var dataBezierX = getNumber(ch2, true);
            ret.bezierX = dataBezierX;
        }
        if (ch2.name === "bezier-y") {
            var dataBezierY = getNumber(ch2, true);
            ret.bezierY = dataBezierY;
        }
        if (ch2.name === "bezier-y2") {
            var dataBezierY2 = getNumber(ch2, true);
            ret.bezierY2 = dataBezierY2;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopContinue(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundOrientation) {
        ret.orientation = OverUnder.Unspecified;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (ActualBothNone) {
    ActualBothNone[ActualBothNone["None"] = 2] = "None";
    ActualBothNone[ActualBothNone["Both"] = 1] = "Both";
    ActualBothNone[ActualBothNone["Actual"] = 0] = "Actual";
})(exports.ActualBothNone || (exports.ActualBothNone = {}));
var ActualBothNone = exports.ActualBothNone;
function getActualBothNone(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return ActualBothNone.None;
    }
    if (s == "both") {
        return ActualBothNone.Both;
    }
    if (s == "actual") {
        return ActualBothNone.Actual;
    }
    return fallbackVal;
}
function xmlToTuplet(node) {
    var ret = {};
    var foundBracket = false;
    var foundShowNumber = false;
    var foundLineShape = false;
    var foundPlacement = false;
    var foundShowType = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "tuplet-normal") {
            var dataTupletNormal = xmlToTupletNormal(ch);
            ret.tupletNormal = dataTupletNormal;
        }
        if (ch.nodeName === "tuplet-actual") {
            var dataTupletActual = xmlToTupletActual(ch);
            ret.tupletActual = dataTupletActual;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "bracket") {
            var dataBracket = xmlToYesNo(ch2);
            ret.bracket = dataBracket;
            foundBracket = true;
        }
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "show-number") {
            var dataShowNumber = getActualBothNone(ch2, ActualBothNone.Actual);
            ret.showNumber = dataShowNumber;
            foundShowNumber = true;
        }
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
        if (ch2.name === "show-type") {
            var dataShowType = getActualBothNone(ch2, ActualBothNone.None);
            ret.showType = dataShowType;
            foundShowType = true;
        }
    }
    if (!foundBracket) {
        ret.bracket = false;
    }
    if (!foundShowNumber) {
        ret.showNumber = ActualBothNone.Actual;
    }
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundShowType) {
        ret.showType = ActualBothNone.None;
    }
    return ret;
}
function xmlToTupletActual(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "tuplet-number") {
            var dataTupletNumber = xmlToTupletNumber(ch);
            ret.tupletNumber = dataTupletNumber;
        }
        if (ch.nodeName === "tuplet-dot") {
            var dataTupletDots = xmlToTupletDot(ch);
            ret.tupletDots = (ret.tupletDots || []).concat(dataTupletDots);
        }
        if (ch.nodeName === "tuplet-type") {
            var dataTupletType = xmlToTupletType(ch);
            ret.tupletType = dataTupletType;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToTupletNormal(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "tuplet-number") {
            var dataTupletNumber = xmlToTupletNumber(ch);
            ret.tupletNumber = dataTupletNumber;
        }
        if (ch.nodeName === "tuplet-dot") {
            var dataTupletDots = xmlToTupletDot(ch);
            ret.tupletDots = (ret.tupletDots || []).concat(dataTupletDots);
        }
        if (ch.nodeName === "tuplet-type") {
            var dataTupletType = xmlToTupletType(ch);
            ret.tupletType = dataTupletType;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToTupletNumber(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToTupletType(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToTupletDot(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToGlissando(node) {
    var ret = {};
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundNormal = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
        if (ch2.name === "normal") {
            var dataNormal = getNumber(ch2, true);
            ret.normal = dataNormal;
            foundNormal = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, false);
    ret.text = dataText;
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundNormal) {
        ret.normal = 1;
    }
    return ret;
}
function xmlToSlide(node) {
    var ret = {};
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundFirstBeat = false;
    var foundNormal = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "first-beat") {
            var dataFirstBeat = getNumber(ch2, true);
            ret.firstBeat = dataFirstBeat;
            foundFirstBeat = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
        if (ch2.name === "normal") {
            var dataNormal = getNumber(ch2, true);
            ret.normal = dataNormal;
            foundNormal = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, false);
    ret.text = dataText;
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundFirstBeat) {
        ret.firstBeat = 25;
    }
    if (!foundNormal) {
        ret.normal = 1;
    }
    return ret;
}
function xmlToOtherNotation(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopSingle(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToOtherDirection(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToOrnaments(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "delayed-inverted-turn") {
            var dataDelayedInvertedTurn = xmlToDelayedInvertedTurn(ch);
            ret.delayedInvertedTurn = dataDelayedInvertedTurn;
        }
        if (ch.nodeName === "shake") {
            var dataShake = xmlToShake(ch);
            ret.shake = dataShake;
        }
        if (ch.nodeName === "turn") {
            var dataTurn = xmlToTurn(ch);
            ret.turn = dataTurn;
        }
        if (ch.nodeName === "inverted-turn") {
            var dataInvertedTurn = xmlToInvertedTurn(ch);
            ret.invertedTurn = dataInvertedTurn;
        }
        if (ch.nodeName === "other-ornament") {
            var dataOtherOrnament = xmlToOtherOrnament(ch);
            ret.otherOrnament = dataOtherOrnament;
        }
        if (ch.nodeName === "delayed-turn") {
            var dataDelayedTurn = xmlToDelayedTurn(ch);
            ret.delayedTurn = dataDelayedTurn;
        }
        if (ch.nodeName === "vertical-turn") {
            var dataVerticalTurn = xmlToVerticalTurn(ch);
            ret.verticalTurn = dataVerticalTurn;
        }
        if (ch.nodeName === "wavy-line") {
            var dataWavyLine = xmlToWavyLine(ch);
            ret.wavyLine = dataWavyLine;
        }
        if (ch.nodeName === "tremolo") {
            var dataTremolo = xmlToTremolo(ch);
            ret.tremolo = dataTremolo;
        }
        if (ch.nodeName === "accidental-mark") {
            var dataAccidentalMarks = xmlToAccidentalMark(ch);
            ret.accidentalMarks = (ret.accidentalMarks || []).concat(dataAccidentalMarks);
        }
        if (ch.nodeName === "trill-mark") {
            var dataTrillMark = xmlToTrillMark(ch);
            ret.trillMark = dataTrillMark;
        }
        if (ch.nodeName === "mordent") {
            var dataMordent = xmlToMordent(ch);
            ret.mordent = dataMordent;
        }
        if (ch.nodeName === "inverted-mordent") {
            var dataInvertedMordent = xmlToInvertedMordent(ch);
            ret.invertedMordent = dataInvertedMordent;
        }
        if (ch.nodeName === "schleifer") {
            var dataSchleifer = xmlToSchleifer(ch);
            ret.schleifer = dataSchleifer;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToTrillMark(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToTurn(node) {
    var ret = {};
    var foundSlash = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "slash") {
            var dataSlash = xmlToYesNo(ch2);
            ret.slash = dataSlash;
            foundSlash = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundSlash) {
        ret.slash = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToDelayedTurn(node) {
    var ret = {};
    var foundSlash = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "slash") {
            var dataSlash = xmlToYesNo(ch2);
            ret.slash = dataSlash;
            foundSlash = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundSlash) {
        ret.slash = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToInvertedTurn(node) {
    var ret = {};
    var foundSlash = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "slash") {
            var dataSlash = xmlToYesNo(ch2);
            ret.slash = dataSlash;
            foundSlash = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundSlash) {
        ret.slash = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToDelayedInvertedTurn(node) {
    var ret = {};
    var foundSlash = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "slash") {
            var dataSlash = xmlToYesNo(ch2);
            ret.slash = dataSlash;
            foundSlash = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundSlash) {
        ret.slash = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToVerticalTurn(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToShake(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToMordent(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "long") {
            var dataLong = xmlToYesNo(ch2);
            ret.long = dataLong;
        }
        if (ch2.name === "approach") {
            var dataApproach = getAboveBelow(ch2, null);
            ret.approach = dataApproach;
        }
        if (ch2.name === "departure") {
            var dataDeparture = getAboveBelow(ch2, null);
            ret.departure = dataDeparture;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToInvertedMordent(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundStartNote = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundTrillStep = false;
    var foundTwoNoteTurn = false;
    var foundSecondBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "long") {
            var dataLong = xmlToYesNo(ch2);
            ret.long = dataLong;
        }
        if (ch2.name === "approach") {
            var dataApproach = getAboveBelow(ch2, null);
            ret.approach = dataApproach;
        }
        if (ch2.name === "departure") {
            var dataDeparture = getAboveBelow(ch2, null);
            ret.departure = dataDeparture;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "start-note") {
            var dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
            ret.startNote = dataStartNote;
            foundStartNote = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "trill-step") {
            var dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
            ret.trillStep = dataTrillStep;
            foundTrillStep = true;
        }
        if (ch2.name === "two-note-turn") {
            var dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
            ret.twoNoteTurn = dataTwoNoteTurn;
            foundTwoNoteTurn = true;
        }
        if (ch2.name === "second-beat") {
            var dataSecondBeat = getNumber(ch2, true);
            ret.secondBeat = dataSecondBeat;
            foundSecondBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundStartNote) {
        ret.startNote = UpperMainBelow.Upper;
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundTrillStep) {
        ret.trillStep = WholeHalfUnison.Whole;
    }
    if (!foundTwoNoteTurn) {
        ret.twoNoteTurn = WholeHalfNone.None;
    }
    if (!foundSecondBeat) {
        ret.secondBeat = 25;
    }
    return ret;
}
function xmlToSchleifer(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToTremolo(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundType = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopSingle(ch2, StartStopSingle.Single);
            ret.type = dataType;
            foundType = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundType) {
        ret.type = StartStopSingle.Single;
    }
    return ret;
}
function xmlToOtherOrnament(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopSingle(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToAccidentalMark(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataMark = getString(ch3, true);
    ret.mark = dataMark;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToTechnical(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "triple-tongue") {
            var dataTripleTongue = xmlToTripleTongue(ch);
            ret.tripleTongue = dataTripleTongue;
        }
        if (ch.nodeName === "toe") {
            var dataToe = xmlToToe(ch);
            ret.toe = dataToe;
        }
        if (ch.nodeName === "hole") {
            var dataHole = xmlToHole(ch);
            ret.hole = dataHole;
        }
        if (ch.nodeName === "hammer-on") {
            var dataHammerOn = xmlToHammerOn(ch);
            ret.hammerOn = dataHammerOn;
        }
        if (ch.nodeName === "up-bow") {
            var dataUpBow = xmlToUpBow(ch);
            ret.upBow = dataUpBow;
        }
        if (ch.nodeName === "down-bow") {
            var dataDownBow = xmlToDownBow(ch);
            ret.downBow = dataDownBow;
        }
        if (ch.nodeName === "fret") {
            var dataFret = xmlToFret(ch);
            ret.fret = dataFret;
        }
        if (ch.nodeName === "tap") {
            var dataTap = xmlToTap(ch);
            ret.tap = dataTap;
        }
        if (ch.nodeName === "pull-off") {
            var dataPullOff = xmlToPullOff(ch);
            ret.pullOff = dataPullOff;
        }
        if (ch.nodeName === "handbell") {
            var dataHandbell = xmlToHandbell(ch);
            ret.handbell = dataHandbell;
        }
        if (ch.nodeName === "bend") {
            var dataBend = xmlToBend(ch);
            ret.bend = dataBend;
        }
        if (ch.nodeName === "thumb-position") {
            var dataThumbPosition = xmlToThumbPosition(ch);
            ret.thumbPosition = dataThumbPosition;
        }
        if (ch.nodeName === "stopped") {
            var dataStopped = xmlToStopped(ch);
            ret.stopped = dataStopped;
        }
        if (ch.nodeName === "pluck") {
            var dataPluck = xmlToPluck(ch);
            ret.pluck = dataPluck;
        }
        if (ch.nodeName === "double-tongue") {
            var dataDoubleTongue = xmlToDoubleTongue(ch);
            ret.doubleTongue = dataDoubleTongue;
        }
        if (ch.nodeName === "string") {
            var dataString = xmlToString(ch);
            ret.string = dataString;
        }
        if (ch.nodeName === "open-string") {
            var dataOpenString = xmlToOpenString(ch);
            ret.openString = dataOpenString;
        }
        if (ch.nodeName === "fingernails") {
            var dataFingernails = xmlToFingernails(ch);
            ret.fingernails = dataFingernails;
        }
        if (ch.nodeName === "arrow") {
            var dataArrow = xmlToArrow(ch);
            ret.arrow = dataArrow;
        }
        if (ch.nodeName === "harmonic") {
            var dataHarmonic = xmlToHarmonic(ch);
            ret.harmonic = dataHarmonic;
        }
        if (ch.nodeName === "heel") {
            var dataHeel = xmlToHeel(ch);
            ret.heel = dataHeel;
        }
        if (ch.nodeName === "other-technical") {
            var dataOtherTechnical = xmlToOtherTechnical(ch);
            ret.otherTechnical = dataOtherTechnical;
        }
        if (ch.nodeName === "snap-pizzicato") {
            var dataSnapPizzicato = xmlToSnapPizzicato(ch);
            ret.snapPizzicato = dataSnapPizzicato;
        }
        if (ch.nodeName === "fingering") {
            var dataFingering = xmlToFingering(ch);
            ret.fingering = dataFingering;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToUpBow(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToDownBow(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToHarmonic(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "artificial") {
            var dataArtificial = true;
            ret.artificial = dataArtificial;
        }
        if (ch.nodeName === "touching-pitch") {
            var dataTouchingPitch = true;
            ret.touchingPitch = dataTouchingPitch;
        }
        if (ch.nodeName === "sounding-pitch") {
            var dataSoundingPitch = true;
            ret.soundingPitch = dataSoundingPitch;
        }
        if (ch.nodeName === "natural") {
            var dataNatural = true;
            ret.natural = dataNatural;
        }
        if (ch.nodeName === "base-pitch") {
            var dataBasePitch = true;
            ret.basePitch = dataBasePitch;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToOpenString(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToThumbPosition(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToPluck(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToDoubleTongue(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToTripleTongue(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToStopped(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToSnapPizzicato(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToHammerOn(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToPullOff(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToBend(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundAccelerate = false;
    var foundBeats = false;
    var foundLastBeat = false;
    var foundFirstBeat = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "bend-alter") {
            var dataBendAlter = getString(ch, true);
            ret.bendAlter = dataBendAlter;
        }
        if (ch.nodeName === "with-bar") {
            var dataWithBar = xmlToWithBar(ch);
            ret.withBar = dataWithBar;
        }
        if (ch.nodeName === "pre-bend") {
            var dataPreBend = true;
            ret.preBend = dataPreBend;
        }
        if (ch.nodeName === "release") {
            var dataRelease = true;
            ret.release = dataRelease;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "accelerate") {
            var dataAccelerate = xmlToYesNo(ch2);
            ret.accelerate = dataAccelerate;
            foundAccelerate = true;
        }
        if (ch2.name === "beats") {
            var dataBeats = getNumber(ch2, true);
            ret.beats = dataBeats;
            foundBeats = true;
        }
        if (ch2.name === "last-beat") {
            var dataLastBeat = getNumber(ch2, true);
            ret.lastBeat = dataLastBeat;
            foundLastBeat = true;
        }
        if (ch2.name === "first-beat") {
            var dataFirstBeat = getNumber(ch2, true);
            ret.firstBeat = dataFirstBeat;
            foundFirstBeat = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundAccelerate) {
        ret.accelerate = false;
    }
    if (!foundBeats) {
        ret.beats = 4;
    }
    if (!foundLastBeat) {
        ret.lastBeat = 75;
    }
    if (!foundFirstBeat) {
        ret.firstBeat = 25;
    }
    return ret;
}
function xmlToWithBar(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToTap(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToHeel(node) {
    var ret = {};
    var foundSubstitution = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "substitution") {
            var dataSubstitution = xmlToYesNo(ch2);
            ret.substitution = dataSubstitution;
            foundSubstitution = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundSubstitution) {
        ret.substitution = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToToe(node) {
    var ret = {};
    var foundSubstitution = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "substitution") {
            var dataSubstitution = xmlToYesNo(ch2);
            ret.substitution = dataSubstitution;
            foundSubstitution = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundSubstitution) {
        ret.substitution = false;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToFingernails(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToHole(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "hole-closed") {
            var dataHoleClosed = xmlToHoleClosed(ch);
            ret.holeClosed = dataHoleClosed;
        }
        if (ch.nodeName === "hole-shape") {
            var dataHoleShape = getString(ch, true);
            ret.holeShape = dataHoleShape;
        }
        if (ch.nodeName === "hole-type") {
            var dataHoleType = getString(ch, true);
            ret.holeType = dataHoleType;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
(function (HoleLocation) {
    HoleLocation[HoleLocation["Right"] = 0] = "Right";
    HoleLocation[HoleLocation["Top"] = 3] = "Top";
    HoleLocation[HoleLocation["Bottom"] = 1] = "Bottom";
    HoleLocation[HoleLocation["Left"] = 2] = "Left";
})(exports.HoleLocation || (exports.HoleLocation = {}));
var HoleLocation = exports.HoleLocation;
function getHoleLocation(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "right") {
        return HoleLocation.Right;
    }
    if (s == "top") {
        return HoleLocation.Top;
    }
    if (s == "bottom") {
        return HoleLocation.Bottom;
    }
    if (s == "left") {
        return HoleLocation.Left;
    }
    return fallbackVal;
}
(function (HoleClosedType) {
    HoleClosedType[HoleClosedType["No"] = 1] = "No";
    HoleClosedType[HoleClosedType["Yes"] = 0] = "Yes";
    HoleClosedType[HoleClosedType["Half"] = 2] = "Half";
})(exports.HoleClosedType || (exports.HoleClosedType = {}));
var HoleClosedType = exports.HoleClosedType;
function getHoleClosedType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "no") {
        return HoleClosedType.No;
    }
    if (s == "yes") {
        return HoleClosedType.Yes;
    }
    if (s == "half") {
        return HoleClosedType.Half;
    }
    return fallbackVal;
}
function xmlToHoleClosed(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "location") {
            var dataLocation = getHoleLocation(ch2, null);
            ret.location = dataLocation;
        }
    }
    var ch3 = node;
    var dataData = getHoleClosedType(ch3, null);
    ret.data = dataData;
    return ret;
}
function xmlToArrow(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "arrow-style") {
            var dataArrowStyle = getString(ch, true);
            ret.arrowStyle = dataArrowStyle;
        }
        if (ch.nodeName === "arrow-direction") {
            var dataArrowDirection = getString(ch, true);
            ret.arrowDirection = dataArrowDirection;
        }
        if (ch.nodeName === "circular-arrow") {
            var dataCircularArrow = getString(ch, true);
            ret.circularArrow = dataCircularArrow;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToHandbell(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToOtherTechnical(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToArticulations(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "accent") {
            var dataAccent = xmlToAccent(ch);
            ret.accent = dataAccent;
        }
        if (ch.nodeName === "doit") {
            var dataDoit = xmlToDoit(ch);
            ret.doit = dataDoit;
        }
        if (ch.nodeName === "breath-mark") {
            var dataBreathMark = xmlToBreathMark(ch);
            ret.breathMark = dataBreathMark;
        }
        if (ch.nodeName === "other-articulation") {
            var dataOtherArticulations = xmlToOtherArticulation(ch);
            ret.otherArticulations = (ret.otherArticulations || []).concat(dataOtherArticulations);
        }
        if (ch.nodeName === "detached-legato") {
            var dataDetachedLegato = xmlToDetachedLegato(ch);
            ret.detachedLegato = dataDetachedLegato;
        }
        if (ch.nodeName === "staccatissimo") {
            var dataStaccatissimo = xmlToStaccatissimo(ch);
            ret.staccatissimo = dataStaccatissimo;
        }
        if (ch.nodeName === "plop") {
            var dataPlop = xmlToPlop(ch);
            ret.plop = dataPlop;
        }
        if (ch.nodeName === "unstress") {
            var dataUnstress = xmlToUnstress(ch);
            ret.unstress = dataUnstress;
        }
        if (ch.nodeName === "strong-accent") {
            var dataStrongAccent = xmlToStrongAccent(ch);
            ret.strongAccent = dataStrongAccent;
        }
        if (ch.nodeName === "staccato") {
            var dataStaccato = xmlToStaccato(ch);
            ret.staccato = dataStaccato;
        }
        if (ch.nodeName === "spiccato") {
            var dataSpiccato = xmlToSpiccato(ch);
            ret.spiccato = dataSpiccato;
        }
        if (ch.nodeName === "scoop") {
            var dataScoop = xmlToScoop(ch);
            ret.scoop = dataScoop;
        }
        if (ch.nodeName === "falloff") {
            var dataFalloff = xmlToFalloff(ch);
            ret.falloff = dataFalloff;
        }
        if (ch.nodeName === "caesura") {
            var dataCaesura = xmlToCaesura(ch);
            ret.caesura = dataCaesura;
        }
        if (ch.nodeName === "stress") {
            var dataStress = xmlToStress(ch);
            ret.stress = dataStress;
        }
        if (ch.nodeName === "tenuto") {
            var dataTenuto = xmlToTenuto(ch);
            ret.tenuto = dataTenuto;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToAccent(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToStrongAccent(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    var foundType = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataType = getUpDown(ch2, UpDown.Up);
            ret.type = dataType;
            foundType = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundType) {
        ret.type = UpDown.Up;
    }
    return ret;
}
function xmlToStaccato(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToTenuto(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToDetachedLegato(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToStaccatissimo(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToSpiccato(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToScoop(node) {
    var ret = {};
    var foundLineShape = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToPlop(node) {
    var ret = {};
    var foundLineShape = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToDoit(node) {
    var ret = {};
    var foundLineShape = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToFalloff(node) {
    var ret = {};
    var foundLineShape = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
(function (BreathMarkType) {
    BreathMarkType[BreathMarkType["Empty"] = 2] = "Empty";
    BreathMarkType[BreathMarkType["Comma"] = 0] = "Comma";
    BreathMarkType[BreathMarkType["Tick"] = 1] = "Tick";
})(exports.BreathMarkType || (exports.BreathMarkType = {}));
var BreathMarkType = exports.BreathMarkType;
function getBreathMarkType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "") {
        return BreathMarkType.Empty;
    }
    if (s == "comma") {
        return BreathMarkType.Comma;
    }
    if (s == "tick") {
        return BreathMarkType.Tick;
    }
    return fallbackVal;
}
function xmlToBreathMark(node) {
    var ret = {};
    var foundLineShape = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line-shape") {
            var dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
            ret.lineShape = dataLineShape;
            foundLineShape = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataType = getBreathMarkType(ch3, null);
    ret.type = dataType;
    if (!foundLineShape) {
        ret.lineShape = StraightCurved.Straight;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToCaesura(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToStress(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToUnstress(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToOtherArticulation(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    return ret;
}
function xmlToArpeggiate(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundPlacement = false;
    var foundColor = false;
    var foundDirection = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "direction") {
            var dataDirection = getUpDown(ch2, UpDown.Up);
            ret.direction = dataDirection;
            foundDirection = true;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundDirection) {
        ret.direction = UpDown.Up;
    }
    return ret;
}
function xmlToNonArpeggiate(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundPlacement = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getTopBottom(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToLaughing(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "Laughing";
    return ret;
}
function xmlToHumming(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "Humming";
    return ret;
}
function xmlToEndLine(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "EndLine";
    return ret;
}
function xmlToEndParagraph(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "EndParagraph";
    return ret;
}
function xmlToLyricParts(node) {
    var rarr = [];
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "extend") {
            var data = xmlToExtend(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "end-line") {
            var data = xmlToEndLine(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "syllabic") {
            var data = xmlToSyllabic(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "text") {
            var data = xmlToText(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "laughing") {
            var data = xmlToLaughing(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "humming") {
            var data = xmlToHumming(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "end-paragraph") {
            var data = xmlToEndParagraph(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "elision") {
            var data = xmlToElision(ch);
            rarr = (rarr || []).concat(data);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return rarr;
}
function xmlToText(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundDir = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    ret._class = "Text";
    return ret;
}
(function (SyllabicType) {
    SyllabicType[SyllabicType["Single"] = 0] = "Single";
    SyllabicType[SyllabicType["Begin"] = 1] = "Begin";
    SyllabicType[SyllabicType["Middle"] = 3] = "Middle";
    SyllabicType[SyllabicType["End"] = 2] = "End";
})(exports.SyllabicType || (exports.SyllabicType = {}));
var SyllabicType = exports.SyllabicType;
function getSyllabicType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "single") {
        return SyllabicType.Single;
    }
    if (s == "begin") {
        return SyllabicType.Begin;
    }
    if (s == "middle") {
        return SyllabicType.Middle;
    }
    if (s == "end") {
        return SyllabicType.End;
    }
    return fallbackVal;
}
function xmlToSyllabic(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getSyllabicType(ch3, null);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    ret._class = "Syllabic";
    return ret;
}
function xmlToElision(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    ret._class = "Elision";
    return ret;
}
function xmlToExtend(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundType = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopContinue(ch2, StartStopContinue.Start);
            ret.type = dataType;
            foundType = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundType) {
        ret.type = StartStopContinue.Start;
    }
    ret._class = "Extend";
    return ret;
}
function xmlToFiguredBass(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPrintObject = false;
    var foundPrintSpacing = false;
    var foundParentheses = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "figure") {
            var dataFigures = xmlToFigure(ch);
            ret.figures = (ret.figures || []).concat(dataFigures);
        }
        if (ch.nodeName === "duration") {
            var dataDuration = getNumber(ch, true);
            ret.duration = dataDuration;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-dot") {
            var dataPrintDot = xmlToYesNo(ch2);
            ret.printDot = dataPrintDot;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "print-spacing") {
            var dataPrintSpacing = xmlToYesNo(ch2);
            ret.printSpacing = dataPrintSpacing;
            foundPrintSpacing = true;
        }
        if (ch2.name === "print-lyric") {
            var dataPrintLyric = xmlToYesNo(ch2);
            ret.printLyric = dataPrintLyric;
        }
        if (ch2.name === "parentheses") {
            var dataParentheses = xmlToYesNo(ch2);
            ret.parentheses = dataParentheses;
            foundParentheses = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundPrintSpacing) {
        ret.printSpacing = true;
    }
    if (!foundParentheses) {
        ret.parentheses = false;
    }
    ret._class = "FiguredBass";
    return ret;
}
function xmlToFigure(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "prefix") {
            var dataPrefix = xmlToPrefix(ch);
            ret.prefix = dataPrefix;
        }
        if (ch.nodeName === "figure-number") {
            var dataFigureNumber = xmlToFigureNumber(ch);
            ret.figureNumber = dataFigureNumber;
        }
        if (ch.nodeName === "extend") {
            var dataExtend = xmlToExtend(ch);
            ret.extend = dataExtend;
        }
        if (ch.nodeName === "suffix") {
            var dataSuffix = xmlToSuffix(ch);
            ret.suffix = dataSuffix;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToPrefix(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToFigureNumber(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToSuffix(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToBackup(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "duration") {
            var dataDuration = getNumber(ch, true);
            ret.duration = dataDuration;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "Backup";
    return ret;
}
function xmlToForward(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "voice") {
            var dataVoice = getNumber(ch, true);
            ret.voice = dataVoice;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "duration") {
            var dataDuration = getNumber(ch, true);
            ret.duration = dataDuration;
        }
        if (ch.nodeName === "staff") {
            var dataStaff = getNumber(ch, true);
            ret.staff = dataStaff;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    ret._class = "Forward";
    return ret;
}
(function (BarlineLocation) {
    BarlineLocation[BarlineLocation["Right"] = 1] = "Right";
    BarlineLocation[BarlineLocation["Middle"] = 2] = "Middle";
    BarlineLocation[BarlineLocation["Left"] = 0] = "Left";
})(exports.BarlineLocation || (exports.BarlineLocation = {}));
var BarlineLocation = exports.BarlineLocation;
function getBarlineLocation(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "right") {
        return BarlineLocation.Right;
    }
    if (s == "middle") {
        return BarlineLocation.Middle;
    }
    if (s == "left") {
        return BarlineLocation.Left;
    }
    return fallbackVal;
}
function xmlToBarline(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "segno") {
            var dataSegno = xmlToSegno(ch);
            ret.segno = dataSegno;
        }
        if (ch.nodeName === "coda") {
            var dataCoda = xmlToCoda(ch);
            ret.coda = dataCoda;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "wavy-line") {
            var dataWavyLine = xmlToWavyLine(ch);
            ret.wavyLine = dataWavyLine;
        }
        if (ch.nodeName === "fermata") {
            var dataFermatas = xmlToFermata(ch);
            ret.fermatas = (ret.fermatas || []).concat(dataFermatas);
        }
        if (ch.nodeName === "bar-style") {
            var dataBarStyle = xmlToBarStyle(ch);
            ret.barStyle = dataBarStyle;
        }
        if (ch.nodeName === "ending") {
            var dataEnding = xmlToEnding(ch);
            ret.ending = dataEnding;
        }
        if (ch.nodeName === "repeat") {
            var dataRepeat = xmlToRepeat(ch);
            ret.repeat = dataRepeat;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "location") {
            var dataLocation = getBarlineLocation(ch2, null);
            ret.location = dataLocation;
        }
        if (ch2.name === "coda") {
            var dataCodaAttrib = getString(ch2, true);
            ret.codaAttrib = dataCodaAttrib;
        }
        if (ch2.name === "segno") {
            var dataSegnoAttrib = getString(ch2, true);
            ret.segnoAttrib = dataSegnoAttrib;
        }
        if (ch2.name === "divisions") {
            var dataDivisions = getNumber(ch2, true);
            ret.divisions = dataDivisions;
        }
    }
    ret._class = "Barline";
    return ret;
}
/**
 * Bar-style contains style information. Choices are
 * regular, dotted, dashed, heavy, light-light,
 * light-heavy, heavy-light, heavy-heavy, tick (a
 * short stroke through the top line), short (a partial
 * barline between the 2nd and 4th lines), and none.
 */
(function (BarStyleType) {
    BarStyleType[BarStyleType["Regular"] = 0] = "Regular";
    BarStyleType[BarStyleType["LightHeavy"] = 5] = "LightHeavy";
    BarStyleType[BarStyleType["HeavyLight"] = 6] = "HeavyLight";
    BarStyleType[BarStyleType["Short"] = 9] = "Short";
    BarStyleType[BarStyleType["None"] = 10] = "None";
    BarStyleType[BarStyleType["Dashed"] = 2] = "Dashed";
    BarStyleType[BarStyleType["HeavyHeavy"] = 7] = "HeavyHeavy";
    BarStyleType[BarStyleType["Tick"] = 8] = "Tick";
    BarStyleType[BarStyleType["Dotted"] = 1] = "Dotted";
    BarStyleType[BarStyleType["Heavy"] = 3] = "Heavy";
    BarStyleType[BarStyleType["LightLight"] = 4] = "LightLight";
})(exports.BarStyleType || (exports.BarStyleType = {}));
var BarStyleType = exports.BarStyleType;
function getBarStyleType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "regular") {
        return BarStyleType.Regular;
    }
    if (s == "light-heavy") {
        return BarStyleType.LightHeavy;
    }
    if (s == "heavy-light") {
        return BarStyleType.HeavyLight;
    }
    if (s == "short") {
        return BarStyleType.Short;
    }
    if (s == "none") {
        return BarStyleType.None;
    }
    if (s == "dashed") {
        return BarStyleType.Dashed;
    }
    if (s == "heavy-heavy") {
        return BarStyleType.HeavyHeavy;
    }
    if (s == "tick") {
        return BarStyleType.Tick;
    }
    if (s == "dotted") {
        return BarStyleType.Dotted;
    }
    if (s == "heavy") {
        return BarStyleType.Heavy;
    }
    if (s == "light-light") {
        return BarStyleType.LightLight;
    }
    return fallbackVal;
}
function xmlToBarStyle(node) {
    var ret = {};
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getBarStyleType(ch3, null);
    ret.data = dataData;
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (StartStopDiscontinue) {
    StartStopDiscontinue[StartStopDiscontinue["Discontinue"] = 2] = "Discontinue";
    StartStopDiscontinue[StartStopDiscontinue["Start"] = 0] = "Start";
    StartStopDiscontinue[StartStopDiscontinue["Stop"] = 1] = "Stop";
})(exports.StartStopDiscontinue || (exports.StartStopDiscontinue = {}));
var StartStopDiscontinue = exports.StartStopDiscontinue;
function getStartStopDiscontinue(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "discontinue") {
        return StartStopDiscontinue.Discontinue;
    }
    if (s == "start") {
        return StartStopDiscontinue.Start;
    }
    if (s == "stop") {
        return StartStopDiscontinue.Stop;
    }
    return fallbackVal;
}
function xmlToEnding(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "end-length") {
            var dataEndLength = getNumber(ch2, true);
            ret.endLength = dataEndLength;
        }
        if (ch2.name === "text-x") {
            var dataTextX = getNumber(ch2, true);
            ret.textX = dataTextX;
        }
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "text-y") {
            var dataTextY = getNumber(ch2, true);
            ret.textY = dataTextY;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopDiscontinue(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataEnding = getString(ch3, false);
    ret.ending = dataEnding;
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (WingedType) {
    WingedType[WingedType["None"] = 0] = "None";
    WingedType[WingedType["Curved"] = 2] = "Curved";
    WingedType[WingedType["DoubleCurved"] = 4] = "DoubleCurved";
    WingedType[WingedType["Straight"] = 1] = "Straight";
    WingedType[WingedType["DoubleStraight"] = 3] = "DoubleStraight";
})(exports.WingedType || (exports.WingedType = {}));
var WingedType = exports.WingedType;
function getWingedType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return WingedType.None;
    }
    if (s == "curved") {
        return WingedType.Curved;
    }
    if (s == "double-curved") {
        return WingedType.DoubleCurved;
    }
    if (s == "straight") {
        return WingedType.Straight;
    }
    if (s == "double-straight") {
        return WingedType.DoubleStraight;
    }
    return fallbackVal;
}
(function (DirectionTypeBg) {
    DirectionTypeBg[DirectionTypeBg["Forward"] = 1] = "Forward";
    DirectionTypeBg[DirectionTypeBg["Backward"] = 0] = "Backward";
})(exports.DirectionTypeBg || (exports.DirectionTypeBg = {}));
var DirectionTypeBg = exports.DirectionTypeBg;
function getDirectionTypeBg(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "forward") {
        return DirectionTypeBg.Forward;
    }
    if (s == "backward") {
        return DirectionTypeBg.Backward;
    }
    return fallbackVal;
}
function xmlToRepeat(node) {
    var ret = {};
    var foundWinged = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "times") {
            var dataTimes = getString(ch2, true);
            ret.times = dataTimes;
        }
        if (ch2.name === "winged") {
            var dataWinged = getWingedType(ch2, WingedType.None);
            ret.winged = dataWinged;
            foundWinged = true;
        }
        if (ch2.name === "direction") {
            var dataDirection = getDirectionTypeBg(ch2, null);
            ret.direction = dataDirection;
        }
    }
    if (!foundWinged) {
        ret.winged = WingedType.None;
    }
    return ret;
}
/**
 * The tip-direction entity represents the direction in which
 * the tip of a stick or beater points, using Unicode arrow
 * terminology.
 */
(function (TipDirection) {
    TipDirection[TipDirection["Right"] = 3] = "Right";
    TipDirection[TipDirection["Northwest"] = 4] = "Northwest";
    TipDirection[TipDirection["Southwest"] = 7] = "Southwest";
    TipDirection[TipDirection["Down"] = 1] = "Down";
    TipDirection[TipDirection["Northeast"] = 5] = "Northeast";
    TipDirection[TipDirection["Southeast"] = 6] = "Southeast";
    TipDirection[TipDirection["Up"] = 0] = "Up";
    TipDirection[TipDirection["Left"] = 2] = "Left";
})(exports.TipDirection || (exports.TipDirection = {}));
var TipDirection = exports.TipDirection;
function getTipDirection(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "right") {
        return TipDirection.Right;
    }
    if (s == "northwest") {
        return TipDirection.Northwest;
    }
    if (s == "southwest") {
        return TipDirection.Southwest;
    }
    if (s == "down") {
        return TipDirection.Down;
    }
    if (s == "northeast") {
        return TipDirection.Northeast;
    }
    if (s == "southeast") {
        return TipDirection.Southeast;
    }
    if (s == "up") {
        return TipDirection.Up;
    }
    if (s == "left") {
        return TipDirection.Left;
    }
    return fallbackVal;
}
function xmlToDirection(node) {
    var ret = {};
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "voice") {
            var dataVoice = getNumber(ch, true);
            ret.voice = dataVoice;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "direction-type") {
            var dataDirectionTypes = xmlToDirectionType(ch);
            ret.directionTypes = (ret.directionTypes || []).concat(dataDirectionTypes);
        }
        if (ch.nodeName === "staff") {
            var dataStaff = getNumber(ch, true);
            ret.staff = dataStaff;
        }
        if (ch.nodeName === "offset") {
            var dataOffset = xmlToOffset(ch);
            ret.offset = dataOffset;
        }
        if (ch.nodeName === "sound") {
            var dataSound = xmlToSound(ch);
            ret.sound = dataSound;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "directive") {
            var dataDirective = xmlToYesNo(ch2);
            ret.directive = dataDirective;
        }
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    ret._class = "Direction";
    return ret;
}
function xmlToDirectionType(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "percussion") {
            var dataPercussions = xmlToPercussion(ch);
            ret.percussions = (ret.percussions || []).concat(dataPercussions);
        }
        if (ch.nodeName === "rehearsal") {
            var dataRehearsals = xmlToRehearsal(ch);
            ret.rehearsals = (ret.rehearsals || []).concat(dataRehearsals);
        }
        if (ch.nodeName === "pedal") {
            var dataPedal = xmlToPedal(ch);
            ret.pedal = dataPedal;
        }
        if (ch.nodeName === "principal-voice") {
            var dataPrincipalVoice = xmlToPrincipalVoice(ch);
            ret.principalVoice = dataPrincipalVoice;
        }
        if (ch.nodeName === "accordion-registration") {
            var dataAccordionRegistration = xmlToAccordionRegistration(ch);
            ret.accordionRegistration = dataAccordionRegistration;
        }
        if (ch.nodeName === "eyeglasses") {
            var dataEyeglasses = xmlToEyeglasses(ch);
            ret.eyeglasses = dataEyeglasses;
        }
        if (ch.nodeName === "image") {
            var dataImage = xmlToImage(ch);
            ret.image = dataImage;
        }
        if (ch.nodeName === "harp-pedals") {
            var dataHarpPedals = xmlToHarpPedals(ch);
            ret.harpPedals = dataHarpPedals;
        }
        if (ch.nodeName === "metronome") {
            var dataMetronome = xmlToMetronome(ch);
            ret.metronome = dataMetronome;
        }
        if (ch.nodeName === "other-direction") {
            var dataOtherDirection = xmlToOtherDirection(ch);
            ret.otherDirection = dataOtherDirection;
        }
        if (ch.nodeName === "segno") {
            var dataSegnos = xmlToSegno(ch);
            ret.segnos = (ret.segnos || []).concat(dataSegnos);
        }
        if (ch.nodeName === "scordatura") {
            var dataScordatura = xmlToScordatura(ch);
            ret.scordatura = dataScordatura;
        }
        if (ch.nodeName === "string-mute") {
            var dataStringMute = xmlToStringMute(ch);
            ret.stringMute = dataStringMute;
        }
        if (ch.nodeName === "wedge") {
            var dataWedge = xmlToWedge(ch);
            ret.wedge = dataWedge;
        }
        if (ch.nodeName === "dashes") {
            var dataDashes = xmlToDashes(ch);
            ret.dashes = dataDashes;
        }
        if (ch.nodeName === "damp") {
            var dataDamp = xmlToDamp(ch);
            ret.damp = dataDamp;
        }
        if (ch.nodeName === "bracket") {
            var dataBracket = xmlToBracket(ch);
            ret.bracket = dataBracket;
        }
        if (ch.nodeName === "dynamics") {
            var dataDynamics = xmlToDynamics(ch);
            ret.dynamics = dataDynamics;
        }
        if (ch.nodeName === "octave-shift") {
            var dataOctaveShift = xmlToOctaveShift(ch);
            ret.octaveShift = dataOctaveShift;
        }
        if (ch.nodeName === "words") {
            var dataWords = xmlToWords(ch);
            ret.words = (ret.words || []).concat(dataWords);
        }
        if (ch.nodeName === "damp-all") {
            var dataDampAll = xmlToDampAll(ch);
            ret.dampAll = dataDampAll;
        }
        if (ch.nodeName === "coda") {
            var dataCodas = xmlToCoda(ch);
            ret.codas = (ret.codas || []).concat(dataCodas);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToRehearsal(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToWords(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
(function (WedgeType) {
    WedgeType[WedgeType["Diminuendo"] = 1] = "Diminuendo";
    WedgeType[WedgeType["Crescendo"] = 0] = "Crescendo";
    WedgeType[WedgeType["Stop"] = 2] = "Stop";
    WedgeType[WedgeType["Continue"] = 3] = "Continue";
})(exports.WedgeType || (exports.WedgeType = {}));
var WedgeType = exports.WedgeType;
function getWedgeType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "diminuendo") {
        return WedgeType.Diminuendo;
    }
    if (s == "crescendo") {
        return WedgeType.Crescendo;
    }
    if (s == "stop") {
        return WedgeType.Stop;
    }
    if (s == "continue") {
        return WedgeType.Continue;
    }
    return fallbackVal;
}
function xmlToWedge(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundNiente = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "niente") {
            var dataNiente = xmlToYesNo(ch2);
            ret.niente = dataNiente;
            foundNiente = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getWedgeType(ch2, null);
            ret.type = dataType;
        }
        if (ch2.name === "spread") {
            var dataSpread = getNumber(ch2, true);
            ret.spread = dataSpread;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundNiente) {
        ret.niente = false;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToDashes(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopContinue(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (LineEndType) {
    LineEndType[LineEndType["None"] = 4] = "None";
    LineEndType[LineEndType["Both"] = 2] = "Both";
    LineEndType[LineEndType["Arrow"] = 3] = "Arrow";
    LineEndType[LineEndType["Down"] = 1] = "Down";
    LineEndType[LineEndType["Up"] = 0] = "Up";
})(exports.LineEndType || (exports.LineEndType = {}));
var LineEndType = exports.LineEndType;
function getLineEndType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return LineEndType.None;
    }
    if (s == "both") {
        return LineEndType.Both;
    }
    if (s == "arrow") {
        return LineEndType.Arrow;
    }
    if (s == "down") {
        return LineEndType.Down;
    }
    if (s == "up") {
        return LineEndType.Up;
    }
    return fallbackVal;
}
function xmlToBracket(node) {
    var ret = {};
    var foundNumber_ = false;
    var foundLineType = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "end-length") {
            var dataEndLength = getNumber(ch2, true);
            ret.endLength = dataEndLength;
        }
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "line-type") {
            var dataLineType = getSolidDashedDottedWavy(ch2, SolidDashedDottedWavy.Solid);
            ret.lineType = dataLineType;
            foundLineType = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStopContinue(ch2, null);
            ret.type = dataType;
        }
        if (ch2.name === "line-end") {
            var dataLineEnd = getLineEndType(ch2, null);
            ret.lineEnd = dataLineEnd;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    if (!foundLineType) {
        ret.lineType = SolidDashedDottedWavy.Solid;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
(function (PedalType) {
    PedalType[PedalType["Change"] = 3] = "Change";
    PedalType[PedalType["Start"] = 0] = "Start";
    PedalType[PedalType["Stop"] = 1] = "Stop";
    PedalType[PedalType["Continue"] = 2] = "Continue";
})(exports.PedalType || (exports.PedalType = {}));
var PedalType = exports.PedalType;
function getPedalType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "change") {
        return PedalType.Change;
    }
    if (s == "start") {
        return PedalType.Start;
    }
    if (s == "stop") {
        return PedalType.Stop;
    }
    if (s == "continue") {
        return PedalType.Continue;
    }
    return fallbackVal;
}
function xmlToPedal(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "line") {
            var dataLine = xmlToYesNo(ch2);
            ret.line = dataLine;
        }
        if (ch2.name === "sign") {
            var dataSign = xmlToYesNo(ch2);
            ret.sign = dataSign;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "type") {
            var dataType = getPedalType(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToMetronome(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundJustify = false;
    var gotFirstPair = false;
    var gotSecondPair = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "metronome-note") {
            var dataMetronomeNotes = xmlToMetronomeNote(ch);
            ret.metronomeNotes = (ret.metronomeNotes || []).concat(dataMetronomeNotes);
        }
        if (ch.nodeName === "per-minute") {
            var dataPerMinute = xmlToPerMinute(ch);
            ret.perMinute = dataPerMinute;
        }
        if (ch.nodeName === "beat-unit") {
            var dataBeatUnit = getString(ch, true);
            if (!gotFirstPair) {
                ret.beatUnit = dataBeatUnit;
                gotFirstPair = true;
            }
            else if (!gotSecondPair) {
                ret.beatUnitChange = dataBeatUnit;
                gotSecondPair = true;
            }
            else {
                throw "Too many beat-units in metronome";
            }
        }
        if (ch.nodeName === "beat-unit-dot") {
            var dataBeatUnitDots = xmlToBeatUnitDot(ch);
            if (!gotSecondPair) {
                ret.beatUnitDots = (ret.beatUnitDots || []).concat(dataBeatUnitDots);
            }
            else {
                ret.beatUnitDotsChange = (ret.beatUnitDotsChange || []).concat(dataBeatUnitDots);
            }
        }
        if (ch.nodeName === "metronome-relation") {
            var dataMetronomeRelation = getString(ch, true);
            ret.metronomeRelation = dataMetronomeRelation;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "parentheses") {
            var dataParentheses = xmlToYesNo(ch2);
            ret.parentheses = dataParentheses;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    return ret;
}
function xmlToBeatUnitDot(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToPerMinute(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    return ret;
}
function xmlToMetronomeNote(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "metronome-dot") {
            var dataMetronomeDots = xmlToMetronomeDot(ch);
            ret.metronomeDots = (ret.metronomeDots || []).concat(dataMetronomeDots);
        }
        if (ch.nodeName === "metronome-beam") {
            var dataMetronomeBeams = xmlToMetronomeBeam(ch);
            ret.metronomeBeams = (ret.metronomeBeams || []).concat(dataMetronomeBeams);
        }
        if (ch.nodeName === "metronome-type") {
            var dataMetronomeType = getString(ch, true);
            ret.metronomeType = dataMetronomeType;
        }
        if (ch.nodeName === "metronome-tuplet") {
            var dataMetronomeTuplet = xmlToMetronomeTuplet(ch);
            ret.metronomeTuplet = dataMetronomeTuplet;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToMetronomeDot(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToMetronomeBeam(node) {
    var ret = {};
    var foundNumber_ = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundNumber_) {
        ret.number = 1;
    }
    return ret;
}
function xmlToMetronomeTuplet(node) {
    var ret = {};
    var foundBracket = false;
    var foundShowNumber = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "actual-notes") {
            var dataActualNotes = getNumber(ch, true);
            ret.actualNotes = dataActualNotes;
        }
        if (ch.nodeName === "normal-type") {
            var dataNormalType = getString(ch, true);
            ret.normalType = dataNormalType;
        }
        if (ch.nodeName === "normal-notes") {
            var dataNormalNotes = getNumber(ch, true);
            ret.normalNotes = dataNormalNotes;
        }
        if (ch.nodeName === "normal-dot") {
            var dataNormalDots = xmlToNormalDot(ch);
            ret.normalDots = (ret.normalDots || []).concat(dataNormalDots);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "bracket") {
            var dataBracket = xmlToYesNo(ch2);
            ret.bracket = dataBracket;
            foundBracket = true;
        }
        if (ch2.name === "show-number") {
            var dataShowNumber = getActualBothNone(ch2, ActualBothNone.Both);
            ret.showNumber = dataShowNumber;
            foundShowNumber = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundBracket) {
        ret.bracket = false;
    }
    if (!foundShowNumber) {
        ret.showNumber = ActualBothNone.Both;
    }
    return ret;
}
(function (OctaveShiftType) {
    OctaveShiftType[OctaveShiftType["Down"] = 2] = "Down";
    OctaveShiftType[OctaveShiftType["Stop"] = 3] = "Stop";
    OctaveShiftType[OctaveShiftType["Up"] = 1] = "Up";
    OctaveShiftType[OctaveShiftType["Continue"] = 4] = "Continue";
})(exports.OctaveShiftType || (exports.OctaveShiftType = {}));
var OctaveShiftType = exports.OctaveShiftType;
function getOctaveShiftType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "down") {
        return OctaveShiftType.Down;
    }
    if (s == "stop") {
        return OctaveShiftType.Stop;
    }
    if (s == "up") {
        return OctaveShiftType.Up;
    }
    if (s == "continue") {
        return OctaveShiftType.Continue;
    }
    return fallbackVal;
}
function xmlToOctaveShift(node) {
    var ret = {};
    var foundSize = false;
    var foundDashLength = false;
    var foundSpaceLength = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "size") {
            var dataSize = getNumber(ch2, true);
            ret.size = dataSize;
            foundSize = true;
        }
        if (ch2.name === "dash-length") {
            var dataDashLength = getNumber(ch2, true);
            ret.dashLength = dataDashLength;
            foundDashLength = true;
        }
        if (ch2.name === "space-length") {
            var dataSpaceLength = getNumber(ch2, true);
            ret.spaceLength = dataSpaceLength;
            foundSpaceLength = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getOctaveShiftType(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundSize) {
        ret.size = 8;
    }
    if (!foundDashLength) {
        ret.dashLength = 1;
    }
    if (!foundSpaceLength) {
        ret.spaceLength = 1;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToHarpPedals(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "pedal-tuning") {
            var dataPedalTunings = xmlToPedalTuning(ch);
            ret.pedalTunings = (ret.pedalTunings || []).concat(dataPedalTunings);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToPedalTuning(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "pedal-step") {
            var dataPedalStep = getString(ch, true);
            ret.pedalStep = dataPedalStep;
        }
        if (ch.nodeName === "pedal-alter") {
            var dataPedalAlter = getString(ch, true);
            ret.pedalAlter = dataPedalAlter;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToDamp(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToDampAll(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToEyeglasses(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToStringMute(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToScordatura(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "accord") {
            var dataAccords = xmlToAccord(ch);
            ret.accords = (ret.accords || []).concat(dataAccords);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToAccord(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "tuning-alter") {
            var dataTuningAlter = getString(ch, true);
            ret.tuningAlter = dataTuningAlter;
        }
        if (ch.nodeName === "tuning-step") {
            var dataTuningStep = getString(ch, true);
            ret.tuningStep = dataTuningStep;
        }
        if (ch.nodeName === "tuning-octave") {
            var dataTuningOctave = getString(ch, true);
            ret.tuningOctave = dataTuningOctave;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "string") {
            var dataString = getString(ch2, true);
            ret.string = dataString;
        }
    }
    return ret;
}
function xmlToImage(node) {
    var ret = {};
    var foundHalign = false;
    var foundValignImage = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValignImage = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valignImage = dataValignImage;
            foundValignImage = true;
        }
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
        if (ch2.name === "source") {
            var dataSource = getString(ch2, true);
            ret.source = dataSource;
        }
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValignImage) {
        ret.valignImage = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
(function (VoiceSymbol) {
    VoiceSymbol[VoiceSymbol["None"] = 4] = "None";
    VoiceSymbol[VoiceSymbol["Hauptstimme"] = 1] = "Hauptstimme";
    VoiceSymbol[VoiceSymbol["Nebenstimme"] = 2] = "Nebenstimme";
    VoiceSymbol[VoiceSymbol["Plain"] = 3] = "Plain";
})(exports.VoiceSymbol || (exports.VoiceSymbol = {}));
var VoiceSymbol = exports.VoiceSymbol;
function getVoiceSymbol(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "none") {
        return VoiceSymbol.None;
    }
    if (s == "Hauptstimme") {
        return VoiceSymbol.Hauptstimme;
    }
    if (s == "Nebenstimme") {
        return VoiceSymbol.Nebenstimme;
    }
    if (s == "plain") {
        return VoiceSymbol.Plain;
    }
    return fallbackVal;
}
function xmlToPrincipalVoice(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "symbol") {
            var dataSymbol = getVoiceSymbol(ch2, null);
            ret.symbol = dataSymbol;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, false);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToAccordionRegistration(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "accordion-middle") {
            var dataAccordionMiddle = getString(ch, true);
            ret.accordionMiddle = dataAccordionMiddle;
        }
        if (ch.nodeName === "accordion-high") {
            var dataAccordionHigh = true;
            ret.accordionHigh = dataAccordionHigh;
        }
        if (ch.nodeName === "accordion-low") {
            var dataAccordionLow = true;
            ret.accordionLow = dataAccordionLow;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToPercussion(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundEnclosure = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "stick-location") {
            var dataStickLocation = getString(ch, true);
            ret.stickLocation = dataStickLocation;
        }
        if (ch.nodeName === "other-percussion") {
            var dataOtherPercussion = getString(ch, true);
            ret.otherPercussion = dataOtherPercussion;
        }
        if (ch.nodeName === "wood") {
            var dataWood = getString(ch, true);
            ret.wood = dataWood;
        }
        if (ch.nodeName === "effect") {
            var dataEffect = getString(ch, true);
            ret.effect = dataEffect;
        }
        if (ch.nodeName === "glass") {
            var dataGlass = getString(ch, true);
            ret.glass = dataGlass;
        }
        if (ch.nodeName === "timpani") {
            var dataTimpani = xmlToTimpani(ch);
            ret.timpani = dataTimpani;
        }
        if (ch.nodeName === "stick") {
            var dataStick = xmlToStick(ch);
            ret.stick = dataStick;
        }
        if (ch.nodeName === "metal") {
            var dataMetal = getString(ch, true);
            ret.metal = dataMetal;
        }
        if (ch.nodeName === "pitched") {
            var dataPitched = getString(ch, true);
            ret.pitched = dataPitched;
        }
        if (ch.nodeName === "membrane") {
            var dataMembrane = getString(ch, true);
            ret.membrane = dataMembrane;
        }
        if (ch.nodeName === "beater") {
            var dataBeater = xmlToBeater(ch);
            ret.beater = dataBeater;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    return ret;
}
function xmlToTimpani(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToBeater(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "tip") {
            var dataTip = getTipDirection(ch2, null);
            ret.tip = dataTip;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    return ret;
}
function xmlToStick(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "stick-material") {
            var dataStickMaterial = getString(ch, true);
            ret.stickMaterial = dataStickMaterial;
        }
        if (ch.nodeName === "stick-type") {
            var dataStickType = getString(ch, true);
            ret.stickType = dataStickType;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "tip") {
            var dataTip = getTipDirection(ch2, null);
            ret.tip = dataTip;
        }
    }
    return ret;
}
function xmlToOffset(node) {
    var ret = {};
    var foundSound = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "sound") {
            var dataSound = xmlToYesNo(ch2);
            ret.sound = dataSound;
            foundSound = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundSound) {
        ret.sound = false;
    }
    return ret;
}
function xmlToHarmonyChord(node) {
    var ret = {
        root: null,
        "function": null,
        kind: null,
        degrees: [],
        inversion: null,
        bass: null
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "root") {
            var dataRoot = xmlToRoot(ch);
            ret.root = dataRoot;
        }
        if (ch.nodeName === "function") {
            var dataFunction = xmlToFunction(ch);
            ret.function = dataFunction;
        }
        if (ch.nodeName === "kind") {
            var dataKind = xmlToKind(ch);
            ret.kind = dataKind;
        }
        if (ch.nodeName === "degree") {
            var dataDegree = xmlToDegree(ch);
            ret.degrees.push(dataDegree);
        }
        if (ch.nodeName === "inversion") {
            var dataInversion = xmlToInversion(ch);
            ret.inversion = dataInversion;
        }
        if (ch.nodeName === "bass") {
            var dataBass = xmlToBass(ch);
            ret.bass = dataBass;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
(function (ExplicitImpliedAlternate) {
    ExplicitImpliedAlternate[ExplicitImpliedAlternate["Explicit"] = 1] = "Explicit";
    ExplicitImpliedAlternate[ExplicitImpliedAlternate["Implied"] = 2] = "Implied";
    ExplicitImpliedAlternate[ExplicitImpliedAlternate["Alternate"] = 3] = "Alternate";
})(exports.ExplicitImpliedAlternate || (exports.ExplicitImpliedAlternate = {}));
var ExplicitImpliedAlternate = exports.ExplicitImpliedAlternate;
function getExplicitImpliedAlternate(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "explicit") {
        return ExplicitImpliedAlternate.Explicit;
    }
    if (s == "implied") {
        return ExplicitImpliedAlternate.Implied;
    }
    if (s == "alternate") {
        return ExplicitImpliedAlternate.Alternate;
    }
    return fallbackVal;
}
function xmlToHarmony(node) {
    var ret = {
        frame: null,
        printFrame: null,
        staff: null,
        type: null,
        offset: null,
        root: null,
        "function": null,
        kind: null,
        degrees: [],
        inversion: null,
        bass: null
    };
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPlacement = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "frame") {
            var dataFrame = xmlToFrame(ch);
            ret.frame = dataFrame;
        }
        if (ch.nodeName === "root") {
            var dataRoot = xmlToRoot(ch);
            ret.root = dataRoot;
        }
        if (ch.nodeName === "function") {
            var dataFunction = xmlToFunction(ch);
            ret.function = dataFunction;
        }
        if (ch.nodeName === "kind") {
            var dataKind = xmlToKind(ch);
            ret.kind = dataKind;
        }
        if (ch.nodeName === "degree") {
            var dataDegree = xmlToDegree(ch);
            ret.degrees.push(dataDegree);
        }
        if (ch.nodeName === "inversion") {
            var dataInversion = xmlToInversion(ch);
            ret.inversion = dataInversion;
        }
        if (ch.nodeName === "bass") {
            var dataBass = xmlToBass(ch);
            ret.bass = dataBass;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "staff") {
            var dataStaff = getNumber(ch, true);
            ret.staff = dataStaff;
        }
        if (ch.nodeName === "offset") {
            var dataOffset = xmlToOffset(ch);
            ret.offset = dataOffset;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-frame") {
            var dataPrintFrame = xmlToYesNo(ch2);
            ret.printFrame = dataPrintFrame;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "placement") {
            var dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
            ret.placement = dataPlacement;
            foundPlacement = true;
        }
        if (ch2.name === "type") {
            var dataHarmonyType = getExplicitImpliedAlternate(ch2, null);
            ret.type = dataHarmonyType;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPlacement) {
        ret.placement = AboveBelow.Unspecified;
    }
    ret._class = "Harmony";
    return ret;
}
function xmlToRoot(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "root-step") {
            var dataRootStep = xmlToRootStep(ch);
            ret.rootStep = dataRootStep;
        }
        if (ch.nodeName === "root-alter") {
            var dataRootAlter = xmlToRootAlter(ch);
            ret.rootAlter = dataRootAlter;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToRootStep(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "text") {
            var dataText = getString(ch2, true);
            ret.text = dataText;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToRootAlter(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "location") {
            var dataLocation = getLeftRight(ch2, null);
            ret.location = dataLocation;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToFunction(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToKind(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "parentheses-degrees") {
            var dataParenthesesDegrees = xmlToYesNo(ch2);
            ret.parenthesesDegrees = dataParenthesesDegrees;
        }
        if (ch2.name === "use-symbols") {
            var dataUseSymbols = xmlToYesNo(ch2);
            ret.useSymbols = dataUseSymbols;
        }
        if (ch2.name === "text") {
            var dataText = getString(ch2, true);
            ret.text = dataText;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "stack-degrees") {
            var dataStackDegrees = xmlToYesNo(ch2);
            ret.stackDegrees = dataStackDegrees;
        }
        if (ch2.name === "bracket-degrees") {
            var dataBracketDegrees = xmlToYesNo(ch2);
            ret.bracketDegrees = dataBracketDegrees;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToInversion(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToBass(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "bass-step") {
            var dataBassStep = xmlToBassStep(ch);
            ret.bassStep = dataBassStep;
        }
        if (ch.nodeName === "bass-alter") {
            var dataBassAlter = xmlToBassAlter(ch);
            ret.bassAlter = dataBassAlter;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToBassStep(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "text") {
            var dataText = getString(ch2, true);
            ret.text = dataText;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToBassAlter(node) {
    var ret = {};
    var foundPrintObject = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "location") {
            var dataLocation = getLeftRight(ch2, null);
            ret.location = dataLocation;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToDegree(node) {
    var ret = {};
    var foundPrintObject = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "degree-alter") {
            var dataDegreeAlter = xmlToDegreeAlter(ch);
            ret.degreeAlter = dataDegreeAlter;
        }
        if (ch.nodeName === "degree-value") {
            var dataDegreeValue = xmlToDegreeValue(ch);
            ret.degreeValue = dataDegreeValue;
        }
        if (ch.nodeName === "degree-type") {
            var dataDegreeType = xmlToDegreeType(ch);
            ret.degreeType = dataDegreeType;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    return ret;
}
(function (ChordType) {
    ChordType[ChordType["Augmented"] = 3] = "Augmented";
    ChordType[ChordType["Diminished"] = 4] = "Diminished";
    ChordType[ChordType["Major"] = 1] = "Major";
    ChordType[ChordType["Minor"] = 2] = "Minor";
    ChordType[ChordType["HalfDiminished"] = 5] = "HalfDiminished";
})(exports.ChordType || (exports.ChordType = {}));
var ChordType = exports.ChordType;
function getChordType(node, fallbackVal) {
    "use strict";
    var s = (node.nodeType === node.ATTRIBUTE_NODE ? node.value : node.textContent).trim();
    if (s === "" && fallbackVal !== null && fallbackVal !== undefined) {
        return fallbackVal;
    }
    if (s == "augmented") {
        return ChordType.Augmented;
    }
    if (s == "diminished") {
        return ChordType.Diminished;
    }
    if (s == "major") {
        return ChordType.Major;
    }
    if (s == "minor") {
        return ChordType.Minor;
    }
    if (s == "half-diminished") {
        return ChordType.HalfDiminished;
    }
    return fallbackVal;
}
function xmlToDegreeValue(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "symbol") {
            var dataSymbol = getChordType(ch2, null);
            ret.symbol = dataSymbol;
        }
        if (ch2.name === "text") {
            var dataText = getString(ch2, true);
            ret.text = dataText;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToDegreeAlter(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "plus-minus") {
            var dataPlusMinus = xmlToYesNo(ch2);
            ret.plusMinus = dataPlusMinus;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToDegreeType(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "text") {
            var dataText = getString(ch2, true);
            ret.text = dataText;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToFrame(node) {
    var ret = {};
    var foundColor = false;
    var foundHalign = false;
    var foundValignImage = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "frame-strings") {
            var dataFrameStrings = getString(ch, true);
            ret.frameStrings = dataFrameStrings;
        }
        if (ch.nodeName === "frame-note") {
            var dataFrameNotes = xmlToFrameNote(ch);
            ret.frameNotes = (ret.frameNotes || []).concat(dataFrameNotes);
        }
        if (ch.nodeName === "frame-frets") {
            var dataFrameFrets = getString(ch, true);
            ret.frameFrets = dataFrameFrets;
        }
        if (ch.nodeName === "first-fret") {
            var dataFirstFret = xmlToFirstFret(ch);
            ret.firstFret = dataFirstFret;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "unplayed") {
            var dataUnplayed = getString(ch2, true);
            ret.unplayed = dataUnplayed;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValignImage = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valignImage = dataValignImage;
            foundValignImage = true;
        }
        if (ch2.name === "width") {
            var dataWidth = getNumber(ch2, true);
            ret.width = dataWidth;
        }
        if (ch2.name === "height") {
            var dataHeight = getNumber(ch2, true);
            ret.height = dataHeight;
        }
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValignImage) {
        ret.valignImage = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToFirstFret(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "text") {
            var dataText = getString(ch2, true);
            ret.text = dataText;
        }
        if (ch2.name === "location") {
            var dataLocation = getLeftRight(ch2, null);
            ret.location = dataLocation;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    return ret;
}
function xmlToFrameNote(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "barre") {
            var dataBarre = xmlToBarre(ch);
            ret.barre = dataBarre;
        }
        if (ch.nodeName === "string") {
            var dataString = xmlToString(ch);
            ret.string = dataString;
        }
        if (ch.nodeName === "fingering") {
            var dataFingering = xmlToFingering(ch);
            ret.fingering = dataFingering;
        }
        if (ch.nodeName === "fret") {
            var dataFret = xmlToFret(ch);
            ret.fret = dataFret;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToBarre(node) {
    var ret = {};
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToGrouping(node) {
    var ret = {};
    var foundNumber_ = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "feature") {
            var dataFeatures = xmlToFeature(ch);
            ret.features = (ret.features || []).concat(dataFeatures);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "type") {
            var dataGroupingType = getStartStopSingle(ch2, null);
            ret.type = dataGroupingType;
        }
        if (ch2.name === "member-of") {
            var dataMemberOf = getString(ch2, true);
            ret.memberOf = dataMemberOf;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    ret._class = "Grouping";
    return ret;
}
function xmlToFeature(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    return ret;
}
function xmlToPrint(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "measure-numbering") {
            var dataMeasureNumbering = xmlToMeasureNumbering(ch);
            ret.measureNumbering = dataMeasureNumbering;
        }
        if (ch.nodeName === "part-name-display") {
            var dataPartNameDisplay = xmlToPartNameDisplay(ch);
            ret.partNameDisplay = dataPartNameDisplay;
        }
        if (ch.nodeName === "measure-layout") {
            var dataMeasureLayout = xmlToMeasureLayout(ch);
            ret.measureLayout = dataMeasureLayout;
        }
        if (ch.nodeName === "part-abbreviation-display") {
            var dataPartAbbreviationDisplay = xmlToPartAbbreviationDisplay(ch);
            ret.partAbbreviationDisplay = dataPartAbbreviationDisplay;
        }
        if (ch.nodeName === "page-layout") {
            var dataPageLayout = xmlToPageLayout(ch);
            ret.pageLayout = dataPageLayout;
        }
        if (ch.nodeName === "system-layout") {
            var dataSystemLayout = xmlToSystemLayout(ch);
            ret.systemLayout = dataSystemLayout;
        }
        if (ch.nodeName === "staff-layout") {
            var dataStaffLayouts = xmlToStaffLayout(ch);
            ret.staffLayouts = (ret.staffLayouts || []).concat(dataStaffLayouts);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "new-system") {
            var dataNewSystem = xmlToYesNo(ch2);
            ret.newSystem = dataNewSystem;
        }
        if (ch2.name === "new-page") {
            var dataNewPage = xmlToYesNo(ch2);
            ret.newPage = dataNewPage;
        }
        if (ch2.name === "blank-page") {
            var dataBlankPage = getString(ch2, true);
            ret.blankPage = dataBlankPage;
        }
        if (ch2.name === "staff-spacing") {
            var dataStaffSpacing = getNumber(ch2, true);
            ret.staffSpacing = dataStaffSpacing;
        }
        if (ch2.name === "page-number") {
            var dataPageNumber = getString(ch2, true);
            ret.pageNumber = dataPageNumber;
        }
    }
    ret._class = "Print";
    return ret;
}
function xmlToMeasureNumbering(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToSound(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "midi-instrument") {
            var dataMidiInstruments = xmlToMidiInstrument(ch);
            ret.midiInstruments = (ret.midiInstruments || []).concat(dataMidiInstruments);
        }
        if (ch.nodeName === "play") {
            var dataPlays = xmlToPlay(ch);
            ret.plays = (ret.plays || []).concat(dataPlays);
        }
        if (ch.nodeName === "offset") {
            var dataOffset = xmlToOffset(ch);
            ret.offset = dataOffset;
        }
        if (ch.nodeName === "midi-device") {
            var dataMidiDevices = xmlToMidiDevice(ch);
            ret.midiDevices = (ret.midiDevices || []).concat(dataMidiDevices);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "soft-pedal") {
            var dataSoftPedal = getString(ch2, true);
            ret.softPedal = dataSoftPedal;
        }
        if (ch2.name === "pan") {
            var dataPan = getString(ch2, true);
            ret.pan = dataPan;
        }
        if (ch2.name === "tocoda") {
            var dataTocoda = getString(ch2, true);
            ret.tocoda = dataTocoda;
        }
        if (ch2.name === "decapo") {
            var dataDecapo = xmlToYesNo(ch2);
            ret.decapo = dataDecapo;
        }
        if (ch2.name === "divisions") {
            var dataDivisions = getNumber(ch2, true);
            ret.divisions = dataDivisions;
        }
        if (ch2.name === "pizzicato") {
            var dataPizzicato = xmlToYesNo(ch2);
            ret.pizzicato = dataPizzicato;
        }
        if (ch2.name === "coda") {
            var dataCoda = getString(ch2, true);
            ret.coda = dataCoda;
        }
        if (ch2.name === "segno") {
            var dataSegno = getString(ch2, true);
            ret.segno = dataSegno;
        }
        if (ch2.name === "elevation") {
            var dataElevation = getString(ch2, true);
            ret.elevation = dataElevation;
        }
        if (ch2.name === "fine") {
            var dataFine = getString(ch2, true);
            ret.fine = dataFine;
        }
        if (ch2.name === "damper-pedal") {
            var dataDamperPedal = getString(ch2, true);
            ret.damperPedal = dataDamperPedal;
        }
        if (ch2.name === "dynamics") {
            var dataDynamics = getString(ch2, true);
            ret.dynamics = dataDynamics;
        }
        if (ch2.name === "time-only") {
            var dataTimeOnly = getString(ch2, true);
            ret.timeOnly = dataTimeOnly;
        }
        if (ch2.name === "sostenuto-pedal") {
            var dataSostenutoPedal = getString(ch2, true);
            ret.sostenutoPedal = dataSostenutoPedal;
        }
        if (ch2.name === "dalsegno") {
            var dataDalsegno = getString(ch2, true);
            ret.dalsegno = dataDalsegno;
        }
        if (ch2.name === "tempo") {
            var dataTempo = getString(ch2, true);
            ret.tempo = dataTempo;
        }
        if (ch2.name === "forward-repeat") {
            var dataForwardRepeat = xmlToYesNo(ch2);
            ret.forwardRepeat = dataForwardRepeat;
        }
    }
    ret._class = "Sound";
    return ret;
}
function xmlToWork(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "work-number") {
            var dataWorkNumber = getString(ch, true);
            ret.workNumber = dataWorkNumber;
        }
        if (ch.nodeName === "work-title") {
            var dataWorkTitle = getString(ch, true);
            ret.workTitle = dataWorkTitle;
        }
        if (ch.nodeName === "opus") {
            var dataOpus = xmlToOpus(ch);
            ret.opus = dataOpus;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToOpus(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToDefaults(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "word-font") {
            var dataWordFont = xmlToWordFont(ch);
            ret.wordFont = dataWordFont;
        }
        if (ch.nodeName === "lyric-language") {
            var dataLyricLanguages = xmlToLyricLanguage(ch);
            ret.lyricLanguages = (ret.lyricLanguages || []).concat(dataLyricLanguages);
        }
        if (ch.nodeName === "lyric-font") {
            var dataLyricFonts = xmlToLyricFont(ch);
            ret.lyricFonts = (ret.lyricFonts || []).concat(dataLyricFonts);
        }
        if (ch.nodeName === "page-layout") {
            var dataPageLayout = xmlToPageLayout(ch);
            ret.pageLayout = dataPageLayout;
        }
        if (ch.nodeName === "system-layout") {
            var dataSystemLayout = xmlToSystemLayout(ch);
            ret.systemLayout = dataSystemLayout;
        }
        if (ch.nodeName === "appearance") {
            var dataAppearance = xmlToAppearance(ch);
            ret.appearance = dataAppearance;
        }
        if (ch.nodeName === "scaling") {
            var dataScaling = xmlToScaling(ch);
            ret.scaling = dataScaling;
        }
        if (ch.nodeName === "staff-layout") {
            var dataStaffLayouts = xmlToStaffLayout(ch);
            ret.staffLayouts = (ret.staffLayouts || []).concat(dataStaffLayouts);
        }
        if (ch.nodeName === "music-font") {
            var dataMusicFont = xmlToMusicFont(ch);
            ret.musicFont = dataMusicFont;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToMusicFont(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    return ret;
}
function xmlToWordFont(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    return ret;
}
function xmlToLyricFont(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "name") {
            var dataName = getString(ch2, true);
            ret.name = dataName;
        }
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    return ret;
}
function xmlToLyricLanguage(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
        }
        if (ch2.name === "name") {
            var dataName = getString(ch2, true);
            ret.name = dataName;
        }
    }
    return ret;
}
function xmlToCredit(node) {
    var ret = {};
    ret.creditWords = [];
    var foundCreditTypes = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "credit-type") {
            var dataCreditTypes = getString(ch, true);
            ret.creditTypes = (ret.creditTypes || []).concat(dataCreditTypes);
            foundCreditTypes = true;
        }
        if (ch.nodeName === "credit-words") {
            var dataCreditWords = xmlToCreditWords(ch);
            ret.creditWords.push(dataCreditWords);
        }
        if (ch.nodeName === "credit-image") {
            var dataCreditImage = xmlToCreditImage(ch);
            ret.creditImage = dataCreditImage;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "page") {
            var dataPage = getNumber(ch2, true);
            ret.page = dataPage;
        }
    }
    if (!foundCreditTypes) {
        ret.creditTypes = [];
    }
    return ret;
}
function xmlToCreditWords(node) {
    var ret = {};
    var foundJustify = false;
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundHalign = false;
    var foundValign = false;
    var foundUnderline = false;
    var foundOverline = false;
    var foundLineThrough = false;
    var foundRotation = false;
    var foundLetterSpacing = false;
    var foundLineHeight = false;
    var foundDir = false;
    var foundEnclosure = false;
    var foundFontFamily = false;
    var foundRelativeX = false;
    var foundRelativeY = false;
    var foundDefaultX = false;
    var foundDefaultY = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
            foundDefaultX = true;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
            foundRelativeY = true;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
            foundDefaultY = true;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
            foundRelativeX = true;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
            foundFontFamily = true;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValign = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valign = dataValign;
            foundValign = true;
        }
        if (ch2.name === "underline") {
            var dataUnderline = getNumber(ch2, true);
            ret.underline = dataUnderline;
            foundUnderline = true;
        }
        if (ch2.name === "overline") {
            var dataOverline = getNumber(ch2, true);
            ret.overline = dataOverline;
            foundOverline = true;
        }
        if (ch2.name === "line-through") {
            var dataLineThrough = getNumber(ch2, true);
            ret.lineThrough = dataLineThrough;
            foundLineThrough = true;
        }
        if (ch2.name === "rotation") {
            var dataRotation = getNumber(ch2, true);
            ret.rotation = dataRotation;
            foundRotation = true;
        }
        if (ch2.name === "letter-spacing") {
            var dataLetterSpacing = getString(ch2, true);
            ret.letterSpacing = dataLetterSpacing;
            foundLetterSpacing = true;
        }
        if (ch2.name === "line-height") {
            var dataLineHeight = getString(ch2, true);
            ret.lineHeight = dataLineHeight;
            foundLineHeight = true;
        }
        if (ch2.name === "dir") {
            var dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
            ret.dir = dataDir;
            foundDir = true;
        }
        if (ch2.name === "enclosure") {
            var dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
            ret.enclosure = dataEnclosure;
            foundEnclosure = true;
        }
    }
    var ch3 = node;
    var dataWords = getString(ch3, true);
    ret.words = dataWords;
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValign) {
        ret.valign = TopMiddleBottomBaseline.Bottom;
    }
    if (!foundUnderline) {
        ret.underline = 0;
    }
    if (!foundOverline) {
        ret.overline = 0;
    }
    if (!foundLineThrough) {
        ret.lineThrough = 0;
    }
    if (!foundRotation) {
        ret.rotation = 0;
    }
    if (!foundLetterSpacing) {
        ret.letterSpacing = "normal";
    }
    if (!foundLineHeight) {
        ret.lineHeight = "normal";
    }
    if (!foundDir) {
        ret.dir = DirectionMode.Ltr;
    }
    if (!foundEnclosure) {
        ret.enclosure = EnclosureShape.None;
    }
    if (!foundFontFamily) {
        ret.fontFamily = "";
    }
    if (!foundRelativeX) {
        ret.relativeX = null;
    }
    if (!foundRelativeY) {
        ret.relativeY = null;
    }
    if (!foundDefaultX) {
        ret.defaultX = null;
    }
    if (!foundDefaultY) {
        ret.defaultY = null;
    }
    return ret;
}
function xmlToCreditImage(node) {
    var ret = {};
    var foundHalign = false;
    var foundValignImage = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "halign") {
            var dataHalign = getLeftCenterRight(ch2, (ret.justify || LeftCenterRight.Left));
            ret.halign = dataHalign;
            foundHalign = true;
        }
        if (ch2.name === "valign") {
            var dataValignImage = getTopMiddleBottomBaseline(ch2, TopMiddleBottomBaseline.Bottom);
            ret.valignImage = dataValignImage;
            foundValignImage = true;
        }
        if (ch2.name === "type") {
            var dataType = getString(ch2, true);
            ret.type = dataType;
        }
        if (ch2.name === "source") {
            var dataSource = getString(ch2, true);
            ret.source = dataSource;
        }
    }
    if (!foundHalign) {
        ret.halign = (ret.justify || LeftCenterRight.Left);
    }
    if (!foundValignImage) {
        ret.valignImage = TopMiddleBottomBaseline.Bottom;
    }
    return ret;
}
function xmlToPartList(node) {
    var ret = [];
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "score-part") {
            var dataScoreParts = xmlToScorePart(ch);
            ret.push(dataScoreParts);
        }
        if (ch.nodeName === "part-group") {
            var dataPartGroups = xmlToPartGroup(ch);
            ret.push(dataPartGroups);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToScorePart(node) {
    var ret = {
        _class: "ScorePart",
        identification: null,
        partNameDisplay: null,
        scoreInstruments: [],
        midiDevices: [],
        partName: null,
        partAbbreviationDisplay: null,
        partAbbreviation: null,
        groups: [],
        midiInstruments: [],
        id: ""
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "identification") {
            var dataIdentification = xmlToIdentification(ch);
            ret.identification = dataIdentification;
        }
        if (ch.nodeName === "part-name-display") {
            var dataPartNameDisplay = xmlToPartNameDisplay(ch);
            ret.partNameDisplay = dataPartNameDisplay;
        }
        if (ch.nodeName === "score-instrument") {
            var dataScoreInstruments = xmlToScoreInstrument(ch);
            ret.scoreInstruments = (ret.scoreInstruments || []).concat(dataScoreInstruments);
        }
        if (ch.nodeName === "midi-device") {
            var dataMidiDevices = xmlToMidiDevice(ch);
            ret.midiDevices = (ret.midiDevices || []).concat(dataMidiDevices);
        }
        if (ch.nodeName === "part-name") {
            var dataPartName = xmlToPartName(ch);
            ret.partName = dataPartName;
        }
        if (ch.nodeName === "part-abbreviation-display") {
            var dataPartAbbreviationDisplay = xmlToPartAbbreviationDisplay(ch);
            ret.partAbbreviationDisplay = dataPartAbbreviationDisplay;
        }
        if (ch.nodeName === "part-abbreviation") {
            var dataPartAbbreviation = xmlToPartAbbreviation(ch);
            ret.partAbbreviation = dataPartAbbreviation;
        }
        if (ch.nodeName === "group") {
            var dataGroups = getString(ch, true);
            ret.groups = (ret.groups || []).concat(dataGroups);
        }
        if (ch.nodeName === "midi-instrument") {
            var dataMidiInstruments = xmlToMidiInstrument(ch);
            ret.midiInstruments = (ret.midiInstruments || []).concat(dataMidiInstruments);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "id") {
            var dataId = getString(ch2, true);
            ret.id = dataId;
        }
    }
    return ret;
}
function xmlToPartName(node) {
    var ret = {
        partName: "",
        defaultX: null,
        defaultY: null,
        relativeX: null,
        relativeY: null,
        fontFamily: "",
        fontSize: ""
    };
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPrintObject = false;
    var foundJustify = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
    }
    var ch3 = node;
    var dataPartName = getString(ch3, true);
    ret.partName = dataPartName;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    return ret;
}
function xmlToPartAbbreviation(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundPrintObject = false;
    var foundJustify = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "print-object") {
            var dataPrintObject = xmlToYesNo(ch2);
            ret.printObject = dataPrintObject;
            foundPrintObject = true;
        }
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
    }
    var ch3 = node;
    var dataAbbreviation = getString(ch3, true);
    ret.abbreviation = dataAbbreviation;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundPrintObject) {
        ret.printObject = true;
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    return ret;
}
function xmlToPartGroup(node) {
    var ret = {
        _class: "PartGroup"
    };
    var foundNumber_ = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "group-name-display") {
            var dataGroupNameDisplay = xmlToGroupNameDisplay(ch);
            ret.groupNameDisplay = dataGroupNameDisplay;
        }
        if (ch.nodeName === "group-symbol") {
            var dataGroupSymbol = xmlToGroupSymbol(ch);
            ret.groupSymbol = dataGroupSymbol;
        }
        if (ch.nodeName === "group-name") {
            var dataGroupName = xmlToGroupName(ch);
            ret.groupName = dataGroupName;
        }
        if (ch.nodeName === "group-abbreviation-display") {
            var dataGroupAbbreviationDisplay = xmlToGroupAbbreviationDisplay(ch);
            ret.groupAbbreviationDisplay = dataGroupAbbreviationDisplay;
        }
        if (ch.nodeName === "group-barline") {
            var dataGroupBarline = xmlToGroupBarline(ch);
            ret.groupBarline = dataGroupBarline;
        }
        if (ch.nodeName === "footnote") {
            var dataFootnote = xmlToFootnote(ch);
            ret.footnote = dataFootnote;
        }
        if (ch.nodeName === "level") {
            var dataLevel = xmlToLevel(ch);
            ret.level = dataLevel;
        }
        if (ch.nodeName === "group-abbreviation") {
            var dataGroupAbbreviation = xmlToGroupAbbreviation(ch);
            ret.groupAbbreviation = dataGroupAbbreviation;
        }
        if (ch.nodeName === "group-time") {
            var dataGroupTime = xmlToGroupTime(ch);
            ret.groupTime = dataGroupTime;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "number") {
            var dataNumber = getNumber(ch2, true);
            ret.number = dataNumber;
            foundNumber_ = true;
        }
        if (ch2.name === "type") {
            var dataType = getStartStop(ch2, null);
            ret.type = dataType;
        }
    }
    if (!foundNumber_) {
        ret.number = 1;
    }
    return ret;
}
function xmlToGroupName(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundJustify = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
    }
    var ch3 = node;
    var dataName = getString(ch3, true);
    ret.name = dataName;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    return ret;
}
function xmlToGroupAbbreviation(node) {
    var ret = {};
    var foundFontWeight = false;
    var foundFontStyle = false;
    var foundColor = false;
    var foundJustify = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "font-family") {
            var dataFontFamily = getString(ch2, true);
            ret.fontFamily = dataFontFamily;
        }
        if (ch2.name === "font-weight") {
            var dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
            ret.fontWeight = dataFontWeight;
            foundFontWeight = true;
        }
        if (ch2.name === "font-style") {
            var dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
            ret.fontStyle = dataFontStyle;
            foundFontStyle = true;
        }
        if (ch2.name === "font-size") {
            var dataFontSize = getString(ch2, true);
            ret.fontSize = dataFontSize;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
        if (ch2.name === "justify") {
            var dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
            ret.justify = dataJustify;
            foundJustify = true;
        }
    }
    var ch3 = node;
    var dataText = getString(ch3, true);
    ret.text = dataText;
    if (!foundFontWeight) {
        ret.fontWeight = NormalBold.Normal;
    }
    if (!foundFontStyle) {
        ret.fontStyle = NormalItalic.Normal;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    if (!foundJustify) {
        ret.justify = LeftCenterRight.Left;
    }
    return ret;
}
function xmlToGroupSymbol(node) {
    var ret = {};
    var foundData = false;
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "default-x") {
            var dataDefaultX = getNumber(ch2, true);
            ret.defaultX = dataDefaultX;
        }
        if (ch2.name === "relative-y") {
            var dataRelativeY = getNumber(ch2, true);
            ret.relativeY = dataRelativeY;
        }
        if (ch2.name === "default-y") {
            var dataDefaultY = getNumber(ch2, true);
            ret.defaultY = dataDefaultY;
        }
        if (ch2.name === "relative-x") {
            var dataRelativeX = getNumber(ch2, true);
            ret.relativeX = dataRelativeX;
        }
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getPartSymbolType(ch3, PartSymbolType.None);
    ret.data = dataData;
    if (!foundData) {
        ret.data = PartSymbolType.None;
    }
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToGroupBarline(node) {
    var ret = {};
    var foundColor = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "color") {
            var dataColor = getString(ch2, true);
            ret.color = dataColor;
            foundColor = true;
        }
    }
    var ch3 = node;
    var dataData = getString(ch3, true);
    ret.data = dataData;
    if (!foundColor) {
        ret.color = "#000000";
    }
    return ret;
}
function xmlToGroupTime(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToScoreInstrument(node) {
    var ret = {
        instrumentName: "",
        instrumentSound: "",
        ensemble: "",
        virtualInstrument: null,
        instrumentAbbreviation: "",
        solo: null,
        id: ""
    };
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "instrument-name") {
            var dataInstrumentName = getString(ch, true);
            ret.instrumentName = dataInstrumentName;
        }
        if (ch.nodeName === "instrument-sound") {
            var dataInstrumentSound = getString(ch, true);
            ret.instrumentSound = dataInstrumentSound;
        }
        if (ch.nodeName === "ensemble") {
            var dataEnsemble = getString(ch, true);
            ret.ensemble = dataEnsemble;
        }
        if (ch.nodeName === "virtual-instrument") {
            var dataVirtualInstrument = xmlToVirtualInstrument(ch);
            ret.virtualInstrument = dataVirtualInstrument;
        }
        if (ch.nodeName === "instrument-abbreviation") {
            var dataInstrumentAbbreviation = getString(ch, true);
            ret.instrumentAbbreviation = dataInstrumentAbbreviation;
        }
        if (ch.nodeName === "solo") {
            var dataSolo = xmlToSolo(ch);
            ret.solo = dataSolo;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "id") {
            var dataId = getString(ch2, true);
            ret.id = dataId;
        }
    }
    return ret;
}
function xmlToSolo(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToVirtualInstrument(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "virtual-library") {
            var dataVirtualLibrary = getString(ch, true);
            ret.virtualLibrary = dataVirtualLibrary;
        }
        if (ch.nodeName === "virtual-name") {
            var dataVirtualName = getString(ch, true);
            ret.virtualName = dataVirtualName;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToScoreHeader(node) {
    var ret = {};
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "movement-title") {
            var dataMovementTitle = getString(ch, true);
            ret.movementTitle = dataMovementTitle;
        }
        if (ch.nodeName === "identification") {
            var dataIdentification = xmlToIdentification(ch);
            ret.identification = dataIdentification;
        }
        if (ch.nodeName === "defaults") {
            var dataDefaults = xmlToDefaults(ch);
            ret.defaults = dataDefaults;
        }
        if (ch.nodeName === "work") {
            var dataWork = xmlToWork(ch);
            ret.work = dataWork;
        }
        if (ch.nodeName === "credit") {
            var dataCredits = xmlToCredit(ch);
            ret.credits = (ret.credits || []).concat(dataCredits);
        }
        if (ch.nodeName === "part-list") {
            var dataPartList = xmlToPartList(ch);
            ret.partList = dataPartList;
        }
        if (ch.nodeName === "movement-number") {
            var dataMovementNumber = getString(ch, true);
            ret.movementNumber = dataMovementNumber;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return ret;
}
function xmlToScoreTimewise(node) {
    var ret = {};
    var foundVersion_ = false;
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "measure") {
            var dataMeasures = xmlToMeasure(ch);
            ret.measures = (ret.measures || []).concat(dataMeasures);
        }
        if (ch.nodeName === "movement-title") {
            var dataMovementTitle = getString(ch, true);
            ret.movementTitle = dataMovementTitle;
        }
        if (ch.nodeName === "identification") {
            var dataIdentification = xmlToIdentification(ch);
            ret.identification = dataIdentification;
        }
        if (ch.nodeName === "defaults") {
            var dataDefaults = xmlToDefaults(ch);
            ret.defaults = dataDefaults;
        }
        if (ch.nodeName === "work") {
            var dataWork = xmlToWork(ch);
            ret.work = dataWork;
        }
        if (ch.nodeName === "credit") {
            var dataCredits = xmlToCredit(ch);
            ret.credits = (ret.credits || []).concat(dataCredits);
        }
        if (ch.nodeName === "part-list") {
            var dataPartList = xmlToPartList(ch);
            ret.partList = dataPartList;
        }
        if (ch.nodeName === "movement-number") {
            var dataMovementNumber = getString(ch, true);
            ret.movementNumber = dataMovementNumber;
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
        if (ch2.name === "version") {
            var dataVersion = getString(ch2, true);
            ret.version = dataVersion;
            foundVersion_ = true;
        }
    }
    if (!foundVersion_) {
        ret.version = "1.0";
    }
    return ret;
}
function xmlToPart(node) {
    var rarr = [];
    for (var i = 0; i < node.childNodes.length; ++i) {
        var ch = node.childNodes[i];
        if (ch.nodeName === "note") {
            var data = xmlToNote(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "backup") {
            var data = xmlToBackup(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "harmony") {
            var data = xmlToHarmony(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "forward") {
            var data = xmlToForward(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "print") {
            var data = xmlToPrint(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "figured-bass") {
            var data = xmlToFiguredBass(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "direction") {
            var data = xmlToDirection(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "attributes") {
            var data = xmlToAttributes(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "sound") {
            var data = xmlToSound(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "barline") {
            var data = xmlToBarline(ch);
            rarr = (rarr || []).concat(data);
        }
        if (ch.nodeName === "grouping") {
            var data = xmlToGrouping(ch);
            rarr = (rarr || []).concat(data);
        }
    }
    for (var i = 0; i < node.attributes.length; ++i) {
        var ch2 = node.attributes[i];
    }
    return rarr;
}
/*---- Serialization ----------------------------------------------------------------------------*/
/**
 * Safe, escaped tagged template handler.
 */
function xml(literals) {
    var vals = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        vals[_i - 1] = arguments[_i];
    }
    var escaped = "";
    for (var i = 0; i < literals.length; ++i) {
        escaped += literals[i];
        if (i < vals.length) {
            escaped += ("" + vals[i])
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/"/g, "&apos;");
        }
    }
    return escaped;
}
/**
 * Safe tagged template handler for YesNo.
 */
function yesNo(literals) {
    var booleans = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        booleans[_i - 1] = arguments[_i];
    }
    var escaped = "";
    for (var i = 0; i < literals.length; ++i) {
        escaped += literals[i];
        if (i < booleans.length) {
            escaped += booleans[i] ? "yes" : "no";
        }
    }
    return escaped;
}
/**
 * Unescaped tagged template literal
 */
function dangerous(literals) {
    var vals = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        vals[_i - 1] = arguments[_i];
    }
    var result = "";
    for (var i = 0; i < literals.length; ++i) {
        result += literals[i];
        if (i < vals.length) {
            result += vals[i];
        }
    }
    return result;
}
function defined(val) {
    return (val !== undefined) && (val !== null) && (val !== "");
}
function scalingToXML(scaling) {
    // <!ELEMENT scaling (millimeters, tenths)>
    var children = [];
    if (defined(scaling.millimeters)) {
        children.push(millimetersToXML(scaling.millimeters));
    }
    if (defined(scaling.tenths)) {
        children.push(tenthsToXML(scaling.tenths));
    }
    return (_a = ["<scaling>\n", "\n</scaling>"], _a.raw = ["<scaling>\\n", "\\n</scaling>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function millimetersToXML(mm) {
    return (_a = ["<millimeters>", "</millimeters>"], _a.raw = ["<millimeters>", "</millimeters>"], xml(_a, mm));
    var _a;
}
function tenthsToXML(tenths) {
    return (_a = ["<tenths>", "</tenths>"], _a.raw = ["<tenths>", "</tenths>"], xml(_a, tenths));
    var _a;
}
function pageLayoutToXML(pageLayout) {
    // <!ELEMENT page-layout ((page-height, page-width)?,
    //     (page-margins, page-margins?)?)>
    // <!ELEMENT page-height %layout-tenths;>
    // <!ELEMENT page-width %layout-tenths;>
    var children = [];
    if (defined(pageLayout.pageHeight)) {
        children.push((_a = ["<page-height>", "</page-height>"], _a.raw = ["<page-height>", "</page-height>"], xml(_a, pageLayout.pageHeight)));
    }
    if (defined(pageLayout.pageWidth)) {
        children.push((_b = ["<page-width>", "</page-width>"], _b.raw = ["<page-width>", "</page-width>"], xml(_b, pageLayout.pageWidth)));
    }
    (pageLayout.pageMargins || []).forEach(function (pageMargins) {
        children.push(pageMarginsToXML(pageMargins));
    });
    return (_c = ["<page-layout>\n", "\n</page-layout>"], _c.raw = ["<page-layout>\\n", "\\n</page-layout>"], dangerous(_c, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
var oddEvenBothToXML = {
    2: "both",
    1: "even",
    0: "odd"
};
function pageMarginsToXML(pageMargins) {
    // <!ELEMENT page-margins (left-margin, right-margin,
    //     top-margin, bottom-margin)>
    // <!ATTLIST page-margins
    //     type (odd | even | both) #IMPLIED
    // >
    var children = [];
    children = children.concat(hmarginsToXML(pageMargins));
    children = children.concat(vmarginsToXML(pageMargins));
    var attribs = "";
    if (defined(pageMargins.type)) {
        attribs += (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, oddEvenBothToXML[pageMargins.type]));
    }
    return (_b = ["<page-margins", ">\n", "\n</page-margins>"], _b.raw = ["<page-margins", ">\\n", "\\n</page-margins>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function hmarginsToXML(hmargins) {
    // <!ELEMENT left-margin %layout-tenths;>
    // <!ELEMENT right-margin %layout-tenths;>
    var children = [];
    if (defined(hmargins.leftMargin)) {
        children.push((_a = ["<left-margin>", "</left-margin>"], _a.raw = ["<left-margin>", "</left-margin>"], xml(_a, hmargins.leftMargin)));
    }
    if (defined(hmargins.rightMargin)) {
        children.push((_b = ["<right-margin>", "</right-margin>"], _b.raw = ["<right-margin>", "</right-margin>"], xml(_b, hmargins.rightMargin)));
    }
    return children;
    var _a, _b;
}
function vmarginsToXML(hmargins) {
    // <!ELEMENT top-margin %layout-tenths;>
    // <!ELEMENT bottom-margin %layout-tenths;>
    var children = [];
    if (defined(hmargins.topMargin)) {
        children.push((_a = ["<top-margin>", "</top-margin>"], _a.raw = ["<top-margin>", "</top-margin>"], xml(_a, hmargins.topMargin)));
    }
    if (defined(hmargins.bottomMargin)) {
        children.push((_b = ["<bottom-margin>", "</bottom-margin>"], _b.raw = ["<bottom-margin>", "</bottom-margin>"], xml(_b, hmargins.bottomMargin)));
    }
    return children;
    var _a, _b;
}
function systemLayoutToXML(systemLayout) {
    // <!ELEMENT system-layout
    //     (system-margins?, system-distance?,
    //      top-system-distance?, system-dividers?)>
    var children = [];
    if (defined(systemLayout.systemMargins)) {
        children.push(systemMarginsToXML(systemLayout.systemMargins));
    }
    if (defined(systemLayout.systemDistance)) {
        children.push((_a = ["<system-distance>", "</system-distance>"], _a.raw = ["<system-distance>", "</system-distance>"], xml(_a, systemLayout.systemDistance)));
    }
    if (defined(systemLayout.topSystemDistance)) {
        children.push((_b = ["<top-system-distance>", "</top-system-distance>"], _b.raw = ["<top-system-distance>", "</top-system-distance>"], xml(_b, systemLayout.topSystemDistance)));
    }
    if (defined(systemLayout.systemDividers)) {
        children.push(systemDividersToXML(systemLayout.systemDividers));
    }
    return (_c = ["<system-layout>\n", "\n</system-layout>"], _c.raw = ["<system-layout>\\n", "\\n</system-layout>"], dangerous(_c, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
function systemMarginsToXML(systemMargins) {
    // <!ELEMENT system-margins (left-margin, right-margin)>
    var children = hmarginsToXML(systemMargins);
    return (_a = ["<system-margins>\n", "\n</system-margins>"], _a.raw = ["<system-margins>\\n", "\\n</system-margins>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function systemDividersToXML(systemDividers) {
    // <!ELEMENT system-dividers (left-divider, right-divider)>
    // <!ELEMENT left-divider EMPTY>
    // <!ATTLIST left-divider
    //     %print-object;
    //     %print-style-align;
    // >
    // <!ELEMENT right-divider EMPTY>
    // <!ATTLIST right-divider
    //     %print-object;
    //     %print-style-align;
    // >
    var children = [];
    if (defined(systemDividers.leftDivider)) {
        children.push((_a = ["<left-divider", " />"], _a.raw = ["<left-divider", " />"], xml(_a, printObjectToXML(systemDividers.leftDivider) +
            printStyleAlignToXML(systemDividers.leftDivider))));
    }
    if (defined(systemDividers.rightDivider)) {
        children.push((_b = ["<right-divider", " />"], _b.raw = ["<right-divider", " />"], xml(_b, printObjectToXML(systemDividers.rightDivider) +
            printStyleAlignToXML(systemDividers.rightDivider))));
    }
    return (_c = ["<system-dividers>\n", "\n</system-dividers>"], _c.raw = ["<system-dividers>\\n", "\\n</system-dividers>"], dangerous(_c, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
function appearanceToXML(appearance) {
    // <!ELEMENT appearance
    //     (line-width*, note-size*, distance*,
    //      other-appearance*)>
    var children = [];
    Object.keys(appearance.lineWidths || {}).forEach(function (key) {
        children.push(lineWidthToXML(appearance.lineWidths[key]));
    });
    Object.keys(appearance.noteSizes || {}).forEach(function (key) {
        children.push(noteSizeToXML(appearance.noteSizes[key]));
    });
    Object.keys(appearance.distances || {}).forEach(function (key) {
        children.push(distanceToXML(appearance.distances[key]));
    });
    // TODO: fix musicxml-interfaces
    // appearance.otherAppearances.forEach(otherAppearance => {
    //     children.push(otherAppearanceToXML(otherAppearance));
    // });
    return (_a = ["<appearance>\n", "\n</appearance>"], _a.raw = ["<appearance>\\n", "\\n</appearance>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function lineWidthToXML(lineWidth) {
    // <!ELEMENT line-width %layout-tenths;>
    // <!ATTLIST line-width
    //     type CDATA #REQUIRED
    // >
    return (_a = ["<line-width type=\"", "\">", "</line-width>"], _a.raw = ["<line-width type=\"", "\">", "</line-width>"], xml(_a, lineWidth.type, lineWidth.tenths));
    var _a;
}
var cueGraceLargeToXML = {
    1: "grace",
    0: "cue",
    2: "large"
};
function noteSizeToXML(noteSize) {
    // <!ELEMENT note-size (#PCDATA)>
    // <!ATTLIST note-size
    //     type (cue | grace | large) #REQUIRED
    // >
    return (_a = ["<note-size type=\"", "\">", "</note-size>"], _a.raw = ["<note-size type=\"", "\">", "</note-size>"], xml(_a, cueGraceLargeToXML[noteSize.type], noteSize.size));
    var _a;
}
function distanceToXML(distance) {
    // <!ELEMENT distance %layout-tenths;>
    // <!ATTLIST distance
    //     type CDATA #REQUIRED
    // >
    return (_a = ["<distance type=\"", "\">", "</distance>"], _a.raw = ["<distance type=\"", "\">", "</distance>"], xml(_a, distance.type, distance.tenths));
    var _a;
}
function workToXML(work) {
    // <!ELEMENT work (work-number?, work-title?, opus?)>
    if (!work || (!work.workNumber && !work.workTitle)) {
        return (_a = ["<!-- no work metadata -->"], _a.raw = ["<!-- no work metadata -->"], xml(_a));
    }
    var children = [];
    if (defined(work.workNumber)) {
        // <!ELEMENT work-number (#PCDATA)>
        children.push((_b = ["<work-number>", "</work-number>"], _b.raw = ["<work-number>", "</work-number>"], xml(_b, work.workNumber)));
    }
    if (defined(work.workTitle)) {
        // <!ELEMENT work-title (#PCDATA)>
        children.push((_c = ["<work-title>", "</work-title>"], _c.raw = ["<work-title>", "</work-title>"], xml(_c, work.workTitle)));
    }
    if (defined(work.opus) && !!work.opus) {
        // <!ELEMENT opus EMPTY>
        // <!ATTLIST opus
        //     %link-attributes;
        //     >
        console.warn("link-attributes in <opus /> aren't implemented."); // TODO: IMPLEMENT link-attributes
        children.push((_d = ["<opus />"], _d.raw = ["<opus />"], dangerous(_d)));
    }
    return (_e = ["<work>\n", "\n</work>"], _e.raw = ["<work>\\n", "\\n</work>"], dangerous(_e, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e;
}
function movementNumberToXML(movementNumber) {
    // <!ELEMENT movement-number (#PCDATA)>
    if (!movementNumber) {
        return (_a = ["<!-- no movement-number metadata -->"], _a.raw = ["<!-- no movement-number metadata -->"], xml(_a));
    }
    return (_b = ["<movement-number>", "</movement-number>"], _b.raw = ["<movement-number>", "</movement-number>"], xml(_b, movementNumber));
    var _a, _b;
}
function movementTitleToXML(movementTitle) {
    // <!ELEMENT movement-title (#PCDATA)>
    if (!movementTitle) {
        return (_a = ["<!-- no movement-title metadata -->"], _a.raw = ["<!-- no movement-title metadata -->"], xml(_a));
    }
    return (_b = ["<movement-title>", "</movement-title>"], _b.raw = ["<movement-title>", "</movement-title>"], xml(_b, movementTitle));
    var _a, _b;
}
function identificationToXML(identification) {
    // <!ELEMENT identification (creator*, rights*, encoding?,
    //     source?, relation*, miscellaneous?)>
    var children = [];
    (identification.creators || []).forEach(function (creator) {
        children.push(creatorToXML(creator));
    });
    (identification.rights || []).forEach(function (rights) {
        children.push(rightsToXML(rights));
    });
    if (defined(identification.encoding)) {
        children.push(encodingToXML(identification.encoding));
    }
    if (defined(identification.source) && !!identification.source) {
        children.push(sourceToXML(identification.source));
    }
    (identification.relations || []).forEach(function (relation) {
        children.push(relationToXML(relation));
    });
    if (defined(identification.miscellaneous)) {
        children.push(miscellaneousToXML(identification.miscellaneous));
    }
    return (_a = ["<identification>\n", "\n</identification>"], _a.raw = ["<identification>\\n", "\\n</identification>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function creatorToXML(creator) {
    // <!ELEMENT creator (#PCDATA)>
    // <!ATTLIST creator
    //     type CDATA #IMPLIED
    // >
    var attribs = "";
    if (creator.type) {
        attribs += (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, creator.type));
    }
    var pcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, creator.creator));
    return (_c = ["<creator", ">", "</creator>"], _c.raw = ["<creator", ">", "</creator>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function rightsToXML(rights) {
    // <!ELEMENT rights (#PCDATA)>
    // <!ATTLIST rights
    //     type CDATA #IMPLIED
    // >
    var attribs = "";
    if (rights.type) {
        attribs += (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, rights.type));
    }
    var pcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, rights.rights));
    return (_c = ["<rights", ">", "</rights>"], _c.raw = ["<rights", ">", "</rights>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function encodingToXML(encoding) {
    // <!ELEMENT encoding ((encoding-date | encoder | software |
    //     encoding-description | supports)*)>
    var children = [];
    if (defined(encoding.encodingDate)) {
        children.push(encodingDateToXML(encoding.encodingDate));
    }
    (encoding.encoders || []).forEach(function (encoder) {
        children.push(encoderToXML(encoder));
    });
    (encoding.softwares || []).forEach(function (software) {
        children.push(softwareToXML(software));
    });
    (encoding.encodingDescriptions || []).forEach(function (encodingDescription) {
        children.push(encodingDescriptionToXML(encodingDescription));
    });
    Object.keys(encoding.supports || {}).forEach(function (key) {
        children.push(supportsToXML(encoding.supports[key]));
    });
    return (_a = ["<encoding>\n", "\n</encoding>"], _a.raw = ["<encoding>\\n", "\\n</encoding>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function encodingDateToXML(encodingDate) {
    // <!ELEMENT encoding-date %yyyy-mm-dd;>
    return (_a = ["<encoding-date>", "-", "-", "</encoding-date>"], _a.raw = ["<encoding-date>", "-", "-", "</encoding-date>"], xml(_a, ("0000" + encodingDate.year).slice(-4), ("00" + encodingDate.month).slice(-2), ("00" + encodingDate.day).slice(-2)));
    var _a;
}
function encoderToXML(encoder) {
    // <!ELEMENT encoder (#PCDATA)>
    // <!ATTLIST encoder
    //     type CDATA #IMPLIED
    // >
    var attribs = "";
    if (defined(encoder.type)) {
        attribs = (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, encoder.type));
    }
    var pcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, encoder.encoder));
    return (_c = ["<encoder", ">", "</encoder>"], _c.raw = ["<encoder", ">", "</encoder>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function softwareToXML(software) {
    // <!ELEMENT software (#PCDATA)>
    return (_a = ["<software>", "</software>"], _a.raw = ["<software>", "</software>"], xml(_a, software));
    var _a;
}
function encodingDescriptionToXML(encodingDescription) {
    // <!ELEMENT encoding-description (#PCDATA)>
    return (_a = ["<encoding-description>", "</encoding-description>"], _a.raw = ["<encoding-description>", "</encoding-description>"], xml(_a, encodingDescription));
    var _a;
}
function supportsToXML(supports) {
    // <!ELEMENT supports EMPTY>
    // <!ATTLIST supports
    //     type %yes-no; #REQUIRED
    //     element CDATA #REQUIRED
    //     attribute CDATA #IMPLIED
    //     value CDATA #IMPLIED
    var attribs = "";
    if (defined(supports.type)) {
        attribs += (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], yesNo(_a, supports.type));
    }
    if (defined(supports.element)) {
        attribs += (_b = [" element=\"", "\""], _b.raw = [" element=\"", "\""], xml(_b, supports.element));
    }
    if (defined(supports.attribute)) {
        attribs += (_c = [" attribute=\"", "\""], _c.raw = [" attribute=\"", "\""], xml(_c, supports.attribute));
    }
    if (defined(supports.value)) {
        attribs += (_d = [" value=\"", "\""], _d.raw = [" value=\"", "\""], xml(_d, supports.value));
    }
    return (_e = ["<supports", " />"], _e.raw = ["<supports", " />"], dangerous(_e, attribs));
    var _a, _b, _c, _d, _e;
}
function sourceToXML(source) {
    // <!ELEMENT source (#PCDATA)>
    return (_a = ["<source>", "</source>"], _a.raw = ["<source>", "</source>"], xml(_a, source));
    var _a;
}
function relationToXML(relation) {
    // <!ELEMENT relation (#PCDATA)>
    // <!ATTLIST relation
    //     type CDATA #IMPLIED
    // >
    var attribs = "";
    if (relation.type) {
        attribs += (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, relation.type));
    }
    var pcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, relation.data));
    return (_c = ["<relation", ">", "</relation>"], _c.raw = ["<relation", ">", "</relation>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function miscellaneousToXML(miscellaneous) {
    // <!ELEMENT miscellaneous (miscellaneous-field*)>
    var children = miscellaneous.miscellaneousFields.map(function (field) { return miscellaneousFieldToXML(field); });
    return (_a = ["<miscellaneous>\n", "\n</miscellaneous>"], _a.raw = ["<miscellaneous>\\n", "\\n</miscellaneous>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function miscellaneousFieldToXML(field) {
    // <!ELEMENT miscellaneous-field (#PCDATA)>
    // <!ATTLIST miscellaneous-field
    //     name CDATA #REQUIRED
    // >
    return (_a = ["<miscellaneous-field name=\"", "\">", "</miscellaneous-field>"], _a.raw = ["<miscellaneous-field name=\"", "\">", "</miscellaneous-field>"], xml(_a, field.name, field.data || ""));
    var _a;
}
function defaultsToXML(defaults) {
    // <!ELEMENT defaults (scaling?, page-layout?,
    //     system-layout?, staff-layout*, appearance?,
    //     music-font?, word-font?, lyric-font*, lyric-language*)>
    var children = [];
    if (defined(defaults.scaling)) {
        children.push(scalingToXML(defaults.scaling));
    }
    if (defined(defaults.pageLayout)) {
        children.push(pageLayoutToXML(defaults.pageLayout));
    }
    if (defined(defaults.systemLayout)) {
        children.push(systemLayoutToXML(defaults.systemLayout));
    }
    if (defined(defaults.appearance)) {
        children.push(appearanceToXML(defaults.appearance));
    }
    if (defined(defaults.musicFont)) {
        children.push(musicFontToXML(defaults.musicFont));
    }
    if (defined(defaults.wordFont)) {
        children.push(wordFontToXML(defaults.wordFont));
    }
    (defaults.lyricFonts || []).forEach(function (lyricFont) {
        children.push(lyricFontToXML(lyricFont));
    });
    (defaults.lyricLanguages || []).forEach(function (lyricLanguage) {
        children.push(lyricLanguageToXML(lyricLanguage));
    });
    return (_a = ["<defaults>\n", "\n</defaults>"], _a.raw = ["<defaults>\\n", "\\n</defaults>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function musicFontToXML(musicFont) {
    // <!ELEMENT music-font EMPTY>
    // <!ATTLIST music-font
    //     %font;
    // >
    return (_a = ["<music-font", " />"], _a.raw = ["<music-font", " />"], dangerous(_a, fontToXML(musicFont)));
    var _a;
}
function wordFontToXML(wordFont) {
    // <!ELEMENT word-font EMPTY>
    // <!ATTLIST word-font
    //     %font;
    // >
    return (_a = ["<word-font", " />"], _a.raw = ["<word-font", " />"], dangerous(_a, fontToXML(wordFont)));
    var _a;
}
function lyricFontToXML(lyricFont) {
    // <!ELEMENT lyric-font EMPTY>
    // <!ATTLIST lyric-font
    //     number NMTOKEN #IMPLIED
    //     name CDATA #IMPLIED
    //     %font;
    // >
    return (_a = ["<lyric-font", " />"], _a.raw = ["<lyric-font", " />"], dangerous(_a, numberLevelToXML(lyricFont) +
        nameToXML(lyricFont) +
        fontToXML(lyricFont)));
    var _a;
}
function lyricLanguageToXML(lyricLanguage) {
    // <!ELEMENT lyric-language EMPTY>
    // <!ATTLIST lyric-language
    //     number NMTOKEN #IMPLIED
    //     name CDATA #IMPLIED
    //     xml:lang NMTOKEN #REQUIRED TODO musicxml-interfaces
    // >
    return (_a = ["<lyric-language", " />"], _a.raw = ["<lyric-language", " />"], dangerous(_a, numberLevelToXML(lyricLanguage) +
        nameToXML(lyricLanguage)));
    var _a;
}
function creditToXML(credit) {
    // <!ELEMENT credit
    //     (credit-type*, link*, bookmark*,
    //     (credit-image |
    //      (credit-words, (link*, bookmark*, credit-words)*)))>
    // <!ATTLIST credit
    //     page NMTOKEN #IMPLIED
    // >
    var attributes = "";
    var children = [];
    (credit.creditTypes || []).forEach(function (creditType) {
        children.push(creditTypeToXML(creditType));
    });
    // credit.links.forEach(link => { // TODO: missing in musicxml-interfaces
    //     children.push(linkToXML(link));
    // });
    // credit.bookmarks.forEach(bookmark => { // TODO: missing in musicxml-interfaces
    //     children.push(bookmarkToXML(bookmark));
    // });
    if (defined(credit.creditImage)) {
        children.push(creditImageToXML(credit.creditImage));
    }
    (credit.creditWords || []).forEach(function (words) {
        children.push(creditWordsToXML(words));
    });
    if (defined(credit.page)) {
        attributes += (_a = [" page=\"", "\""], _a.raw = [" page=\"", "\""], xml(_a, credit.page));
    }
    return (_b = ["<credit", ">\n", "\n</credit>"], _b.raw = ["<credit", ">\\n", "\\n</credit>"], dangerous(_b, attributes, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function creditTypeToXML(creditType) {
    // <!ELEMENT credit-type (#PCDATA)>
    return (_a = ["<credit-type>", "</credit-type>"], _a.raw = ["<credit-type>", "</credit-type>"], xml(_a, creditType));
    var _a;
}
function creditWordsToXML(creditWords) {
    // <!ELEMENT credit-words (#PCDATA)>
    // <!ATTLIST credit-words
    //     %text-formatting;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, creditWords.words));
    return (_b = ["<credit-words", ">", "</credit-words>"], _b.raw = ["<credit-words", ">", "</credit-words>"], dangerous(_b, textFormattingToXML(creditWords), pcdata));
    var _a, _b;
}
function creditImageToXML(creditImage) {
    // <!ELEMENT credit-image EMPTY>
    // <!ATTLIST credit-image
    //     source CDATA #REQUIRED
    //     type CDATA #REQUIRED
    //     %position;
    //     %halign;
    //     %valign-image;
    // >
    var attribs = "";
    if (defined(creditImage.source)) {
        attribs += (_a = [" credit-image=\"", "\""], _a.raw = [" credit-image=\"", "\""], xml(_a, creditImage.source));
    }
    if (defined(creditImage.type)) {
        attribs += (_b = [" type=\"", "\""], _b.raw = [" type=\"", "\""], xml(_b, creditImage.type));
    }
    attribs += positionToXML(creditImage) +
        halignToXML(creditImage) +
        valignImageToXML(creditImage);
    return (_c = ["<credit-image", " />"], _c.raw = ["<credit-image", " />"], dangerous(_c, attribs));
    var _a, _b, _c;
}
var topMiddleBottomBaselineToXML = {
    0: "top",
    1: "middle",
    3: "baseline",
    2: "bottom"
};
function valignImageToXML(valignImage) {
    // <!ENTITY % valign-image
    //     "valign (top | middle | bottom) #IMPLIED">
    if (defined(valignImage.valignImage)) {
        return (_a = [" valign=\"", "\""], _a.raw = [" valign=\"", "\""], xml(_a, topMiddleBottomBaselineToXML[valignImage.valignImage]));
    }
    return "";
    var _a;
}
function partListToXML(partList) {
    // <!ELEMENT part-list (part-group*, score-part,
    //     (part-group | score-part)*)>
    var children = [];
    partList.forEach(function (partGroupOrScorePart) {
        if (partGroupOrScorePart._class === 'PartGroup') {
            children.push(partGroupToXML(partGroupOrScorePart));
        }
        else if (partGroupOrScorePart._class === 'ScorePart') {
            children.push(scorePartToXML(partGroupOrScorePart));
        }
        else {
            console.warn("Unknwn type for", partGroupOrScorePart);
        }
    });
    return (_a = ["<part-list>\n", "\n</part-list>"], _a.raw = ["<part-list>\\n", "\\n</part-list>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function scorePartToXML(scorePart) {
    // <!ELEMENT score-part (identification?,
    //     part-name, part-name-display?,
    //     part-abbreviation?, part-abbreviation-display?,
    //     group*, score-instrument*,
    //     (midi-device?, midi-instrument?)*)>
    // <!ATTLIST score-part
    //     id ID #REQUIRED
    // >
    var children = [];
    var attribs = "";
    if (defined(scorePart.identification)) {
        children.push(identificationToXML(scorePart.identification));
    }
    if (defined(scorePart.partName)) {
        children.push(partNameToXML(scorePart.partName));
    }
    if (defined(scorePart.partNameDisplay)) {
        children.push(partNameDisplayToXML(scorePart.partNameDisplay));
    }
    if (defined(scorePart.partAbbreviation)) {
        children.push(partAbbreviationToXML(scorePart.partAbbreviation));
    }
    if (defined(scorePart.partAbbreviationDisplay)) {
        children.push(partAbbreviationDisplayToXML(scorePart.partAbbreviationDisplay));
    }
    (scorePart.groups || []).forEach(function (group) {
        children.push((_a = ["<group>", "</group>"], _a.raw = ["<group>", "</group>"], xml(_a, group)));
        var _a;
    });
    (scorePart.scoreInstruments || []).forEach(function (scoreInstrument) {
        children.push(scoreInstrumentToXML(scoreInstrument));
    });
    // Is it okay if there are different numbers of devices and instruments?
    (scorePart.midiDevices || []).forEach(function (device, idx) {
        children.push(midiDeviceToXML(device));
        if (scorePart.midiInstruments[idx]) {
            children.push(midiInstrumentToXML(scorePart.midiInstruments[idx]));
        }
    });
    (scorePart.midiInstruments || []).forEach(function (midiInstrument) {
        children.push(midiInstrumentToXML(midiInstrument));
    });
    if (defined(scorePart.id)) {
        attribs += (_a = [" id=\"", "\""], _a.raw = [" id=\"", "\""], xml(_a, scorePart.id));
    }
    return (_b = ["<score-part", ">\n", "\n</score-part>"], _b.raw = ["<score-part", ">\\n", "\\n</score-part>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function partNameToXML(partName) {
    // <!ELEMENT part-name (#PCDATA)>
    // <!ATTLIST part-name
    //     %print-style;
    //     %print-object;
    //     %justify;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, partName.partName));
    return (_b = ["<part-name", ">", "</part-name>"], _b.raw = ["<part-name", ">", "</part-name>"], dangerous(_b, printStyleToXML(partName) +
        printObjectToXML(partName) +
        justifyToXML(partName), pcdata));
    var _a, _b;
}
function partNameDisplayToXML(partNameDisplay) {
    // <!ELEMENT part-name-display
    //     ((display-text | accidental-text)*)>
    // <!ATTLIST part-name-display
    //     %print-object;
    // >
    return (_a = ["<part-name-display", ">\n", "</part-name-display>"], _a.raw = ["<part-name-display", ">\\n", "</part-name-display>"], dangerous(_a, printObjectToXML(partNameDisplay), textArrayToXML(partNameDisplay.name).join("\n")
        .split("\n").map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function partAbbreviationToXML(abbreviation) {
    // <!ELEMENT part-abbreviation (#PCDATA)>
    // <!ATTLIST part-abbreviation
    //     %print-style;
    //     %print-object;
    //     %justify;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, abbreviation.abbreviation));
    return (_b = ["<part-abbreviation", ">", "</part-abbreviation>"], _b.raw = ["<part-abbreviation", ">", "</part-abbreviation>"], dangerous(_b, printStyleToXML(abbreviation) +
        printObjectToXML(abbreviation) +
        justifyToXML(abbreviation), pcdata));
    var _a, _b;
}
function partAbbreviationDisplayToXML(partAbbreviationDisplay) {
    // <!ELEMENT part-abbreviation-display
    //     ((display-text | accidental-text)*)>
    // <!ATTLIST part-abbreviation-display
    //     %print-object;
    // >
    return (_a = ["<part-abbreviation-display", ">", "</part-abbreviation-display>"], _a.raw = ["<part-abbreviation-display", ">", "</part-abbreviation-display>"], dangerous(_a, printObjectToXML(partAbbreviationDisplay), textArrayToXML(partAbbreviationDisplay.name).join("\n")
        .split("\n").map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function textArrayToXML(texts) {
    return texts.map(function (text) {
        if (text.acc) {
            return (_a = ["<accidental-text", ""], _a.raw = ["<accidental-text", ""], dangerous(_a, textFormattingToXML(text.acc))) +
                (_b = [">", "</accidental-text>"], _b.raw = [">", "</accidental-text>"], xml(_b, text.acc.text));
        }
        else if (text.text) {
            return (_c = ["<display-text", ""], _c.raw = ["<display-text", ""], dangerous(_c, textFormattingToXML(text.text))) +
                (_d = [">", "</display-text>"], _d.raw = [">", "</display-text>"], xml(_d, text.text.text));
        }
        else {
            throw "Unknown type " + text;
        }
        var _a, _b, _c, _d;
    });
}
function midiDeviceToXML(midiDevice) {
    // <!ELEMENT midi-device (#PCDATA)>
    // <!ATTLIST midi-device
    //     port CDATA #IMPLIED
    //     id IDREF #IMPLIED
    // >
    var attribs = "";
    if (defined(midiDevice.port)) {
        attribs += (_a = [" port=\"", "\""], _a.raw = [" port=\"", "\""], xml(_a, midiDevice.port));
    }
    if (defined(midiDevice.id)) {
        attribs += (_b = [" id=\"", "\""], _b.raw = [" id=\"", "\""], xml(_b, midiDevice.id));
    }
    var pcdata = (_c = ["", ""], _c.raw = ["", ""], xml(_c, midiDevice.deviceName || ""));
    return (_d = ["<midi-device", ">", "</midi-device>"], _d.raw = ["<midi-device", ">", "</midi-device>"], dangerous(_d, attribs, pcdata));
    var _a, _b, _c, _d;
}
function midiInstrumentToXML(midiInstrument) {
    // <!ELEMENT midi-instrument
    //     (midi-channel?, midi-name?, midi-bank?, midi-program?,
    //      midi-unpitched?, volume?, pan?, elevation?)>
    // <!ATTLIST midi-instrument
    //     id IDREF #REQUIRED
    // >
    var children = [];
    var attribs = "";
    if (defined(midiInstrument.midiChannel)) {
        // <!ELEMENT midi-channel (#PCDATA)>
        children.push((_a = ["<midi-channel>", "</midi-channel>"], _a.raw = ["<midi-channel>", "</midi-channel>"], xml(_a, midiInstrument.midiChannel)));
    }
    if (defined(midiInstrument.midiName)) {
        // <!ELEMENT midi-name (#PCDATA)>
        children.push((_b = ["<midi-name>", "</midi-name>"], _b.raw = ["<midi-name>", "</midi-name>"], xml(_b, midiInstrument.midiName)));
    }
    if (defined(midiInstrument.midiBank)) {
        // <!ELEMENT midi-bank (#PCDATA)>
        children.push((_c = ["<midi-bank>", "</midi-bank>"], _c.raw = ["<midi-bank>", "</midi-bank>"], xml(_c, midiInstrument.midiBank)));
    }
    if (defined(midiInstrument.midiProgram)) {
        // <!ELEMENT midi-program (#PCDATA)>
        children.push((_d = ["<midi-program>", "</midi-program>"], _d.raw = ["<midi-program>", "</midi-program>"], xml(_d, midiInstrument.midiProgram)));
    }
    if (defined(midiInstrument.midiUnpitched)) {
        // <!ELEMENT midi-unpitched (#PCDATA)>
        children.push((_e = ["<midi-unpitched>", "</midi-unpitche>"], _e.raw = ["<midi-unpitched>", "</midi-unpitche>"], xml(_e, midiInstrument.midiUnpitched)));
    }
    if (defined(midiInstrument.volume)) {
        // <!ELEMENT volume (#PCDATA)>
        children.push((_f = ["<volume>", "</volume>"], _f.raw = ["<volume>", "</volume>"], xml(_f, midiInstrument.volume)));
    }
    if (defined(midiInstrument.pan)) {
        // <!ELEMENT pan (#PCDATA)>
        children.push((_g = ["<pan>", "</pan>"], _g.raw = ["<pan>", "</pan>"], xml(_g, midiInstrument.pan)));
    }
    if (defined(midiInstrument.elevation)) {
        // <!ELEMENT elevation (#PCDATA)>
        children.push((_h = ["<elevation>", "</elevation>"], _h.raw = ["<elevation>", "</elevation>"], xml(_h, midiInstrument.elevation)));
    }
    if (defined(midiInstrument.id)) {
        attribs += (_j = [" id=\"", "\""], _j.raw = [" id=\"", "\""], xml(_j, midiInstrument.id));
    }
    return (_k = ["<midi-instrument", ">\n", "\n</midi-instrument>"], _k.raw = ["<midi-instrument", ">\\n", "\\n</midi-instrument>"], dangerous(_k, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
}
function scoreInstrumentToXML(scoreInstrument) {
    // <!ELEMENT score-instrument
    //     (instrument-name, instrument-abbreviation?,
    //      instrument-sound?, (solo | ensemble)?,
    //      virtual-instrument?)>
    // <!ATTLIST score-instrument
    //     id ID #REQUIRED
    // >
    var children = [];
    var attribs = (_a = [" id=\"", "\""], _a.raw = [" id=\"", "\""], xml(_a, scoreInstrument.id));
    if (defined(scoreInstrument.instrumentName)) {
        // <!ELEMENT instrument-name (#PCDATA)>
        children.push((_b = ["<instrument-name>", "</instrument-name>"], _b.raw = ["<instrument-name>", "</instrument-name>"], xml(_b, scoreInstrument.instrumentName)));
    }
    if (defined(scoreInstrument.instrumentAbbreviation)) {
        // <!ELEMENT instrument-abbreviation (#PCDATA)>
        children.push((_c = ["<instrument-abbreviation>", "</instrument-abbreviation>"], _c.raw = ["<instrument-abbreviation>", "</instrument-abbreviation>"], xml(_c, scoreInstrument.instrumentAbbreviation)));
    }
    if (defined(scoreInstrument.instrumentSound)) {
        // <!ELEMENT instrument-sound (#PCDATA)>
        children.push((_d = ["<instrument-sound>", "</instrument-sound>"], _d.raw = ["<instrument-sound>", "</instrument-sound>"], xml(_d, scoreInstrument.instrumentSound)));
    }
    if (scoreInstrument.solo) {
        // <!ELEMENT solo EMPTY>
        children.push((_e = ["<solo />"], _e.raw = ["<solo />"], xml(_e)));
    }
    if (defined(scoreInstrument.ensemble)) {
        // <!ELEMENT ensemble (#PCDATA)>
        children.push((_f = ["<ensemble>", "</ensemble>"], _f.raw = ["<ensemble>", "</ensemble>"], xml(_f, scoreInstrument.ensemble)));
    }
    if (defined(scoreInstrument.virtualInstrument)) {
        // <!ELEMENT virtual-instrument
        //     (virtual-library?, virtual-name?)>
        var vChildren = [];
        var v = scoreInstrument.virtualInstrument;
        if (defined(v.virtualLibrary)) {
            // <!ELEMENT virtual-library (#PCDATA)>
            vChildren.push((_g = ["<virtual-library>", "</virtual-library>"], _g.raw = ["<virtual-library>", "</virtual-library>"], xml(_g, v.virtualLibrary)));
        }
        if (defined(v.virtualName)) {
            // <!ELEMENT virtual-name (#PCDATA)>
            vChildren.push((_h = ["<virtual-name>", "</virtual-name>"], _h.raw = ["<virtual-name>", "</virtual-name>"], xml(_h, v.virtualName)));
        }
        children.push((_j = ["<virtual-instrument>\n", "\n</virtual-instrument>"], _j.raw = ["<virtual-instrument>\\n", "\\n</virtual-instrument>"], dangerous(_j, vChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
    }
    return (_k = ["<score-instrument", ">\n", "\n</score-instrument>"], _k.raw = ["<score-instrument", ">\\n", "\\n</score-instrument>"], dangerous(_k, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
}
function partGroupToXML(partGroup) {
    // <!ELEMENT part-group (group-name?, group-name-display?,
    //     group-abbreviation?, group-abbreviation-display?,
    //     group-symbol?, group-barline?, group-time?, %editorial;)>
    // <!ATTLIST part-group
    //     type %start-stop; #REQUIRED
    //     number CDATA "1"
    // >
    // <!ELEMENT group-time EMPTY>
    var children = [];
    var attribs = "" +
        startStopToXML(partGroup) +
        numberLevelToXML(partGroup);
    if (defined(partGroup.groupName)) {
        children.push(groupNameToXML(partGroup.groupName));
    }
    if (defined(partGroup.groupNameDisplay)) {
        children.push(groupNameDisplayToXML(partGroup.groupNameDisplay));
    }
    if (defined(partGroup.groupAbbreviation)) {
        children.push(groupAbbreviationToXML(partGroup.groupAbbreviation));
    }
    if (defined(partGroup.groupAbbreviationDisplay)) {
        children.push(groupAbbreviationDisplayToXML(partGroup.groupAbbreviationDisplay));
    }
    if (defined(partGroup.groupSymbol)) {
        children.push(groupSymbolToXML(partGroup.groupSymbol));
    }
    if (defined(partGroup.groupBarline)) {
        children.push(groupBarlineToXML(partGroup.groupBarline));
    }
    if (!!partGroup.groupTime) {
        children.push((_a = ["<group-time />"], _a.raw = ["<group-time />"], xml(_a)));
    }
    children = children.concat(editorialToXML(partGroup));
    return (_b = ["<part-group", ">\n", "\n</part-group>"], _b.raw = ["<part-group", ">\\n", "\\n</part-group>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function groupNameToXML(groupName) {
    // <!ELEMENT group-name (#PCDATA)>
    // <!ATTLIST group-name
    //     %print-style;
    //     %justify;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, groupName.name));
    return (_b = ["<group-name", ">", "</group-name>"], _b.raw = ["<group-name", ">", "</group-name>"], dangerous(_b, printStyleToXML(groupName) +
        justifyToXML(groupName), pcdata));
    var _a, _b;
}
function groupNameDisplayToXML(groupNameDisplay) {
    // <!ELEMENT group-name-display
    //     ((display-text | accidental-text)*)>
    // <!ATTLIST group-name-display
    //     %print-object;
    // >
    return ""; // TODO: bug in musicxml-interfaces
    // return dangerous `<group-name-display${
    //     printObjectToXML(groupNameDisplay)}>${
    //         textArrayToXML(groupNameDisplay.name).join("\n")
    //         .split("\n").map(n => "  " + n).join("\n")}</group-name-display>`;
}
function groupAbbreviationToXML(groupAbbreviation) {
    // <!ELEMENT group-abbreviation (#PCDATA)>
    // <!ATTLIST group-abbreviation
    //     %print-style;
    //     %justify;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, groupAbbreviation.text));
    return (_b = ["<group-abbreviation", ">", "</group-abbreviation>"], _b.raw = ["<group-abbreviation", ">", "</group-abbreviation>"], dangerous(_b, printStyleToXML(groupAbbreviation) +
        justifyToXML(groupAbbreviation), pcdata));
    var _a, _b;
}
function groupAbbreviationDisplayToXML(groupAbbreviationDisplay) {
    // <!ELEMENT group-abbreviation-display
    //     ((display-text | accidental-text)*)>
    // <!ATTLIST group-abbreviation-display
    //     %print-object;
    // >
    return ""; // TODO: bug in musicxml-interfaces
    // return dangerous `<group-name-display${
    //     printObjectToXML(groupNameDisplay)}>${
    //         textArrayToXML(groupNameDisplay.name).join("\n")
    //         .split("\n").map(n => "  " + n).join("\n")}</group-name-display>`;
}
function groupSymbolToXML(groupSymbol) {
    // <!ELEMENT group-symbol (#PCDATA)>
    // <!ATTLIST group-symbol
    //     %position;
    //     %color;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, groupSymbol.data));
    return (_b = ["<group-symbol", ">", "</group-symbol>"], _b.raw = ["<group-symbol", ">", "</group-symbol>"], dangerous(_b, positionToXML(groupSymbol) +
        colorToXML(groupSymbol), pcdata));
    var _a, _b;
}
function groupBarlineToXML(groupBarline) {
    // <!ELEMENT group-barline (#PCDATA)>
    // <!ATTLIST group-barline
    //     %color;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, groupBarline.data));
    return (_b = ["<group-barline", ">", "</group-barline>"], _b.raw = ["<group-barline", ">", "</group-barline>"], dangerous(_b, colorToXML(groupBarline), pcdata));
    var _a, _b;
}
function scoreHeaderToXML(header) {
    // <!ENTITY % score-header
    // "(work?, movement-number?, movement-title?,
    // identification?, defaults?, credit*, part-list)">
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(header));
    if (defined(header.work)) {
        children.push(workToXML(header.work));
    }
    if (defined(header.movementNumber)) {
        children.push(movementNumberToXML(header.movementNumber));
    }
    if (defined(header.movementTitle)) {
        children.push(movementTitleToXML(header.movementTitle));
    }
    if (defined(header.identification)) {
        children.push(identificationToXML(header.identification));
    }
    if (defined(header.defaults)) {
        children.push(defaultsToXML(header.defaults));
    }
    (header.credits || []).forEach(function (credit) {
        children.push(creditToXML(credit));
    });
    if (defined(header.partList)) {
        children.push(partListToXML(header.partList));
    }
    return children;
}
function backupToXML(backup) {
    // <!ELEMENT backup (duration, %editorial;)>
    var children = [];
    children.push((_a = ["<duration>", "</duration>"], _a.raw = ["<duration>", "</duration>"], xml(_a, backup.duration)));
    children = children.concat(editorialToXML(backup));
    return (_b = ["<backup>\n", "\n</backup>"], _b.raw = ["<backup>\\n", "\\n</backup>"], dangerous(_b, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function forwardToXML(forward) {
    // <!ELEMENT forward
    //     (duration, %editorial-voice;, staff?)>
    var children = [];
    children.push((_a = ["<duration>", "</duration>"], _a.raw = ["<duration>", "</duration>"], xml(_a, forward.duration)));
    children = children.concat(editorialVoiceToXML(forward));
    children.push((_b = ["<staff>", "</staff>"], _b.raw = ["<staff>", "</staff>"], xml(_b, forward.staff)));
    return (_c = ["<forward>\n", "\n</forward>"], _c.raw = ["<forward>\\n", "\\n</forward>"], dangerous(_c, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
function groupingToXML(grouping) {
    // <!ELEMENT grouping ((feature)*)>
    // <!ATTLIST grouping
    //     type %start-stop-single; #REQUIRED
    //     number CDATA "1"
    //     member-of CDATA #IMPLIED
    // >
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(grouping));
    (grouping.features || []).forEach(function (feature) {
        // <!ELEMENT feature (#PCDATA)>
        // <!ATTLIST feature
        //     type CDATA #IMPLIED
        // >
        var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, feature.data));
        var attribs = "";
        if (defined(feature.type)) {
            attribs += (_b = [" type=\"", "\""], _b.raw = [" type=\"", "\""], xml(_b, feature.type));
        }
        children.push((_c = ["<grouping", ">", "</grouping>"], _c.raw = ["<grouping", ">", "</grouping>"], dangerous(_c, attribs, pcdata)));
        var _a, _b, _c;
    });
    var attribs = "" +
        startStopSingleToXML(grouping) +
        numberLevelToXML(grouping);
    if (defined(grouping.memberOf)) {
        attribs += (_a = [" member-of=\"", "\""], _a.raw = [" member-of=\"", "\""], xml(_a, grouping.memberOf));
    }
    return (_b = ["<grouping", ">\n", "\n</grouping>"], _b.raw = ["<grouping", ">\\n", "\\n</grouping>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function harmonyToXML(harmony) {
    // <!ENTITY % harmony-chord "((root | function), kind,
    //     inversion?, bass?, degree*)">
    // 
    // <!ELEMENT harmony ((%harmony-chord;)+, frame?,
    //     offset?, %editorial;, staff?)>
    // <!ATTLIST harmony
    //     type (explicit | implied | alternate) #IMPLIED
    //     %print-object;
    //     print-frame  %yes-no; #IMPLIED
    //     %print-style;
    //     %placement;
    // >
    var attribs = "" +
        explicitImpliedAlternateToXML(harmony) +
        printObjectToXML(harmony);
    if (defined(harmony.printFrame)) {
        attribs += (_a = [" print-frame=\"", "\""], _a.raw = [" print-frame=\"", "\""], yesNo(_a, harmony.printFrame));
    }
    attribs +=
        printStyleToXML(harmony) +
            placementToXML(harmony);
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(harmony));
    // TODO: multiple of everything in harmony-chord!
    if (defined(harmony.root)) {
        children.push(rootToXML(harmony.root));
    }
    else if (defined(harmony.function)) {
        children.push(functionToXML(harmony.function));
    }
    children.push(kindToXML(harmony.kind));
    if (defined(harmony.inversion)) {
        children.push(inversionToXML(harmony.inversion));
    }
    if (defined(harmony.bass)) {
        children.push(bassToXML(harmony.bass));
    }
    (harmony.degrees || []).forEach(function (degree) {
        children.push(degreeToXML(degree));
    });
    if (defined(harmony.frame)) {
        children.push(frameToXML(harmony.frame));
    }
    if (defined(harmony.offset)) {
        children.push(offsetToXML(harmony.offset));
    }
    children = children.concat(editorialToXML(harmony));
    if (!isNaN(harmony.staff)) {
        children.push((_b = ["<staff>", "</staff>"], _b.raw = ["<staff>", "</staff>"], xml(_b, harmony.staff)));
    }
    return (_c = ["<harmony", ">\n", "\n</harmony>"], _c.raw = ["<harmony", ">\\n", "\\n</harmony>"], dangerous(_c, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
var eiaTypeToXML = (_a = {},
    _a[ExplicitImpliedAlternate.Explicit] = "explicit",
    _a[ExplicitImpliedAlternate.Implied] = "implied",
    _a[ExplicitImpliedAlternate.Alternate] = "alternate",
    _a
);
function explicitImpliedAlternateToXML(eia) {
    if (defined(eia.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, eiaTypeToXML[eia.type]));
    }
    return "";
    var _a;
}
function rootToXML(root) {
    // <!ELEMENT root (root-step, root-alter?)>
    var children = [];
    if (defined(root.rootStep)) {
        // <!ELEMENT root-step (#PCDATA)>
        // <!ATTLIST root-step
        //     text CDATA #IMPLIED
        //     %print-style;
        // >
        var attribs = "";
        if (defined(root.rootStep.text)) {
            attribs += (_a = [" text=\"", "\""], _a.raw = [" text=\"", "\""], xml(_a, root.rootStep.text));
        }
        attribs += printStyleToXML(root.rootStep);
        var pcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, root.rootStep.data));
        children.push((_c = ["<root-step", ">", "</root-step>"], _c.raw = ["<root-step", ">", "</root-step>"], dangerous(_c, attribs, pcdata)));
    }
    if (defined(root.rootAlter)) {
        // <!ELEMENT root-alter (#PCDATA)>
        // <!ATTLIST root-alter
        //     %print-object;
        //     %print-style;
        //     location %left-right; #IMPLIED
        // >
        var attribs = printObjectToXML(root.rootAlter) +
            printStyleToXML(root.rootAlter);
        if (defined(root.rootAlter.location)) {
            attribs += (_d = [" location=\"", "\""], _d.raw = [" location=\"", "\""], xml(_d, root.rootAlter.location === LeftRight.Left ? "left" : "right"));
        }
        var pcdata = root.rootAlter.data;
        children.push((_e = ["<root-alter", ">", "</root-alter>"], _e.raw = ["<root-alter", ">", "</root-alter>"], dangerous(_e, attribs, pcdata)));
    }
    return (_f = ["<root>\n", "\n</root>"], _f.raw = ["<root>\\n", "\\n</root>"], dangerous(_f, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f;
}
function functionToXML(func) {
    // <!ELEMENT function (#PCDATA)>
    // <!ATTLIST function
    //     %print-style;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, func.data));
    var attribs = printStyleToXML(func);
    return "<function" + attribs + ">" + pcdata + "</function>";
    var _a;
}
function kindToXML(kind) {
    // <!ELEMENT kind (#PCDATA)>
    // <!ATTLIST kind
    //     use-symbols          %yes-no;   #IMPLIED
    //     text                 CDATA      #IMPLIED
    //     stack-degrees        %yes-no;   #IMPLIED
    //     parentheses-degrees  %yes-no;   #IMPLIED
    //     bracket-degrees      %yes-no;   #IMPLIED
    //     %print-style;
    //     %halign;
    //     %valign;
    // >
    var attribs = "";
    if (defined(kind.useSymbols)) {
        attribs += (_a = [" kind=\"", "\""], _a.raw = [" kind=\"", "\""], yesNo(_a, kind.useSymbols));
    }
    if (defined(kind.text)) {
        attribs += (_b = [" text=\"", "\""], _b.raw = [" text=\"", "\""], xml(_b, kind.text));
    }
    if (defined(kind.stackDegrees)) {
        attribs += (_c = [" stack-degrees=\"", "\""], _c.raw = [" stack-degrees=\"", "\""], yesNo(_c, kind.stackDegrees));
    }
    if (defined(kind.parenthesesDegrees)) {
        attribs += (_d = [" parentheses-degrees=\"", "\""], _d.raw = [" parentheses-degrees=\"", "\""], yesNo(_d, kind.parenthesesDegrees));
    }
    attribs +=
        printStyleToXML(kind) +
            halignToXML(kind) +
            valignToXML(kind);
    var pcdata = (_e = ["", ""], _e.raw = ["", ""], xml(_e, kind.data));
    return (_f = ["<kind", ">\n", "</kind>"], _f.raw = ["<kind", ">\\n", "</kind>"], dangerous(_f, attribs, pcdata));
    var _a, _b, _c, _d, _e, _f;
}
function inversionToXML(inversion) {
    // <!ELEMENT inversion (#PCDATA)>
    // <!ATTLIST inversion
    //     %print-style;
    //     >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, inversion.data));
    var attribs = printStyleToXML(inversion);
    return "<inversion" + attribs + ">" + pcdata + "</inversion>";
    var _a;
}
function bassToXML(bass) {
    // <!ELEMENT bass (bass-step, bass-alter?)>
    var children = [];
    if (defined(bass.bassStep)) {
        // <!ELEMENT bass-step (#PCDATA)>
        // <!ATTLIST bass-step
        //     text CDATA #IMPLIED
        //     %print-style;
        // >
        var attribs = "";
        if (defined(bass.bassStep.text)) {
            attribs += (_a = [" text=\"", "\""], _a.raw = [" text=\"", "\""], xml(_a, bass.bassStep.text));
        }
        attribs += printStyleToXML(bass.bassStep);
        var pcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, bass.bassStep.data));
        children.push((_c = ["<bass-step", ">", "</bass-step>"], _c.raw = ["<bass-step", ">", "</bass-step>"], dangerous(_c, attribs, pcdata)));
    }
    if (defined(bass.bassAlter)) {
        // <!ELEMENT bass-alter (#PCDATA)>
        // <!ATTLIST bass-alter
        //     %print-object;
        //     %print-style;
        //     location (left | right) #IMPLIED
        // >
        var attribs = printObjectToXML(bass.bassAlter) +
            printStyleToXML(bass.bassAlter);
        if (defined(bass.bassAlter.location)) {
            attribs += (_d = [" location=\"", "\""], _d.raw = [" location=\"", "\""], xml(_d, bass.bassAlter.location === LeftRight.Left ? "left" : "right"));
        }
        var pcdata = bass.bassAlter.data;
        children.push((_e = ["<bass-alter", ">", "</bass-alter>"], _e.raw = ["<bass-alter", ">", "</bass-alter>"], dangerous(_e, attribs, pcdata)));
    }
    return (_f = ["<bass>\n", "\n</bass>"], _f.raw = ["<bass>\\n", "\\n</bass>"], dangerous(_f, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f;
}
var chordTypeToXML = (_b = {},
    _b[ChordType.Augmented] = "augmented",
    _b[ChordType.Diminished] = "diminished",
    _b[ChordType.Major] = "major",
    _b[ChordType.Minor] = "minor",
    _b[ChordType.HalfDiminished] = "half-diminished",
    _b
);
function degreeToXML(degree) {
    // <!ELEMENT degree (degree-value, degree-alter, degree-type)>
    // <!ATTLIST degree
    //     %print-object;
    // >
    var children = [];
    if (defined(degree.degreeValue)) {
        // <!ELEMENT degree-value (#PCDATA)>
        // <!ATTLIST degree-value
        //     symbol (major | minor | augmented |
        //         diminished | half-diminished) #IMPLIED
        //     text CDATA #IMPLIED
        //     %print-style;
        // >
        var lattribs = "";
        if (defined(degree.degreeValue.symbol)) {
            lattribs += (_a = [" symbol=\"", "\""], _a.raw = [" symbol=\"", "\""], xml(_a, chordTypeToXML[degree.degreeValue.symbol]));
        }
        if (defined(degree.degreeValue.text)) {
            lattribs += (_b = [" text=\"", "\""], _b.raw = [" text=\"", "\""], xml(_b, degree.degreeValue.text));
        }
        lattribs += printStyleToXML(degree.degreeValue);
        var pcdata = (_c = ["", ""], _c.raw = ["", ""], xml(_c, degree.degreeValue.data));
        children.push((_d = ["<degree-value", ">", "</degree-value>"], _d.raw = ["<degree-value", ">", "</degree-value>"], dangerous(_d, lattribs, pcdata)));
    }
    if (defined(degree.degreeAlter)) {
        // <!ELEMENT degree-alter (#PCDATA)>
        // <!ATTLIST degree-alter
        //     %print-style;
        //     plus-minus %yes-no; #IMPLIED
        // >
        var lattribs = printStyleToXML(degree.degreeAlter);
        if (defined(degree.degreeAlter.plusMinus)) {
            lattribs += (_e = [" plus-minus=\"", "\""], _e.raw = [" plus-minus=\"", "\""], yesNo(_e, degree.degreeAlter.plusMinus));
        }
        var pcdata = (_f = ["", ""], _f.raw = ["", ""], xml(_f, degree.degreeAlter.data));
        children.push((_g = ["<degree-alter", ">", "</degree-alter>"], _g.raw = ["<degree-alter", ">", "</degree-alter>"], dangerous(_g, lattribs, pcdata)));
    }
    if (defined(degree.degreeType)) {
        // <!ELEMENT degree-type (#PCDATA)>
        // <!ATTLIST degree-type
        //     text CDATA #IMPLIED
        //     %print-style;
        // >
        var lattribs = printStyleToXML(degree.degreeType);
        if (defined(degree.degreeType.text)) {
            lattribs += (_h = [" text=\"", "\""], _h.raw = [" text=\"", "\""], xml(_h, degree.degreeType.text));
        }
        var pcdata = (_j = ["", ""], _j.raw = ["", ""], xml(_j, degree.degreeType.data));
        children.push((_k = ["<degree-type", ">", "</degree-type>"], _k.raw = ["<degree-type", ">", "</degree-type>"], dangerous(_k, lattribs, pcdata)));
    }
    var attribs = printObjectToXML(degree);
    return (_l = ["<degree", ">\n", "\n</degree>"], _l.raw = ["<degree", ">\\n", "\\n</degree>"], dangerous(_l, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
}
function frameToXML(frame) {
    // <!ELEMENT frame
    //     (frame-strings, frame-frets, first-fret?, frame-note+)>
    // <!ATTLIST frame
    //     %position;
    //     %color;
    //     %halign;
    //     %valign-image;
    //     height  %tenths;  #IMPLIED
    //     width   %tenths;  #IMPLIED
    //     unplayed CDATA    #IMPLIED
    // >
    var attribs = positionToXML(frame) +
        colorToXML(frame) +
        halignToXML(frame) +
        valignImageToXML(frame);
    if (defined(frame.height)) {
        attribs += (_a = [" height=\"", "\""], _a.raw = [" height=\"", "\""], xml(_a, frame.height));
    }
    if (defined(frame.width)) {
        attribs += (_b = [" width=\"", "\""], _b.raw = [" width=\"", "\""], xml(_b, frame.width));
    }
    if (defined(frame.unplayed)) {
        attribs += (_c = [" unplayed=\"", "\""], _c.raw = [" unplayed=\"", "\""], xml(_c, frame.unplayed));
    }
    var children = [];
    if (defined(frame.frameStrings)) {
        // <!ELEMENT frame-strings (#PCDATA)>
        children.push((_d = ["<frame-strings>", "</frame-strings>"], _d.raw = ["<frame-strings>", "</frame-strings>"], xml(_d, frame.frameStrings)));
    }
    if (defined(frame.frameFrets)) {
        // <!ELEMENT frame-frets (#PCDATA)>
        children.push((_e = ["<frame-frets>", "</frame-frets>"], _e.raw = ["<frame-frets>", "</frame-frets>"], xml(_e, frame.frameFrets)));
    }
    if (defined(frame.firstFret)) {
        // <!ELEMENT first-fret (#PCDATA)>
        // <!ATTLIST first-fret
        //     text CDATA #IMPLIED
        //     location %left-right; #IMPLIED
        // >
        var pcdata = (_f = ["", ""], _f.raw = ["", ""], xml(_f, frame.firstFret.data));
        var attribs_1 = "";
        if (defined(frame.firstFret.text)) {
            attribs_1 += (_g = [" text=\"", "\""], _g.raw = [" text=\"", "\""], xml(_g, frame.firstFret.text));
        }
        if (defined(frame.firstFret.location)) {
            attribs_1 += (_h = [" location=\"", "\""], _h.raw = [" location=\"", "\""], xml(_h, frame.firstFret.location === LeftRight.Left ?
                "left" : "right"));
        }
    }
    (frame.frameNotes || []).forEach(function (frameNote) {
        // <!ELEMENT frame-note (string, fret, fingering?, barre?)>
        var fChildren = [];
        // <!ELEMENT string (#PCDATA)>
        // <!ATTLIST string
        //     %print-style;
        //     %placement;
        // >
        if (defined(frameNote.string)) {
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, frameNote.string.stringNum));
            fChildren.push((_b = ["<string", ">", "</string>"], _b.raw = ["<string", ">", "</string>"], dangerous(_b, printStyleToXML(frameNote.string) +
                placementToXML(frameNote.string), pcdata)));
        }
        // <!ELEMENT fret (#PCDATA)>
        // <!ATTLIST fret
        //     %font;
        //     %color;
        // >
        if (defined(frameNote.fret)) {
            var pcdata = (_c = ["", ""], _c.raw = ["", ""], xml(_c, frameNote.fret.fret));
            fChildren.push((_d = ["<fret", ">", "</fret>"], _d.raw = ["<fret", ">", "</fret>"], dangerous(_d, fontToXML(frameNote.fret) +
                colorToXML(frameNote.fret), pcdata)));
        }
        // <!ELEMENT fingering (#PCDATA)>
        // <!ATTLIST fingering
        //     substitution %yes-no; #IMPLIED
        //     alternate %yes-no; #IMPLIED
        //     %print-style;
        //     %placement;
        // >
        if (defined(frameNote.fingering)) {
            var pcdata = (_e = ["", ""], _e.raw = ["", ""], xml(_e, frameNote.fingering.finger));
            var coreAttribs = "";
            if (defined(frameNote.fingering.substitution)) {
                coreAttribs += (_f = [" substitution=\"", "\""], _f.raw = [" substitution=\"", "\""], yesNo(_f, frameNote.fingering.substitution));
            }
            if (defined(frameNote.fingering.alternate)) {
                coreAttribs += (_g = [" alternate=\"", "\""], _g.raw = [" alternate=\"", "\""], yesNo(_g, frameNote.fingering.alternate));
            }
            fChildren.push((_h = ["<fingering", ">", "</fingering>"], _h.raw = ["<fingering", ">", "</fingering>"], dangerous(_h, coreAttribs +
                printStyleToXML(frameNote.fingering) +
                placementToXML(frameNote.fingering), pcdata)));
        }
        // <!ELEMENT barre EMPTY>
        // <!ATTLIST barre
        //     type %start-stop; #REQUIRED
        //     %color;
        // >
        if (defined(frameNote.barre)) {
            fChildren.push((_j = ["<barre", " />"], _j.raw = ["<barre", " />"], dangerous(_j, startStopToXML(frameNote.barre) +
                colorToXML(frameNote.barre))));
        }
        children.push((_k = ["<frame-note>\n", "\n</frame-note>"], _k.raw = ["<frame-note>\\n", "\\n</frame-note>"], dangerous(_k, fChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    });
    return (_j = ["<frame", ">\n", "\n</frame>"], _j.raw = ["<frame", ">\\n", "\\n</frame>"], dangerous(_j, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
}
function printToXML(print) {
    // <!ELEMENT print (page-layout?, system-layout?, staff-layout*,
    //     measure-layout?, measure-numbering?, part-name-display?,
    //     part-abbreviation-display?)>
    // <!ATTLIST print
    //     staff-spacing %tenths; #IMPLIED
    //     new-system %yes-no; #IMPLIED
    //     new-page %yes-no; #IMPLIED
    //     blank-page NMTOKEN #IMPLIED
    //     page-number CDATA #IMPLIED    
    // >
    var attribs = "";
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(print));
    if (defined(print.staffSpacing)) {
        attribs += (_a = [" staff-spacing=\"", "\""], _a.raw = [" staff-spacing=\"", "\""], xml(_a, print.staffSpacing));
    }
    if (defined(print.newSystem)) {
        attribs += (_b = [" new-system=\"", "\""], _b.raw = [" new-system=\"", "\""], yesNo(_b, print.newSystem));
    }
    if (defined(print.newPage)) {
        attribs += (_c = [" new-page=\"", "\""], _c.raw = [" new-page=\"", "\""], yesNo(_c, print.newPage));
    }
    if (defined(print.blankPage)) {
        attribs += (_d = [" blank-page=\"", "\""], _d.raw = [" blank-page=\"", "\""], xml(_d, print.blankPage));
    }
    if (defined(print.pageNumber)) {
        attribs += (_e = [" page-number=\"", "\""], _e.raw = [" page-number=\"", "\""], xml(_e, print.pageNumber));
    }
    if (defined(print.pageLayout)) {
        children.push(pageLayoutToXML(print.pageLayout));
    }
    if (defined(print.systemLayout)) {
        children.push(systemLayoutToXML(print.systemLayout));
    }
    (print.staffLayouts || []).forEach(function (staffLayout) {
        children.push(staffLayoutToXML(staffLayout));
    });
    if (defined(print.measureLayout)) {
        children.push(measureLayoutToXML(print.measureLayout));
    }
    if (defined(print.measureNumbering)) {
        children.push(measureNumberingToXML(print.measureNumbering));
    }
    if (defined(print.partNameDisplay)) {
        children.push(partNameDisplayToXML(print.partNameDisplay));
    }
    if (defined(print.partAbbreviationDisplay)) {
        children.push(partAbbreviationDisplayToXML(print.partAbbreviationDisplay));
    }
    return (_f = ["<print", ">\n", "\n</print>"], _f.raw = ["<print", ">\\n", "\\n</print>"], dangerous(_f, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f;
}
function soundToXML(sound) {
    // <!ELEMENT sound ((midi-device?, midi-instrument?, play?)*,
    //     offset?)>
    // <!ATTLIST sound
    //     tempo CDATA #IMPLIED
    //     dynamics CDATA #IMPLIED
    //     dacapo %yes-no; #IMPLIED
    //     segno CDATA #IMPLIED
    //     dalsegno CDATA #IMPLIED
    //     coda CDATA #IMPLIED
    //     tocoda CDATA #IMPLIED
    //     divisions CDATA #IMPLIED
    //     forward-repeat %yes-no; #IMPLIED
    //     fine CDATA #IMPLIED
    //     %time-only;
    //     pizzicato %yes-no; #IMPLIED
    //     pan CDATA #IMPLIED
    //     elevation CDATA #IMPLIED
    //     damper-pedal %yes-no-number; #IMPLIED
    //     soft-pedal %yes-no-number; #IMPLIED
    //     sostenuto-pedal %yes-no-number; #IMPLIED
    // >
    var children = [];
    var attribs = "";
    children = children.concat(staffDebugInfoToXMLComment(sound));
    // TODO musicxml-interfaces: can have many midi-devices, instruments, etc.
    (sound.midiDevices || []).forEach(function (midiDevice) {
        children.push(midiDeviceToXML(midiDevice));
    });
    (sound.midiInstruments || []).forEach(function (midiInstrument) {
        children.push(midiInstrumentToXML(midiInstrument));
    });
    (sound.plays || []).forEach(function (play) {
        children.push(playToXML(play));
    });
    if (defined(sound.tempo)) {
        attribs += (_a = [" tempo=\"", "\""], _a.raw = [" tempo=\"", "\""], xml(_a, sound.tempo));
    }
    if (defined(sound.dynamics)) {
        attribs += (_b = [" dynamics=\"", "\""], _b.raw = [" dynamics=\"", "\""], xml(_b, sound.dynamics));
    }
    if (defined(sound.decapo)) {
        attribs += (_c = [" decapo=\"", "\""], _c.raw = [" decapo=\"", "\""], yesNo(_c, sound.decapo));
    }
    if (defined(sound.segno)) {
        attribs += (_d = [" segno=\"", "\""], _d.raw = [" segno=\"", "\""], xml(_d, sound.segno));
    }
    if (defined(sound.dalsegno)) {
        attribs += (_e = [" dalsegno=\"", "\""], _e.raw = [" dalsegno=\"", "\""], xml(_e, sound.dalsegno));
    }
    if (defined(sound.coda)) {
        attribs += (_f = [" coda=\"", "\""], _f.raw = [" coda=\"", "\""], xml(_f, sound.coda));
    }
    if (defined(sound.tocoda)) {
        attribs += (_g = [" tocoda=\"", "\""], _g.raw = [" tocoda=\"", "\""], xml(_g, sound.tocoda));
    }
    if (defined(sound.divisions)) {
        attribs += (_h = [" divisions=\"", "\""], _h.raw = [" divisions=\"", "\""], xml(_h, sound.divisions));
    }
    if (defined(sound.forwardRepeat)) {
        attribs += (_j = [" forward-repeat=\"", "\""], _j.raw = [" forward-repeat=\"", "\""], yesNo(_j, sound.forwardRepeat));
    }
    if (defined(sound.fine)) {
        attribs += (_k = [" fine=\"", "\""], _k.raw = [" fine=\"", "\""], xml(_k, sound.fine));
    }
    attribs += timeOnlyToXML(sound);
    if (defined(sound.pizzicato)) {
        attribs += (_l = [" pizzicato=\"", "\""], _l.raw = [" pizzicato=\"", "\""], yesNo(_l, sound.pizzicato));
    }
    if (defined(sound.pan)) {
        attribs += (_m = [" pan=\"", "\""], _m.raw = [" pan=\"", "\""], xml(_m, sound.pan));
    }
    if (defined(sound.elevation)) {
        attribs += (_o = [" elevation=\"", "\""], _o.raw = [" elevation=\"", "\""], xml(_o, sound.elevation));
    }
    if (defined(sound.damperPedal)) {
        attribs += (_p = [" damper-pedal=\"", "\""], _p.raw = [" damper-pedal=\"", "\""], xml(_p, sound.damperPedal));
    }
    if (defined(sound.softPedal)) {
        attribs += (_q = [" soft-pedal=\"", "\""], _q.raw = [" soft-pedal=\"", "\""], xml(_q, sound.softPedal));
    }
    if (defined(sound.sostenutoPedal)) {
        attribs += (_r = [" sostenuto-pedal=\"", "\""], _r.raw = [" sostenuto-pedal=\"", "\""], xml(_r, sound.sostenutoPedal));
    }
    return (_s = ["<sound", ">\n", "\n</sound>"], _s.raw = ["<sound", ">\\n", "\\n</sound>"], dangerous(_s, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
}
function staffDebugInfoToXMLComment(module) {
    var comments = [];
    if (defined(module.divCount)) {
        comments.push((_a = ["<!--musicxml-interfaces:debug>\n", "  <div-count>", "</div-count>\n", "</musicxml-interfaces:debug-->"], _a.raw = ["<!--musicxml-interfaces:debug>\\n", "  <div-count>", "</div-count>\\n", "</musicxml-interfaces:debug-->"], xml(_a, "", module.divCount, "")));
    }
    return comments;
    var _a;
}
/*

      <direction placement="above">
        <direction-type>
          <words default-y="15" font-family="satie-meta" relative-x="-13653" xml:space="preserve">
                {
                    "uuid": "482912"
                }
            </words>
        </direction-type>
      </direction>
*/
function directionToXML(direction) {
    // <!ELEMENT direction (direction-type+, offset?,
    //     %editorial-voice;, staff?, sound?)>
    // <!ATTLIST direction
    //     %placement;
    //     %directive;
    // >
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(direction));
    (direction.directionTypes || []).forEach(function (directionType) {
        children.push(directionTypeToXML(directionType));
    });
    if (defined(direction.offset)) {
        children.push(offsetToXML(direction.offset));
    }
    children = children.concat(editorialVoiceToXML(direction));
    if (defined(direction.staff)) {
        children.push((_a = ["<staff>", "</staff>"], _a.raw = ["<staff>", "</staff>"], xml(_a, direction.staff)));
    }
    if (defined(direction.sound)) {
        children.push(soundToXML(direction.sound));
    }
    var attribs = "" +
        placementToXML(direction);
    if (defined(direction.directive)) {
        attribs += (_b = [" directive=\"", "\""], _b.raw = [" directive=\"", "\""], yesNo(_b, direction.directive));
    }
    return (_c = ["<direction", ">\n", "\n</direction>"], _c.raw = ["<direction", ">\\n", "\\n</direction>"], dangerous(_c, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
function attributesToXML(attributes) {
    // <!ELEMENT attributes (%editorial;, divisions?, key*, time*,
    //     staves?, part-symbol?, instruments?, clef*, staff-details*,
    //     transpose*, directive*, measure-style*)>
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(attributes));
    children = children.concat(editorialToXML(attributes));
    if (defined(attributes.divisions)) {
        // <!ELEMENT divisions (#PCDATA)>
        children.push((_a = ["<divisions>", "</divisions>"], _a.raw = ["<divisions>", "</divisions>"], xml(_a, attributes.divisions)));
    }
    (attributes.keySignatures || []).forEach(function (keySignature) {
        children.push(keyToXML(keySignature));
    });
    (attributes.times || []).forEach(function (time) {
        children.push(timeToXML(time));
    });
    if (defined(attributes.staves)) {
        // <!ELEMENT staves (#PCDATA)>
        children.push((_b = ["<staves>", "</staves>"], _b.raw = ["<staves>", "</staves>"], xml(_b, attributes.staves)));
    }
    if (defined(attributes.partSymbol)) {
        children.push(partSymbolToXML(attributes.partSymbol));
    }
    if (defined(attributes.instruments)) {
        // <!ELEMENT instruments (#PCDATA)>
        children.push((_c = ["<instruments>", "</instruments>"], _c.raw = ["<instruments>", "</instruments>"], xml(_c, attributes.instruments)));
    }
    (attributes.clefs || []).forEach(function (clef) {
        children.push(clefToXML(clef));
    });
    (attributes.staffDetails || []).forEach(function (staffDetails) {
        children.push(staffDetailsToXML(staffDetails));
    });
    (attributes.transposes || []).forEach(function (transpose) {
        children.push(transposeToXML(transpose));
    });
    (attributes.directives || []).forEach(function (directive) {
        children.push(directiveToXML(directive));
    });
    (attributes.measureStyles || []).forEach(function (measureStyle) {
        children.push(measureStyleToXML(measureStyle));
    });
    return (_d = ["<attributes>\n", "\n</attributes>"], _d.raw = ["<attributes>\\n", "\\n</attributes>"], dangerous(_d, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d;
}
var countToXML = {
    4: "quarter",
    9990: "breve",
    9991: "long",
    1024: "1024th",
    32: "32nd",
    16: "16th",
    8: "eighth",
    9992: "maxima",
    512: "512th",
    64: "64th",
    256: "256th",
    128: "128th",
    2: "half",
    1: "whole"
};
var accidentalToXML = {
    7: "natural-flat",
    13: "sharp-up",
    10: "three-quarters-flat",
    11: "three-quarters-sharp",
    8: "quarter-flat",
    2: "flat",
    18: "triple-sharp",
    27: "flat-1",
    28: "flat-2",
    29: "flat-3",
    291: "flat-4",
    191: "triple-flat",
    30: "flat-5",
    0: "sharp",
    9: "quarter-sharp",
    21: "slash-flat",
    16: "flat-down",
    14: "natural-down",
    19: "slash-quarter-sharp",
    4: "sharp-sharp",
    23: "sharp-1",
    17: "flat-up",
    24: "sharp-2",
    25: "sharp-3",
    3: "double-sharp",
    251: "sharp-4",
    26: "sharp-5",
    31: "sori",
    22: "double-slash-flat",
    12: "sharp-down",
    32: "koron",
    15: "natural-up",
    20: "slash-sharp",
    6: "natural-sharp",
    5: "flat-flat",
    1: "natural",
    33: "double-flat"
};
var syllabicTypeToXML = {
    0: "single",
    1: "begin",
    3: "middle",
    2: "end"
};
var breathMarkTypeToXML = {
    0: "comma",
    1: "tick",
    2: "empty"
};
var holeClosedTypeToXML = {
    1: "no",
    0: "yes",
    2: "half"
};
var holeLocationToXML = {
    0: "right",
    3: "top",
    1: "bottom",
    2: "left"
};
var actualBothNoneToXML = (_c = {},
    _c[ActualBothNone.None] = "none",
    _c[ActualBothNone.Both] = "both",
    _c[ActualBothNone.Actual] = "actual",
    _c
);
var beamTypeToXML = {
    4: "backward hook",
    0: "begin",
    3: "forward hook",
    1: "continue",
    2: "end"
};
var accelRitNoneToXML = {
    0: "accel",
    2: "none",
    1: "rit"
};
var noteheadTypeToXML = {
    7: "inverted triangle",
    14: "circle dot",
    9: "arrow up",
    18: "do",
    20: "mi",
    4: "cross",
    0: "slash",
    21: "fa",
    1: "triangle",
    22: "fa up",
    23: "so",
    15: "left triangle",
    11: "back slashed",
    17: "none",
    24: "la",
    10: "slashed",
    12: "normal",
    13: "cluster",
    25: "ti",
    19: "re",
    16: "rectangle",
    3: "square",
    8: "arrow down",
    5: "x",
    2: "diamond",
    6: "circle x"
};
var stemToXML = {
    2: "none",
    3: "double",
    0: "down",
    1: "up"
};
function measureToXML(measure) {
    // <!ATTLIST measure
    //     number CDATA #REQUIRED
    //     implicit %yes-no; #IMPLIED
    //     non-controlling %yes-no; #IMPLIED
    //     width %tenths; #IMPLIED
    // >
    // <!ELEMENT measure (part+)>
    var attribs = "";
    if (defined(measure.number)) {
        attribs += (_a = [" number=\"", "\""], _a.raw = [" number=\"", "\""], xml(_a, measure.number));
    }
    if (defined(measure.implicit)) {
        attribs += (_b = [" implicit=\"", "\""], _b.raw = [" implicit=\"", "\""], yesNo(_b, measure.implicit));
    }
    if (defined(measure.nonControlling)) {
        attribs += (_c = [" implicit=\"", "\""], _c.raw = [" implicit=\"", "\""], yesNo(_c, measure.nonControlling));
    }
    if (defined(measure.width)) {
        attribs += (_d = [" width=\"", "\""], _d.raw = [" width=\"", "\""], xml(_d, measure.width));
    }
    var elements = [];
    for (var key in measure.parts) {
        elements.push(partToXML(measure.parts[key], key));
    }
    return (_e = ["<measure", ">\n", "\n</measure>"], _e.raw = ["<measure", ">\\n", "\\n</measure>"], dangerous(_e, attribs, elements.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e;
}
function partToXML(part, id) {
    // <!ELEMENT part (%music-data;)>
    // <!ATTLIST part
    //     id IDREF #REQUIRED
    // >
    var attribs = (_a = [" id=\"", "\""], _a.raw = [" id=\"", "\""], xml(_a, id));
    // <!ENTITY % music-data
    //     "(note | backup | forward | direction | attributes |
    //       harmony | figured-bass | print | sound | barline |
    //       grouping | link | bookmark)*">
    var elements = part.map(function (element) {
        switch (element._class) {
            case "Note":
                return noteToXML(element);
            case "Backup":
                return backupToXML(element);
            case "Forward":
                return forwardToXML(element);
            case "Direction":
                return directionToXML(element);
            case "Attributes":
                return attributesToXML(element);
            case "Harmony":
                return harmonyToXML(element);
            case "FiguredBass":
                return figuredBassToXML(element);
            case "Print":
                return printToXML(element);
            case "Sound":
                return soundToXML(element);
            case "Barline":
                return barlineToXML(element);
            case "Grouping":
                return groupingToXML(element);
            case "Link":
                return "<!-- link not implemented -->";
            case "Bookmark":
                return "<!-- bookmark not implemented -->";
            default:
                return "<!-- unknown type (was _class set?) -->";
        }
    });
    return (_b = ["<part", ">\n", "\n</part>"], _b.raw = ["<part", ">\\n", "\\n</part>"], dangerous(_b, attribs, elements.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function noteToXML(note) {
    // <!ATTLIST note
    //     %print-style;
    //     %printout;
    //     dynamics CDATA #IMPLIED
    //     end-dynamics CDATA #IMPLIED
    //     attack CDATA #IMPLIED
    //     release CDATA #IMPLIED
    //     %time-only;
    //     pizzicato %yes-no; #IMPLIED
    // >
    var attribs = "";
    attribs += printStyleToXML(note);
    attribs += printoutToXML(note);
    if (defined(note.dynamics)) {
        attribs += (_a = [" dynamics=\"", "\""], _a.raw = [" dynamics=\"", "\""], xml(_a, note.dynamics));
    }
    if (defined(note.endDynamics)) {
        attribs += (_b = [" end-dynamics=\"", "\""], _b.raw = [" end-dynamics=\"", "\""], xml(_b, note.endDynamics));
    }
    if (defined(note.attack)) {
        attribs += (_c = [" attack=\"", "\""], _c.raw = [" attack=\"", "\""], xml(_c, note.attack));
    }
    if (defined(note.release)) {
        attribs += (_d = [" release=\"", "\""], _d.raw = [" release=\"", "\""], xml(_d, note.release));
    }
    attribs += timeOnlyToXML(note);
    if (defined(note.pizzicato)) {
        attribs += (_e = [" pizzicato=\"", "\""], _e.raw = [" pizzicato=\"", "\""], yesNo(_e, note.pizzicato));
    }
    // <!ELEMENT note
    //     (((grace, %full-note;, (tie, tie?)?) |
    //     (cue, %full-note;, duration) |
    //     (%full-note;, duration, (tie, tie?)?)),
    //     ...
    var elements = [];
    if (note.grace) {
        var graceAttribs = "";
        /*
            <!ELEMENT grace EMPTY>
            <!ATTLIST grace
                steal-time-previous CDATA #IMPLIED
                steal-time-following CDATA #IMPLIED
                make-time CDATA #IMPLIED
                slash %yes-no; #IMPLIED
            >
        */
        if (note.grace.stealTimePrevious) {
            graceAttribs += (_f = [" steal-time-previous=\"", "\""], _f.raw = [" steal-time-previous=\"", "\""], xml(_f, note.grace.stealTimePrevious));
        }
        if (note.grace.stealTimeFollowing) {
            graceAttribs += (_g = [" steal-time-following=\"", "\""], _g.raw = [" steal-time-following=\"", "\""], xml(_g, note.grace.stealTimeFollowing));
        }
        if (note.grace.makeTime) {
            graceAttribs += (_h = [" make-time=\"", "\""], _h.raw = [" make-time=\"", "\""], xml(_h, note.grace.makeTime));
        }
        if (note.grace.slash !== undefined && note.grace.slash !== null) {
            graceAttribs += (_j = [" slash=\"", "\""], _j.raw = [" slash=\"", "\""], yesNo(_j, note.grace.slash));
        }
        elements.push((_k = ["<grace", " />"], _k.raw = ["<grace", " />"], dangerous(_k, graceAttribs)));
    }
    else if (note.cue) {
        elements.push((_l = ["<cue />"], _l.raw = ["<cue />"], xml(_l)));
    }
    /*
        <!ENTITY % full-note "(chord?, (pitch | unpitched | rest))">
    */
    if (note.chord) {
        elements.push((_m = ["<chord />"], _m.raw = ["<chord />"], xml(_m)));
    }
    if (note.pitch) {
        /*
            <!ELEMENT pitch (step, alter?, octave)>
            <!ELEMENT step (#PCDATA)>
            <!ELEMENT alter (#PCDATA)>
            <!ELEMENT octave (#PCDATA)>
        */
        var pitchElements = [];
        if (note.pitch.step) {
            pitchElements.push((_o = ["<step>", "</step>"], _o.raw = ["<step>", "</step>"], xml(_o, note.pitch.step)));
        }
        if (note.pitch.alter) {
            pitchElements.push((_p = ["<alter>", "</alter>"], _p.raw = ["<alter>", "</alter>"], xml(_p, note.pitch.alter)));
        }
        if (note.pitch.octave) {
            pitchElements.push((_q = ["<octave>", "</octave>"], _q.raw = ["<octave>", "</octave>"], xml(_q, note.pitch.octave)));
        }
        elements.push((_r = ["<pitch>\n", "\n</pitch>"], _r.raw = ["<pitch>\\n", "\\n</pitch>"], dangerous(_r, pitchElements.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
    }
    else if (note.unpitched) {
        // <!ELEMENT unpitched ((display-step, display-octave)?)>
        var upChildren = [];
        if (note.unpitched.displayStep) {
            upChildren.push((_s = ["<display-step>", "</display-step>"], _s.raw = ["<display-step>", "</display-step>"], xml(_s, note.unpitched.displayStep)));
        }
        if (note.unpitched.displayOctave) {
            upChildren.push((_t = ["<display-octave>", "</display-octave>"], _t.raw = ["<display-octave>", "</display-octave>"], xml(_t, note.unpitched.displayOctave)));
        }
        elements.push((_u = ["<unpitched>\n", "\n</unpitched>"], _u.raw = ["<unpitched>\\n", "\\n</unpitched>"], dangerous(_u, upChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
    }
    else if (note.rest) {
        var restAttribs = "";
        var restChildren = [];
        if (note.rest.displayStep) {
            restChildren.push("<display-step>" + note.rest.displayStep + "</display-step>");
        }
        if (note.rest.displayOctave) {
            restChildren.push("<display-octave>" + note.rest.displayOctave + "</display-octave>");
        }
        if (note.rest.measure !== undefined && note.rest.measure !== null) {
            restAttribs += (_v = [" measure=\"", "\""], _v.raw = [" measure=\"", "\""], yesNo(_v, note.rest.measure));
        }
        elements.push((_w = ["<rest", ">\n", "\n</rest>"], _w.raw = ["<rest", ">\\n", "\\n</rest>"], dangerous(_w, restAttribs, restChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
    }
    if (!note.grace && note.duration) {
        elements.push((_x = ["<duration>", "</duration>"], _x.raw = ["<duration>", "</duration>"], xml(_x, note.duration)));
    }
    if (note.ties && note.ties.length) {
        var tieAttribs = (_y = [" type=\"", "\""], _y.raw = [" type=\"", "\""], xml(_y, note.ties[0].type === StartStop.Stop ? "stop" : "start"));
        elements.push((_z = ["<tie", " />"], _z.raw = ["<tie", " />"], dangerous(_z, tieAttribs)));
    }
    // ...
    // instrument?, %editorial-voice;, type?, dot*,
    // ...
    if (note.instrument) {
        elements.push((_0 = ["<instrument id=\"", "\" />"], _0.raw = ["<instrument id=\"", "\" />"], xml(_0, note.instrument.id)));
    }
    elements = elements.concat(editorialVoiceToXML(note));
    if (note.noteType && defined(note.noteType.duration)) {
        elements.push((_1 = ["<type>", "</type>"], _1.raw = ["<type>", "</type>"], xml(_1, countToXML[note.noteType.duration])));
    }
    (note.dots || []).forEach(function () {
        elements.push((_a = ["<dot />"], _a.raw = ["<dot />"], xml(_a)));
        var _a;
    });
    // ...
    // accidental?, time-modification?, stem?, notehead?,
    // ...
    if (note.accidental) {
        var accidentalAttribs = "";
        if (note.accidental.editorial !== undefined && note.accidental.editorial !== null) {
            accidentalAttribs += (_2 = [" editorial=\"", "\""], _2.raw = [" editorial=\"", "\""], yesNo(_2, note.accidental.editorial));
        }
        if (note.accidental.cautionary !== undefined && note.accidental.cautionary !== null) {
            accidentalAttribs += (_3 = [" cautionary=\"", "\""], _3.raw = [" cautionary=\"", "\""], yesNo(_3, note.accidental.cautionary));
        }
        elements.push((_4 = ["<accidental", ">", "</accidental>"], _4.raw = ["<accidental", ">", "</accidental>"], dangerous(_4, accidentalAttribs, accidentalToXML[note.accidental.accidental]))); // (safe)
    }
    if (note.timeModification) {
        var timeModificationChildren = [];
        // <!ELEMENT time-modification
        // 	(actual-notes, normal-notes,
        // 	(normal-type, normal-dot*)?)>
        // <!ELEMENT actual-notes (#PCDATA)>
        // <!ELEMENT normal-notes (#PCDATA)>
        // <!ELEMENT normal-type (#PCDATA)>
        // <!ELEMENT normal-dot EMPTY>
        if (note.timeModification.actualNotes) {
            timeModificationChildren.push((_5 = ["<actual-notes>", "</actual-notes>"], _5.raw = ["<actual-notes>", "</actual-notes>"], xml(_5, note.timeModification.actualNotes)));
        }
        if (note.timeModification.normalNotes) {
            timeModificationChildren.push((_6 = ["<normal-notes>", "</normal-notes>"], _6.raw = ["<normal-notes>", "</normal-notes>"], xml(_6, note.timeModification.normalNotes)));
        }
        if (note.timeModification.normalType) {
            timeModificationChildren.push((_7 = ["<normal-type>", "</normal-type>"], _7.raw = ["<normal-type>", "</normal-type>"], xml(_7, note.timeModification.normalType)));
        }
        (note.timeModification.normalDots || []).forEach(function () {
            timeModificationChildren.push((_a = ["<normal-dot />"], _a.raw = ["<normal-dot />"], xml(_a)));
            var _a;
        });
        elements.push((_8 = ["<time-modification>\n", "\n</time-modification>"], _8.raw = ["<time-modification>\\n", "\\n</time-modification>"], dangerous(_8, timeModificationChildren
            .join("\n").split("\n").map(function (n) { return "  " + n; }).join("\n"))));
    }
    if (note.stem) {
        var stemAttribs = "" +
            positionToXML(note.stem) +
            colorToXML(note.color);
        elements.push((_9 = ["<stem", ">", "</stem>"], _9.raw = ["<stem", ">", "</stem>"], dangerous(_9, stemAttribs, stemToXML[note.stem.type]))); // (safe)
    }
    if (note.notehead) {
        var hattribs = "" +
            fontToXML(note.notehead) +
            colorToXML(note.color);
        if (defined(note.notehead.filled)) {
            hattribs += (_10 = [" filled=\"", "\""], _10.raw = [" filled=\"", "\""], yesNo(_10, note.notehead.filled));
        }
        if (defined(note.notehead.parentheses)) {
            hattribs += (_11 = [" parentheses=\"", "\""], _11.raw = [" parentheses=\"", "\""], yesNo(_11, note.notehead.parentheses));
        }
        elements.push((_12 = ["<notehead", ">", "</notehead>"], _12.raw = ["<notehead", ">", "</notehead>"], dangerous(_12, hattribs, noteheadTypeToXML[note.notehead.type])));
    }
    // ...
    // notehead-text?, staff?, beam*, notations*, lyric*, play?)>
    // ...
    if (defined(note.noteheadText)) {
        // <!ELEMENT notehead-text
        //     ((display-text | accidental-text)+)>
        elements = elements.concat(textArrayToXML(note.noteheadText.text));
    }
    if (!isNaN(note.staff)) {
        elements.push((_13 = ["<staff>", "</staff>"], _13.raw = ["<staff>", "</staff>"], xml(_13, note.staff)));
    }
    (note.beams || []).forEach(function (beam) {
        var beamAttribs = (_a = [" number=\"", "\""], _a.raw = [" number=\"", "\""], xml(_a, beam.number));
        if (defined(beam.repeater)) {
            beamAttribs += (_b = [" repeater=\"", "\""], _b.raw = [" repeater=\"", "\""], yesNo(_b, beam.repeater));
        }
        if (defined(beam.fan)) {
            beamAttribs += (_c = [" fan=\"", "\""], _c.raw = [" fan=\"", "\""], xml(_c, accelRitNoneToXML[beam.fan]));
        }
        elements.push((_d = ["<beam", ">", "</beam>"], _d.raw = ["<beam", ">", "</beam>"], dangerous(_d, beamAttribs, beamTypeToXML[beam.type]))); // safe
        var _a, _b, _c, _d;
    });
    (note.notations || []).forEach(function (notation) {
        /**
            * <!ELEMENT notations
            *      (%editorial;,
            *       (tied | slur | tuplet | glissando | slide |
            *        ornaments | technical | articulations | dynamics |
            *        fermata | arpeggiate | non-arpeggiate |
            *        accidental-mark | other-notation)*)>
            *  <!ATTLIST notations
            *      %print-object;
            *  >
            *
            *  <!ENTITY % print-object
            *      "print-object  %yes-no;  #IMPLIED">
            *  <!ENTITY % editorial "(footnote?, level?)">
            */
        var notationsAttribs = "";
        var nChildren = [];
        if (defined(notation.printObject)) {
            notationsAttribs += (_a = [" print-object=\"", "\""], _a.raw = [" print-object=\"", "\""], yesNo(_a, notation.printObject));
        }
        nChildren = nChildren.concat(editorialToXML(notation));
        (notation.tieds || []).forEach(function (tied) {
            // <!ATTLIST tied
            //     type %start-stop-continue; #REQUIRED
            //     number %number-level; #IMPLIED
            //     %line-type;
            //     %dashed-formatting;
            //     %position;
            //     %placement;
            //     %orientation;
            //     %bezier;
            //     %color;
            // >
            nChildren.push((_a = ["<tied", " />"], _a.raw = ["<tied", " />"], dangerous(_a, startStopContinueToXML(tied) +
                numberLevelToXML(tied) +
                lineTypeToXML(tied) +
                dashedFormattingToXML(tied) +
                positionToXML(tied) +
                placementToXML(tied) +
                orientationToXML(tied) +
                bezierToXML(tied) +
                colorToXML(tied))));
            var _a;
        });
        (notation.slurs || []).forEach(function (slur) {
            // <!ATTLIST slur
            //     type %start-stop-continue; #REQUIRED
            //     number %number-level; "1"
            //     %line-type;
            //     %dashed-formatting;
            //     %position;
            //     %placement;
            //     %orientation;
            //     %bezier;
            //     %color;
            // >
            nChildren.push((_a = ["<slur", " />"], _a.raw = ["<slur", " />"], dangerous(_a, startStopContinueToXML(slur) +
                numberLevelToXML(slur) +
                lineTypeToXML(slur) +
                dashedFormattingToXML(slur) +
                positionToXML(slur) +
                placementToXML(slur) +
                orientationToXML(slur) +
                bezierToXML(slur) +
                colorToXML(slur))));
            var _a;
        });
        (notation.tuplets || []).forEach(function (tuplet) {
            // <!ELEMENT tuplet (tuplet-actual?, tuplet-normal?)>
            // <!ATTLIST tuplet
            //     type %start-stop; #REQUIRED
            //     number %number-level; #IMPLIED
            //     bracket %yes-no; #IMPLIED
            //     show-number (actual | both | none) #IMPLIED
            //     show-type (actual | both | none) #IMPLIED
            //     %line-shape;
            //     %position;
            //     %placement;
            // >
            // <!ELEMENT tuplet-actual (tuplet-number?,
            //     tuplet-type?, tuplet-dot*)>
            // <!ELEMENT tuplet-normal (tuplet-number?,
            //     tuplet-type?, tuplet-dot*)>
            // <!ELEMENT tuplet-number (#PCDATA)>
            // <!ATTLIST tuplet-number
            //     %font;
            //     %color;
            // >
            // <!ELEMENT tuplet-type (#PCDATA)>
            // <!ATTLIST tuplet-type
            //     %font;
            //     %color;
            // >
            // <!ELEMENT tuplet-dot EMPTY>
            // <!ATTLIST tuplet-dot
            //     %font;
            //     %color;
            // >
            var tattribs = "" +
                startStopToXML(tuplet) +
                numberLevelToXML(tuplet);
            if (defined(tuplet.bracket)) {
                tattribs += (_a = [" bracket=\"", "\""], _a.raw = [" bracket=\"", "\""], yesNo(_a, tuplet.bracket));
            }
            if (defined(tuplet.showNumber)) {
                tattribs += (_b = [" show-number=\"", "\""], _b.raw = [" show-number=\"", "\""], xml(_b, actualBothNoneToXML[tuplet.showNumber]));
            }
            if (defined(tuplet.showType)) {
                tattribs += (_c = [" show-type=\"", "\""], _c.raw = [" show-type=\"", "\""], xml(_c, actualBothNoneToXML[tuplet.showType]));
            }
            tattribs += lineShapeToXML(tuplet);
            tattribs += positionToXML(tuplet);
            tattribs += placementToXML(tuplet);
            var tChildren = [];
            [["tuplet-actual", "tupletActual"], ["tuplet-normal", "tupletNormal"]].forEach(function (tup) {
                var data = tuplet[tup[1]];
                if (!data) {
                    return;
                }
                var dataChildren = [];
                if (data.tupletNumber) {
                    var num = data.tupletNumber;
                    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, num.text));
                    dataChildren.push((_b = ["<tuplet-number", ">", "</tuplet-number>"], _b.raw = ["<tuplet-number", ">", "</tuplet-number>"], dangerous(_b, fontToXML(num) + colorToXML(num), pcdata)));
                }
                if (data.tupletType) {
                    var type = data.tupletType;
                    var pcdata = (_c = ["", ""], _c.raw = ["", ""], xml(_c, type.text));
                    dataChildren.push((_d = ["<tuplet-type", ">", "</tuplet-type>"], _d.raw = ["<tuplet-type", ">", "</tuplet-type>"], dangerous(_d, fontToXML(type) + colorToXML(type), pcdata)));
                }
                (data.tupletDots || []).forEach(function (dot) {
                    dataChildren.push((_a = ["<tuplet-dot", " />"], _a.raw = ["<tuplet-dot", " />"], dangerous(_a, fontToXML(dot) + colorToXML(dot))));
                    var _a;
                });
                tChildren.push((_e = ["<", ">\n", "\n</", ">"], _e.raw = ["<", ">\\n", "\\n</", ">"], dangerous(_e, tup[0], dataChildren.join("\n").split("\n")
                    .map(function (n) { return "  " + n; }).join("\n"), tup[0])));
                var _a, _b, _c, _d, _e;
            });
            nChildren.push((_d = ["<tuplet", ">\n", "\n</tuplet>"], _d.raw = ["<tuplet", ">\\n", "\\n</tuplet>"], dangerous(_d, tattribs, tChildren.join("\n").split("\n")
                .map(function (n) { return "  " + n; }).join("\n"))));
            var _a, _b, _c, _d;
        });
        (notation.glissandos || []).forEach(function (glissando) {
            // <!ELEMENT glissando (#PCDATA)>
            // <!ATTLIST glissando
            //     type %start-stop; #REQUIRED
            //     number %number-level; "1"
            //     %line-type;
            //     %dashed-formatting;
            //     %print-style;
            // >
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, glissando.text));
            nChildren.push((_b = ["<glissando", ">", "</glissando>"], _b.raw = ["<glissando", ">", "</glissando>"], dangerous(_b, startStopToXML(glissando) +
                numberLevelToXML(glissando) +
                lineTypeToXML(glissando) +
                dashedFormattingToXML(glissando) +
                printStyleToXML(glissando), pcdata)));
            var _a, _b;
        });
        (notation.slides || []).forEach(function (slide) {
            // <!ELEMENT slide (#PCDATA)>
            // <!ATTLIST slide
            //     type %start-stop; #REQUIRED
            //     number %number-level; "1"
            //     %line-type;
            //     %dashed-formatting;
            //     %print-style;
            //     %bend-sound;
            // >
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, slide.text));
            nChildren.push((_b = ["<slide", ">", "</slide>"], _b.raw = ["<slide", ">", "</slide>"], dangerous(_b, startStopToXML(slide) +
                numberLevelToXML(slide) +
                lineTypeToXML(slide) +
                dashedFormattingToXML(slide) +
                printStyleToXML(slide) +
                bendSoundToXML(slide), pcdata)));
            var _a, _b;
        });
        (notation.ornaments || []).forEach(function (ornaments) {
            // <!ELEMENT ornaments
            //     (((trill-mark | turn | delayed-turn | inverted-turn |
            //        delayed-inverted-turn | vertical-turn | shake |
            //        wavy-line | mordent | inverted-mordent | schleifer |
            //        tremolo | other-ornament), accidental-mark*)*)>
            var oChildren = [];
            // <!ELEMENT trill-mark EMPTY>
            // <!ATTLIST trill-mark
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            // >
            if (ornaments.trillMark) {
                oChildren.push((_a = ["<trill-mark", " />"], _a.raw = ["<trill-mark", " />"], dangerous(_a, printStyleToXML(ornaments.trillMark) +
                    placementToXML(ornaments.trillMark) +
                    trillSoundToXML(ornaments.trillMark))));
            }
            // <!ATTLIST turn
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            //     slash %yes-no; #IMPLIED
            // >
            if (ornaments.turn) {
                oChildren.push((_b = ["<turn", " />"], _b.raw = ["<turn", " />"], dangerous(_b, printStyleToXML(ornaments.turn) +
                    placementToXML(ornaments.turn) +
                    trillSoundToXML(ornaments.turn) +
                    slashToXML(ornaments.turn))));
            }
            // <!ATTLIST delayed-turn
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            //     slash %yes-no; #IMPLIED
            // >
            if (ornaments.delayedTurn) {
                oChildren.push((_c = ["<delayed-turn", " />"], _c.raw = ["<delayed-turn", " />"], dangerous(_c, printStyleToXML(ornaments.delayedTurn) +
                    placementToXML(ornaments.delayedTurn) +
                    trillSoundToXML(ornaments.delayedTurn) +
                    slashToXML(ornaments.delayedTurn))));
            }
            // <!ATTLIST inverted-turn
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            //     slash %yes-no; #IMPLIED
            // >
            if (ornaments.invertedTurn) {
                oChildren.push((_d = ["<inverted-turn", " />"], _d.raw = ["<inverted-turn", " />"], dangerous(_d, printStyleToXML(ornaments.invertedTurn) +
                    placementToXML(ornaments.invertedTurn) +
                    trillSoundToXML(ornaments.invertedTurn) +
                    slashToXML(ornaments.invertedTurn))));
            }
            // <!ATTLIST delayed-inverted-turn
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            //     slash %yes-no; #IMPLIED
            // >
            if (ornaments.delayedInvertedTurn) {
                oChildren.push((_e = ["<delayed-inverted-turn", " />"], _e.raw = ["<delayed-inverted-turn", " />"], dangerous(_e, printStyleToXML(ornaments.delayedInvertedTurn) +
                    placementToXML(ornaments.delayedInvertedTurn) +
                    trillSoundToXML(ornaments.delayedInvertedTurn) +
                    slashToXML(ornaments.delayedInvertedTurn))));
            }
            // <!ATTLIST vertical-turn
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            // >
            if (ornaments.verticalTurn) {
                oChildren.push((_f = ["<vertical-turn", " />"], _f.raw = ["<vertical-turn", " />"], dangerous(_f, printStyleToXML(ornaments.verticalTurn) +
                    placementToXML(ornaments.verticalTurn) +
                    trillSoundToXML(ornaments.verticalTurn))));
            }
            // 
            // <!ATTLIST shake
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            // >
            if (ornaments.shake) {
                oChildren.push((_g = ["<shake", " />"], _g.raw = ["<shake", " />"], dangerous(_g, printStyleToXML(ornaments.shake) +
                    placementToXML(ornaments.shake) +
                    trillSoundToXML(ornaments.shake))));
            }
            // 
            // <!ATTLIST mordent
            //     long %yes-no; #IMPLIED
            //     approach %above-below; #IMPLIED
            //     departure %above-below; #IMPLIED
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            // >
            if (ornaments.mordent) {
                oChildren.push((_h = ["<mordent", " />"], _h.raw = ["<mordent", " />"], dangerous(_h, mordentSubsetToXML(ornaments.mordent) +
                    printStyleToXML(ornaments.mordent) +
                    placementToXML(ornaments.mordent) +
                    trillSoundToXML(ornaments.mordent))));
            }
            // <!ATTLIST inverted-mordent
            //     long %yes-no; #IMPLIED
            //     approach %above-below; #IMPLIED
            //     departure %above-below; #IMPLIED
            //     %print-style;
            //     %placement;
            //     %trill-sound;
            // >
            if (ornaments.invertedMordent) {
                oChildren.push((_j = ["<inverted-mordent", " />"], _j.raw = ["<inverted-mordent", " />"], dangerous(_j, mordentSubsetToXML(ornaments.invertedMordent) +
                    printStyleToXML(ornaments.invertedMordent) +
                    placementToXML(ornaments.invertedMordent) +
                    trillSoundToXML(ornaments.invertedMordent))));
            }
            // 
            // <!ATTLIST schleifer
            //     %print-style;
            //     %placement;
            // >
            if (ornaments.schleifer) {
                oChildren.push((_k = ["<schleifer", " />"], _k.raw = ["<schleifer", " />"], dangerous(_k, printStyleToXML(ornaments.schleifer) +
                    placementToXML(ornaments.schleifer))));
            }
            // 
            // <!ELEMENT tremolo (#PCDATA)>
            // <!ATTLIST tremolo
            //     type %start-stop-single; "single"
            //     %print-style;
            //     %placement;
            // >
            if (ornaments.tremolo) {
                var pcdata = (_l = ["", ""], _l.raw = ["", ""], xml(_l, ornaments.tremolo.data || ""));
                oChildren.push((_m = ["<tremolo", ">", "</tremolo>"], _m.raw = ["<tremolo", ">", "</tremolo>"], dangerous(_m, startStopSingleToXML(ornaments.tremolo) +
                    printStyleToXML(ornaments.tremolo) +
                    placementToXML(ornaments.tremolo), pcdata)));
            }
            // 
            // <!ELEMENT other-ornament (#PCDATA)>
            // <!ATTLIST other-ornament
            //     %print-style;
            //     %placement;
            // >
            if (ornaments.otherOrnament) {
                var pcdata = (_o = ["", ""], _o.raw = ["", ""], xml(_o, ornaments.otherOrnament.data || ""));
                oChildren.push((_p = ["<other-ornament", ">", "</other-ornament>"], _p.raw = ["<other-ornament", ">", "</other-ornament>"], dangerous(_p, printStyleToXML(ornaments.otherOrnament) +
                    placementToXML(ornaments.otherOrnament), pcdata)));
            }
            // 
            // <!ELEMENT accidental-mark (#PCDATA)>
            // <!ATTLIST accidental-mark
            //     %print-style;
            //     %placement;
            // >
            (ornaments.accidentalMarks || []).forEach(function (accidentalMark) {
                var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, accidentalMark.mark || ""));
                oChildren.push((_b = ["<accidental-mark", ">", "</accidental-mark>"], _b.raw = ["<accidental-mark", ">", "</accidental-mark>"], dangerous(_b, printStyleToXML(accidentalMark) +
                    placementToXML(accidentalMark), pcdata)));
                var _a, _b;
            });
            nChildren.push((_q = ["<ornaments>\n", "\n</ornaments>"], _q.raw = ["<ornaments>\\n", "\\n</ornaments>"], dangerous(_q, oChildren.join("\n").split("\n")
                .map(function (n) { return "  " + n; }).join("\n"))));
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        });
        (notation.technicals || []).forEach(function (technical) {
            var oChildren = [];
            // <!ELEMENT technical
            //     ((up-bow | down-bow | harmonic | open-string |
            //       thumb-position | fingering | pluck | double-tongue |
            //       triple-tongue | stopped | snap-pizzicato | fret |
            //       string | hammer-on | pull-off | bend | tap | heel |
            //       toe | fingernails | hole | arrow | handbell |
            //       other-technical)*)>
            // 
            // <!ATTLIST up-bow
            //     %print-style;
            //     %placement;
            // >
            if (technical.upBow) {
                oChildren.push((_a = ["<up-bow", " />"], _a.raw = ["<up-bow", " />"], dangerous(_a, printStyleToXML(technical.upBow) +
                    placementToXML(technical.upBow))));
            }
            // <!ATTLIST down-bow
            //     %print-style;
            //     %placement;
            // >
            if (technical.downBow) {
                oChildren.push((_b = ["<down-bow", " />"], _b.raw = ["<down-bow", " />"], dangerous(_b, printStyleToXML(technical.downBow) +
                    placementToXML(technical.downBow))));
            }
            // <!ELEMENT harmonic
            //     ((natural | artificial)?,
            //      (base-pitch | touching-pitch | sounding-pitch)?)>
            // <!ATTLIST harmonic
            //     %print-object;
            //     %print-style;
            //     %placement;
            // >
            if (technical.harmonic) {
                var hChildren = [];
                // <!ELEMENT natural EMPTY>
                // <!ELEMENT artificial EMPTY>
                // <!ELEMENT base-pitch EMPTY>
                // <!ELEMENT touching-pitch EMPTY>
                // <!ELEMENT sounding-pitch EMPTY>
                if (technical.harmonic.natural) {
                    hChildren.push((_c = ["<natural />"], _c.raw = ["<natural />"], xml(_c)));
                }
                if (technical.harmonic.artificial) {
                    hChildren.push((_d = ["<artificial />"], _d.raw = ["<artificial />"], xml(_d)));
                }
                if (technical.harmonic.basePitch) {
                    hChildren.push((_e = ["<base-pitch />"], _e.raw = ["<base-pitch />"], xml(_e)));
                }
                if (technical.harmonic.touchingPitch) {
                    hChildren.push((_f = ["<touching-pitch />"], _f.raw = ["<touching-pitch />"], xml(_f)));
                }
                if (technical.harmonic.soundingPitch) {
                    hChildren.push((_g = ["<sounding-pitch />"], _g.raw = ["<sounding-pitch />"], xml(_g)));
                }
                oChildren.push((_h = ["<harmonic", ">", "\n</harmonic>"], _h.raw = ["<harmonic", ">", "\\n</harmonic>"], dangerous(_h, printObjectToXML(technical.harmonic) +
                    printStyleToXML(technical.harmonic) +
                    placementToXML(technical.harmonic), hChildren.join("\n").split("\n")
                    .map(function (n) { return "  " + n; }).join("\n"))));
            }
            // <!ATTLIST open-string
            //     %print-style;
            //     %placement;
            // >
            if (technical.openString) {
                oChildren.push((_j = ["<open-string", " />"], _j.raw = ["<open-string", " />"], dangerous(_j, printStyleToXML(technical.openString) +
                    placementToXML(technical.openString))));
            }
            // 
            // <!ATTLIST thumb-position
            //     %print-style;
            //     %placement;
            // >
            if (technical.thumbPosition) {
                oChildren.push((_k = ["<thumb-position", " />"], _k.raw = ["<thumb-position", " />"], dangerous(_k, printStyleToXML(technical.thumbPosition) +
                    placementToXML(technical.thumbPosition))));
            }
            // 
            // <!ELEMENT pluck (#PCDATA)>
            // <!ATTLIST pluck
            //     %print-style;
            //     %placement;
            // >
            if (technical.pluck) {
                oChildren.push((_l = ["<pluck", " />"], _l.raw = ["<pluck", " />"], dangerous(_l, printStyleToXML(technical.pluck) +
                    placementToXML(technical.pluck))));
            }
            // 
            // <!ATTLIST double-tongue
            //     %print-style;
            //     %placement;
            // >
            if (technical.doubleTongue) {
                oChildren.push((_m = ["<double-tongue", " />"], _m.raw = ["<double-tongue", " />"], dangerous(_m, printStyleToXML(technical.doubleTongue) +
                    placementToXML(technical.doubleTongue))));
            }
            // 
            // <!ATTLIST triple-tongue
            //     %print-style;
            //     %placement;
            // >
            if (technical.tripleTongue) {
                oChildren.push((_o = ["<triple-tongue", " />"], _o.raw = ["<triple-tongue", " />"], dangerous(_o, printStyleToXML(technical.tripleTongue) +
                    placementToXML(technical.tripleTongue))));
            }
            // 
            // <!ATTLIST stopped
            //     %print-style;
            //     %placement;
            // >
            if (technical.stopped) {
                oChildren.push((_p = ["<stopped", " />"], _p.raw = ["<stopped", " />"], dangerous(_p, printStyleToXML(technical.stopped) +
                    placementToXML(technical.stopped))));
            }
            // 
            // <!ATTLIST snap-pizzicato
            //     %print-style;
            //     %placement;
            // >
            if (technical.snapPizzicato) {
                oChildren.push((_q = ["<snap-pizzicato", " />"], _q.raw = ["<snap-pizzicato", " />"], dangerous(_q, printStyleToXML(technical.snapPizzicato) +
                    placementToXML(technical.snapPizzicato))));
            }
            // 
            // <!ELEMENT hammer-on (#PCDATA)>
            // <!ATTLIST hammer-on
            //     type %start-stop; #REQUIRED
            //     number %number-level; "1"
            //     %print-style;
            //     %placement;
            // >
            if (technical.hammerOn) {
                var pcdata = (_r = ["", ""], _r.raw = ["", ""], xml(_r, technical.hammerOn.data));
                oChildren.push((_s = ["<hammer-on", ">", "</hammer-on>"], _s.raw = ["<hammer-on", ">", "</hammer-on>"], dangerous(_s, startStopToXML(technical.hammerOn) +
                    numberLevelToXML(technical.hammerOn) +
                    printStyleToXML(technical.hammerOn) +
                    placementToXML(technical.hammerOn), pcdata)));
            }
            // <!ELEMENT pull-off (#PCDATA)>
            // <!ATTLIST pull-off
            //     type %start-stop; #REQUIRED
            //     number %number-level; "1"
            //     %print-style;
            //     %placement;
            // >
            if (technical.pullOff) {
                var pcdata = (_t = ["", ""], _t.raw = ["", ""], xml(_t, technical.pullOff.data));
                oChildren.push((_u = ["<pull-off", ">", "</pull-off>"], _u.raw = ["<pull-off", ">", "</pull-off>"], dangerous(_u, startStopToXML(technical.pullOff) +
                    numberLevelToXML(technical.pullOff) +
                    printStyleToXML(technical.pullOff) +
                    placementToXML(technical.pullOff), pcdata)));
            }
            // 
            // <!ELEMENT bend
            //     (bend-alter, (pre-bend | release)?, with-bar?)>
            // <!ATTLIST bend
            //     %print-style;
            //     %bend-sound;
            // >
            // <!ELEMENT bend-alter (#PCDATA)>
            // <!ELEMENT pre-bend EMPTY>
            // <!ELEMENT release EMPTY>
            // <!ELEMENT with-bar (#PCDATA)>
            // <!ATTLIST with-bar
            //     %print-style;
            //     %placement;
            // >
            if (technical.bend) {
                var bendChildren = [];
                if (defined(technical.bend.bendAlter)) {
                    bendChildren.push((_v = ["<bend-alter>", "</bend-alter>"], _v.raw = ["<bend-alter>", "</bend-alter>"], xml(_v, technical.bend.bendAlter)));
                }
                if (defined(technical.bend.preBend)) {
                    bendChildren.push((_w = ["<pre-bend />"], _w.raw = ["<pre-bend />"], xml(_w)));
                }
                else if (defined(technical.bend.release)) {
                    bendChildren.push((_x = ["<release />"], _x.raw = ["<release />"], xml(_x)));
                }
                if (defined(technical.bend.withBar)) {
                    var pcdata = (_y = ["", ""], _y.raw = ["", ""], xml(_y, technical.bend.withBar.data));
                    bendChildren.push((_z = ["<with-bar", ">", "</with-bar>"], _z.raw = ["<with-bar", ">", "</with-bar>"], dangerous(_z, printStyleToXML(technical.bend.withBar) +
                        placementToXML(technical.bend.withBar), pcdata)));
                }
                oChildren.push((_0 = ["<bend", ">\n", "\n</bend>"], _0.raw = ["<bend", ">\\n", "\\n</bend>"], dangerous(_0, printStyleToXML(technical.bend) +
                    bendSoundToXML(technical.bend), bendChildren.join("\n").split("\n")
                    .map(function (n) { return "  " + n; }).join("\n"))));
            }
            // 
            // <!ELEMENT tap (#PCDATA)>
            // <!ATTLIST tap
            //     %print-style;
            //     %placement;
            // >
            if (technical.tap) {
                var pcdata = (_1 = ["", ""], _1.raw = ["", ""], xml(_1, technical.tap.data));
                oChildren.push((_2 = ["<tap", ">", "</tap>"], _2.raw = ["<tap", ">", "</tap>"], dangerous(_2, printStyleToXML(technical.tap) +
                    placementToXML(technical.tap), pcdata)));
            }
            // 
            // <!ATTLIST heel
            //     substitution %yes-no; #IMPLIED
            //     %print-style;
            //     %placement;
            // >
            if (technical.heel) {
                var substitution = "";
                if (defined(technical.heel.substitution)) {
                    substitution += (_3 = [" substitution=\"", "\""], _3.raw = [" substitution=\"", "\""], yesNo(_3, technical.heel.substitution));
                }
                oChildren.push((_4 = ["<heel", " />"], _4.raw = ["<heel", " />"], dangerous(_4, substitution +
                    printStyleToXML(technical.heel) +
                    placementToXML(technical.heel))));
            }
            // <!ATTLIST toe
            //     substitution %yes-no; #IMPLIED
            //     %print-style;
            //     %placement;
            // >
            if (technical.toe) {
                var substitution = "";
                if (defined(technical.toe.substitution)) {
                    substitution += (_5 = [" substitution=\"", "\""], _5.raw = [" substitution=\"", "\""], yesNo(_5, technical.toe.substitution));
                }
                oChildren.push((_6 = ["<toe", " />"], _6.raw = ["<toe", " />"], dangerous(_6, substitution +
                    printStyleToXML(technical.toe) +
                    placementToXML(technical.toe))));
            }
            // 
            // <!ATTLIST fingernails
            //     %print-style;
            //     %placement;
            // >
            if (technical.fingernails) {
                oChildren.push((_7 = ["<fingernails", " />"], _7.raw = ["<fingernails", " />"], dangerous(_7, printStyleToXML(technical.fingernails) +
                    placementToXML(technical.fingernails))));
            }
            // 
            // <!ELEMENT hole (hole-type?, hole-closed, hole-shape?)>
            // <!ATTLIST hole
            //     %print-style;
            //     %placement;
            // >
            // <!ELEMENT hole-type (#PCDATA)>
            // <!ELEMENT hole-closed (#PCDATA)>
            // <!ATTLIST hole-closed
            //     location (right | bottom | left | top) #IMPLIED
            // >
            // <!ELEMENT hole-shape (#PCDATA)>
            if (technical.hole) {
                var holeChildren = [];
                if (defined(technical.hole.holeType)) {
                    holeChildren.push((_8 = ["<hole-type>", "</hole-type>"], _8.raw = ["<hole-type>", "</hole-type>"], xml(_8, technical.hole.holeType)));
                }
                if (defined(technical.hole.holeClosed)) {
                    var holeClosedAttribs = "";
                    if (defined(technical.hole.holeClosed.location)) {
                        holeClosedAttribs = (_9 = [" location=\"", "\""], _9.raw = [" location=\"", "\""], xml(_9, holeLocationToXML[technical.hole.holeClosed.location]));
                    }
                    holeChildren.push((_10 = ["<hole-closed", ">", "</hole-closed>"], _10.raw = ["<hole-closed", ">", "</hole-closed>"], dangerous(_10, holeClosedAttribs, holeClosedTypeToXML[technical.hole.holeClosed.data])));
                }
                if (defined(technical.hole.holeShape)) {
                    holeChildren.push((_11 = ["<hole-shape>", "</hole-shape>"], _11.raw = ["<hole-shape>", "</hole-shape>"], xml(_11, technical.hole.holeShape)));
                }
                oChildren.push((_12 = ["<hole", ">", "\n</hole>"], _12.raw = ["<hole", ">", "\\n</hole>"], dangerous(_12, printStyleToXML(technical.hole) +
                    placementToXML(technical.hole), holeChildren.join("\n").split("\n")
                    .map(function (n) { return "  " + n; }).join("\n"))));
            }
            // 
            // <!ELEMENT arrow
            //     ((arrow-direction, arrow-style?) | circular-arrow)>
            // <!ATTLIST arrow
            //     %print-style;
            //     %placement;
            // >
            // <!ELEMENT arrow-direction (#PCDATA)>
            // <!ELEMENT arrow-style (#PCDATA)>
            // <!ELEMENT circular-arrow (#PCDATA)>
            if (technical.arrow) {
                var arrowChildren = [];
                if (defined(technical.arrow.arrowDirection)) {
                    arrowChildren.push((_13 = ["<arrow-direction>\n                        ", "</arrow-direction>"], _13.raw = ["<arrow-direction>\n                        ", "</arrow-direction>"], xml(_13, technical.arrow.arrowDirection)));
                }
                if (defined(technical.arrow.arrowStyle)) {
                    arrowChildren.push((_14 = ["<arrow-style>\n                        ", "</arrow-style>"], _14.raw = ["<arrow-style>\n                        ", "</arrow-style>"], xml(_14, technical.arrow.arrowStyle)));
                }
                if (defined(technical.arrow.circularArrow)) {
                    arrowChildren.push((_15 = ["<circular-arrow>>\n                        ", "</circular-arrow>"], _15.raw = ["<circular-arrow>>\n                        ", "</circular-arrow>"], xml(_15, technical.arrow.circularArrow)));
                }
                oChildren.push((_16 = ["<arrow", ">", "\n</arrow>"], _16.raw = ["<arrow", ">", "\\n</arrow>"], dangerous(_16, printStyleToXML(technical.arrow) +
                    placementToXML(technical.arrow), arrowChildren.join("\n").split("\n")
                    .map(function (n) { return "  " + n; }).join("\n"))));
            }
            // 
            // <!ELEMENT handbell (#PCDATA)>
            // <!ATTLIST handbell
            //     %print-style;
            //     %placement;
            // >
            if (technical.handbell) {
                var pcdata = (_17 = ["", ""], _17.raw = ["", ""], xml(_17, technical.handbell.data));
                oChildren.push((_18 = ["<handbell", ">", "</handbell>"], _18.raw = ["<handbell", ">", "</handbell>"], dangerous(_18, printStyleToXML(technical.handbell) +
                    placementToXML(technical.handbell), pcdata)));
            }
            // 
            // <!ELEMENT other-technical (#PCDATA)>
            // <!ATTLIST other-technical
            //     %print-style;
            //     %placement;
            // >
            if (technical.otherTechnical) {
                var pcdata = (_19 = ["", ""], _19.raw = ["", ""], xml(_19, technical.otherTechnical.data));
                oChildren.push((_20 = ["<other-technical", ">", "</other-technical>"], _20.raw = ["<other-technical", ">", "</other-technical>"], dangerous(_20, printStyleToXML(technical.otherTechnical) +
                    placementToXML(technical.otherTechnical), pcdata)));
            }
            nChildren.push((_21 = ["<technical>\n", "\n</technical>"], _21.raw = ["<technical>\\n", "\\n</technical>"], dangerous(_21, oChildren.join("\n").split("\n")
                .map(function (n) { return "  " + n; }).join("\n"))));
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21;
        });
        (notation.articulations || []).forEach(function (articulation) {
            var oChildren = [];
            // <!ELEMENT articulations
            //     ((accent | strong-accent | staccato | tenuto |
            //       detached-legato | staccatissimo | spiccato |
            //       scoop | plop | doit | falloff | breath-mark |
            //       caesura | stress | unstress | other-articulation)*)>
            // 
            // <!ATTLIST accent
            //     %print-style;
            //     %placement;
            // >
            if (articulation.accent) {
                oChildren.push((_a = ["<accent", " />"], _a.raw = ["<accent", " />"], dangerous(_a, printStyleToXML(articulation.accent) +
                    placementToXML(articulation.accent))));
            }
            // <!ATTLIST strong-accent
            //     %print-style;
            //     %placement;
            //     type %up-down; "up"
            // >
            if (articulation.strongAccent) {
                oChildren.push((_b = ["<strong-accent", " />"], _b.raw = ["<strong-accent", " />"], dangerous(_b, printStyleToXML(articulation.strongAccent) +
                    placementToXML(articulation.strongAccent) +
                    upDownToXML(articulation.strongAccent))));
            }
            // 
            // <!ATTLIST staccato
            //     %print-style;
            //     %placement;
            // >
            if (articulation.staccato) {
                oChildren.push((_c = ["<staccato", " />"], _c.raw = ["<staccato", " />"], dangerous(_c, printStyleToXML(articulation.staccato) +
                    placementToXML(articulation.staccato))));
            }
            // <!ATTLIST tenuto
            //     %print-style;
            //     %placement;
            // >
            if (articulation.tenuto) {
                oChildren.push((_d = ["<tenuto", " />"], _d.raw = ["<tenuto", " />"], dangerous(_d, printStyleToXML(articulation.tenuto) +
                    placementToXML(articulation.tenuto))));
            }
            // <!ATTLIST detached-legato
            //     %print-style;
            //     %placement;
            // >
            if (articulation.detachedLegato) {
                oChildren.push((_e = ["<detached-legato", " />"], _e.raw = ["<detached-legato", " />"], dangerous(_e, printStyleToXML(articulation.detachedLegato) +
                    placementToXML(articulation.detachedLegato))));
            }
            // 
            // <!ATTLIST staccatissimo
            //     %print-style;
            //     %placement;
            // >
            if (articulation.staccatissimo) {
                oChildren.push((_f = ["<staccatissimo", " />"], _f.raw = ["<staccatissimo", " />"], dangerous(_f, printStyleToXML(articulation.staccatissimo) +
                    placementToXML(articulation.staccatissimo))));
            }
            // 
            // <!ATTLIST spiccato
            //     %print-style;
            //     %placement;
            // >
            if (articulation.spiccato) {
                oChildren.push((_g = ["<spiccato", " />"], _g.raw = ["<spiccato", " />"], dangerous(_g, printStyleToXML(articulation.spiccato) +
                    placementToXML(articulation.spiccato))));
            }
            // 
            // <!ATTLIST scoop
            //     %line-shape;
            //     %line-type;
            //     %dashed-formatting;
            //     %print-style;
            //     %placement;
            // >
            if (articulation.scoop) {
                oChildren.push((_h = ["<scoop", " />"], _h.raw = ["<scoop", " />"], dangerous(_h, lineShapeToXML(articulation.scoop) +
                    lineTypeToXML(articulation.scoop) +
                    dashedFormattingToXML(articulation.scoop) +
                    printStyleToXML(articulation.scoop) +
                    placementToXML(articulation.scoop))));
            }
            // <!ATTLIST plop
            //     %line-shape;
            //     %line-type;
            //     %dashed-formatting;
            //     %print-style;
            //     %placement;
            // >
            if (articulation.plop) {
                oChildren.push((_j = ["<plop", " />"], _j.raw = ["<plop", " />"], dangerous(_j, lineShapeToXML(articulation.plop) +
                    lineTypeToXML(articulation.plop) +
                    dashedFormattingToXML(articulation.plop) +
                    printStyleToXML(articulation.plop) +
                    placementToXML(articulation.plop))));
            }
            // <!ATTLIST doit
            //     %line-shape;
            //     %line-type;
            //     %dashed-formatting;
            //     %print-style;
            //     %placement;
            // >
            if (articulation.doit) {
                oChildren.push((_k = ["<doit", " />"], _k.raw = ["<doit", " />"], dangerous(_k, lineShapeToXML(articulation.doit) +
                    lineTypeToXML(articulation.doit) +
                    dashedFormattingToXML(articulation.doit) +
                    printStyleToXML(articulation.doit) +
                    placementToXML(articulation.doit))));
            }
            // <!ATTLIST falloff
            //     %line-shape;
            //     %line-type;
            //     %dashed-formatting;
            //     %print-style;
            //     %placement;
            // >
            if (articulation.falloff) {
                oChildren.push((_l = ["<falloff", " />"], _l.raw = ["<falloff", " />"], dangerous(_l, lineShapeToXML(articulation.falloff) +
                    lineTypeToXML(articulation.falloff) +
                    dashedFormattingToXML(articulation.falloff) +
                    printStyleToXML(articulation.falloff) +
                    placementToXML(articulation.falloff))));
            }
            // 
            // <!ELEMENT breath-mark (#PCDATA)>
            // <!ATTLIST breath-mark
            //     %print-style;
            //     %placement;
            // >
            if (articulation.breathMark) {
                var pcdata = (_m = ["", ""], _m.raw = ["", ""], xml(_m, breathMarkTypeToXML[articulation.breathMark.type]));
                oChildren.push((_o = ["<breath-mark", ">", "</breath-mark>"], _o.raw = ["<breath-mark", ">", "</breath-mark>"], dangerous(_o, printStyleToXML(articulation.breathMark) +
                    placementToXML(articulation.breathMark), pcdata)));
            }
            // 
            // <!ATTLIST caesura
            //     %print-style;
            //     %placement;
            // >
            if (articulation.caesura) {
                oChildren.push((_p = ["<caesura", " />"], _p.raw = ["<caesura", " />"], dangerous(_p, printStyleToXML(articulation.caesura) +
                    placementToXML(articulation.caesura))));
            }
            // <!ATTLIST stress
            //     %print-style;
            //     %placement;
            // >
            if (articulation.stress) {
                oChildren.push((_q = ["<stress", " />"], _q.raw = ["<stress", " />"], dangerous(_q, printStyleToXML(articulation.stress) +
                    placementToXML(articulation.stress))));
            }
            // <!ATTLIST unstress
            //     %print-style;
            //     %placement;
            // >
            if (articulation.unstress) {
                oChildren.push((_r = ["<unstress", " />"], _r.raw = ["<unstress", " />"], dangerous(_r, printStyleToXML(articulation.unstress) +
                    placementToXML(articulation.unstress))));
            }
            // <!ELEMENT other-articulation (#PCDATA)>
            // <!ATTLIST other-articulation
            //     %print-style;
            //     %placement;
            // >
            (articulation.otherArticulations || []).forEach(function (articulation) {
                var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, articulation.data));
                oChildren.push((_b = ["<other-articulation", ">", "</other-articulation>"], _b.raw = ["<other-articulation", ">", "</other-articulation>"], dangerous(_b, printStyleToXML(articulation) +
                    placementToXML(articulation), pcdata)));
                var _a, _b;
            });
            nChildren.push((_s = ["<articulations>\n", "\n</articulations>"], _s.raw = ["<articulations>\\n", "\\n</articulations>"], dangerous(_s, oChildren.join("\n").split("\n")
                .map(function (n) { return "  " + n; }).join("\n"))));
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        });
        (notation.dynamics || []).forEach(function (dynamics) {
            nChildren.push(dynamicsToXML(dynamics));
        });
        (notation.fermatas || []).forEach(function (fermata) {
            nChildren.push(fermataToXML(fermata));
        });
        (notation.arpeggiates || []).forEach(function (arpeggiate) {
            // <!ATTLIST arpeggiate
            //     number %number-level; #IMPLIED
            //     direction %up-down; #IMPLIED
            //     %position;
            //     %placement;
            //     %color;
            // >
            nChildren.push((_a = ["<arpeggiate", " />"], _a.raw = ["<arpeggiate", " />"], dangerous(_a, numberLevelToXML(arpeggiate) +
                upDownToXML(arpeggiate) +
                positionToXML(arpeggiate) +
                placementToXML(arpeggiate) +
                colorToXML(arpeggiate))));
            var _a;
        });
        (notation.nonArpeggiates || []).forEach(function (nonArpeggiate) {
            // <!ATTLIST non-arpeggiate
            //     type %top-bottom; #REQUIRED
            //     number %number-level; #IMPLIED
            //     %position;
            //     %placement;
            //     %color;
            // >
            nChildren.push((_a = ["<non-arpeggiate", " />"], _a.raw = ["<non-arpeggiate", " />"], dangerous(_a, topBottomToXML(nonArpeggiate) +
                numberLevelToXML(nonArpeggiate) +
                positionToXML(nonArpeggiate) +
                placementToXML(nonArpeggiate) +
                colorToXML(nonArpeggiate))));
            var _a;
        });
        (notation.accidentalMarks || []).forEach(function (accidentalMark) {
            // <!ELEMENT accidental-mark (#PCDATA)>
            // <!ATTLIST accidental-mark
            //     %print-style;
            //     %placement;
            // >
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, accidentalMark.mark));
            nChildren.push((_b = ["<accidental-mark", ">", "</accidental-mark>"], _b.raw = ["<accidental-mark", ">", "</accidental-mark>"], dangerous(_b, printStyleToXML(accidentalMark) +
                placementToXML(accidentalMark), pcdata)));
            var _a, _b;
        });
        (notation.otherNotations || []).forEach(function (otherNotation) {
            // <!ELEMENT other-notation (#PCDATA)>
            // <!ATTLIST other-notation
            //     type %start-stop-single; #REQUIRED
            //     number %number-level; "1"
            //     %print-object;
            //     %print-style;
            //     %placement;
            // >
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, otherNotation.data));
            nChildren.push((_b = ["<other-notation", ">", "</other-notation>"], _b.raw = ["<other-notation", ">", "</other-notation>"], dangerous(_b, startStopSingleToXML(otherNotation) +
                numberLevelToXML(otherNotation) +
                printObjectToXML(otherNotation) +
                printStyleToXML(otherNotation) +
                placementToXML(otherNotation), pcdata)));
            var _a, _b;
        });
        elements.push((_b = ["<notations", ">\n", "\n</notations>"], _b.raw = ["<notations", ">\\n", "\\n</notations>"], dangerous(_b, notationsAttribs, nChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a, _b;
    });
    (note.lyrics || []).forEach(function (lyric) {
        // <!ELEMENT lyric
        //     ((((syllabic?, text),
        //        (elision?, syllabic?, text)*, extend?) |
        //        extend | laughing | humming),
        //       end-line?, end-paragraph?, %editorial;)>
        // <!ATTLIST lyric
        //     number NMTOKEN #IMPLIED
        //     name CDATA #IMPLIED
        //     %justify;
        //     %position;
        //     %placement;
        //     %color;
        //     %print-object;
        // >
        // TODO: should validate other (e.g., no end-paragraph after syllabic)
        var lyricAttribs = "" +
            numberLevelToXML(lyric) +
            nameToXML(lyric) +
            justifyToXML(lyric) +
            positionToXML(lyric) +
            placementToXML(lyric) +
            colorToXML(lyric) +
            printObjectToXML(lyric);
        var lyricChildren = [];
        (lyric.lyricParts || []).forEach(function (part) {
            // relies on part._class as set in musicxml-interfaces
            switch (part._class) {
                case "Syllabic":
                    // <!ELEMENT syllabic (#PCDATA)>
                    lyricChildren.push((_a = ["<syllabic>", "</syllabic>"], _a.raw = ["<syllabic>", "</syllabic>"], dangerous(_a, syllabicTypeToXML[part.data])));
                    break;
                case "Text":
                    // <!ELEMENT text (#PCDATA)>
                    // <!ATTLIST text
                    //     %font;
                    //     %color;
                    //     %text-decoration;
                    //     %text-rotation;
                    //     %letter-spacing;
                    //     xml:lang NMTOKEN #IMPLIED TODO musicxml-interfaces
                    //     %text-direction;
                    var textpcdata = (_b = ["", ""], _b.raw = ["", ""], xml(_b, part.data));
                    lyricChildren.push((_c = ["<text", ">", "</text>"], _c.raw = ["<text", ">", "</text>"], dangerous(_c, fontToXML(part) +
                        colorToXML(part) +
                        textDecorationToXML(part) +
                        textRotationToXML(part) +
                        letterSpacingToXML(part) +
                        textDirectionToXML(part), textpcdata)));
                    break;
                case "Elision":
                    // <!ELEMENT elision (#PCDATA)>
                    // <!ATTLIST elision
                    //     %font;
                    //     %color;
                    // >
                    var pcdata = (_d = ["", ""], _d.raw = ["", ""], xml(_d, part.data));
                    lyricChildren.push((_e = ["<elision", ">", "</elision>"], _e.raw = ["<elision", ">", "</elision>"], dangerous(_e, startStopContinueToXML(part) +
                        printStyleToXML(part), pcdata)));
                    break;
                case "Extend":
                    // <!ELEMENT extend EMPTY>
                    // <!ATTLIST extend
                    //     type %start-stop-continue; #IMPLIED
                    //     %print-style;
                    // >
                    lyricChildren.push((_f = ["<extend", " />"], _f.raw = ["<extend", " />"], dangerous(_f, startStopContinueToXML(part) +
                        printStyleToXML(part))));
                    break;
                case "Laughing":
                    // <!ELEMENT laughing EMPTY>
                    lyricChildren.push((_g = ["<laughing />"], _g.raw = ["<laughing />"], xml(_g)));
                    break;
                case "Humming":
                    // <!ELEMENT humming EMPTY>
                    lyricChildren.push((_h = ["<humming />"], _h.raw = ["<humming />"], xml(_h)));
                    break;
                case "EndLine":
                    // <!ELEMENT end-line EMPTY>
                    lyricChildren.push((_j = ["<end-line />"], _j.raw = ["<end-line />"], xml(_j)));
                    break;
                case "EndParagraph":
                    // <!ELEMENT end-paragraph EMPTY>
                    lyricChildren.push((_k = ["<end-paragraph />"], _k.raw = ["<end-paragraph />"], xml(_k)));
                    break;
                case "Footnote":
                case "Level":
                case "Editorial":
                    lyricChildren = lyricChildren.concat(editorialToXML(part));
                    break;
            }
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        });
        elements.push((_a = ["<lyric", ">\n", "\n</lyric>"], _a.raw = ["<lyric", ">\\n", "\\n</lyric>"], dangerous(_a, lyricAttribs, lyricChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a;
    });
    if (defined(note.play)) {
        // <!ELEMENT play ((ipa | mute | semi-pitched | other-play)*)>
        // <!ATTLIST play
        //     id IDREF #IMPLIED
        // >
        var playAttribs = "";
        var playChildren = [];
        // TODO: musicxml-interfaces is missing play.id!!
        // if (defined(note.play.id)) {
        //     playAttribs += xml ` id="${note.play.id}"`;
        // }
        // <!ELEMENT ipa (#PCDATA)>
        if (defined(note.play.ipa)) {
            playChildren.push((_14 = ["<ipa>", "</ipa>"], _14.raw = ["<ipa>", "</ipa>"], xml(_14, note.play.ipa)));
        }
        // <!ELEMENT mute (#PCDATA)>
        if (defined(note.play.mute)) {
            playChildren.push((_15 = ["<mute>", "</mute>"], _15.raw = ["<mute>", "</mute>"], xml(_15, note.play.mute)));
        }
        // <!ELEMENT semi-pitched (#PCDATA)>
        if (defined(note.play.semiPitched)) {
            playChildren.push((_16 = ["<semi-pitched>", "</semi-pitched>"], _16.raw = ["<semi-pitched>", "</semi-pitched>"], xml(_16, note.play.semiPitched)));
        }
        // <!ELEMENT other-play (#PCDATA)>
        // <!ATTLIST other-play
        //     type CDATA #REQUIRED
        // >
        if (defined(note.play.otherPlay)) {
            var oPcdata = (_17 = ["", ""], _17.raw = ["", ""], xml(_17, note.play.otherPlay.data));
            var oAttribs = "";
            if (defined(note.play.otherPlay.type)) {
                oAttribs += (_18 = [" type=\"", "\""], _18.raw = [" type=\"", "\""], xml(_18, note.play.otherPlay.type));
            }
            playChildren.push((_19 = ["<other-play", ">", "</other-play>"], _19.raw = ["<other-play", ">", "</other-play>"], dangerous(_19, oAttribs, oPcdata)));
        }
        elements.push((_20 = ["<play", ">\n", "\n</play>"], _20.raw = ["<play", ">\\n", "\\n</play>"], dangerous(_20, playAttribs, playChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
    }
    return (_21 = ["<note", ">\n", "\n</note>"], _21.raw = ["<note", ">\\n", "\\n</note>"], dangerous(_21, attribs, elements.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21;
}
function figuredBassToXML(figuredBass) {
    // <!ELEMENT figured-bass (figure+, duration?, %editorial;)>
    // <!ATTLIST figured-bass
    //     %print-style;
    //     %printout;
    //     parentheses %yes-no; #IMPLIED
    // >
    var attribs = "" +
        printStyleToXML(figuredBass) +
        printoutToXML(figuredBass);
    if (defined(figuredBass.parentheses)) {
        attribs += (_a = [" parentheses=\"", "\""], _a.raw = [" parentheses=\"", "\""], yesNo(_a, figuredBass.parentheses));
    }
    var children = [];
    children = children.concat(staffDebugInfoToXMLComment(figuredBass));
    (figuredBass.figures || []).forEach(function (figure) {
        // <!ELEMENT figure (prefix?, figure-number?, suffix?, extend?)>
        var fChildren = [];
        // <!ELEMENT prefix (#PCDATA)>
        // <!ATTLIST prefix
        //     %print-style;
        // >
        if (defined(figure.prefix)) {
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, figure.prefix.data));
            fChildren.push((_b = ["<prefix", ">", "</prefix>"], _b.raw = ["<prefix", ">", "</prefix>"], dangerous(_b, printStyleToXML(figure.prefix), pcdata)));
        }
        // <!ELEMENT figure-number (#PCDATA)>
        // <!ATTLIST figure-number
        //     %print-style;
        // >
        if (defined(figure.figureNumber)) {
            var pcdata = (_c = ["", ""], _c.raw = ["", ""], xml(_c, figure.figureNumber.data));
            fChildren.push((_d = ["<figure-number", ">", "</figure-number>"], _d.raw = ["<figure-number", ">", "</figure-number>"], dangerous(_d, printStyleToXML(figure.figureNumber), pcdata)));
        }
        // <!ELEMENT suffix (#PCDATA)>
        // <!ATTLIST suffix
        //     %print-style;
        // >
        if (defined(figure.suffix)) {
            var pcdata = (_e = ["", ""], _e.raw = ["", ""], xml(_e, figure.suffix.data));
            fChildren.push((_f = ["<suffix", ">", "</suffix>"], _f.raw = ["<suffix", ">", "</suffix>"], dangerous(_f, printStyleToXML(figure.suffix), pcdata)));
        }
        children.push((_g = ["<figure>\n", "\n</figure>"], _g.raw = ["<figure>\\n", "\\n</figure>"], dangerous(_g, fChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a, _b, _c, _d, _e, _f, _g;
    });
    if (defined(figuredBass.duration)) {
        children.push((_b = ["<duration>", "</duration>"], _b.raw = ["<duration>", "</duration>"], xml(_b, figuredBass.duration)));
    }
    children = children.concat(editorialToXML(figuredBass));
    return (_c = ["<figured-bass", ">\n", "\n</figured-bass>"], _c.raw = ["<figured-bass", ">\\n", "\\n</figured-bass>"], dangerous(_c, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
var barlineLocationToXML = {
    1: "right",
    2: "middle",
    0: "left"
};
function barlineToXML(barline) {
    // <!ELEMENT barline (bar-style?, %editorial;, wavy-line?,
    //     segno?, coda?, (fermata, fermata?)?, ending?, repeat?)>
    // <!ATTLIST barline
    //     location (right | left | middle) "right"
    //     segno CDATA #IMPLIED
    //     coda CDATA #IMPLIED
    //     divisions CDATA #IMPLIED
    // >
    var children = [];
    var attribs = "";
    children = children.concat(staffDebugInfoToXMLComment(barline));
    if (defined(barline.barStyle)) {
        children.push(barStyleToXML(barline.barStyle));
    }
    children = children.concat(editorialToXML(barline));
    if (defined(barline.wavyLine)) {
        children.push(wavyLineToXML(barline.wavyLine));
    }
    if (defined(barline.segno)) {
        children.push(segnoToXML(barline.segno));
    }
    if (defined(barline.coda)) {
        children.push(codaToXML(barline.coda));
    }
    (barline.fermatas || []).forEach(function (fermata) {
        children.push(fermataToXML(fermata));
    });
    if (defined(barline.ending)) {
        children.push(endingToXML(barline.ending));
    }
    if (defined(barline.repeat)) {
        children.push(repeatToXML(barline.repeat));
    }
    if (defined(barline.location)) {
        attribs += (_a = [" location=\"", "\""], _a.raw = [" location=\"", "\""], xml(_a, barlineLocationToXML[barline.location]));
    }
    if (defined(barline.segnoAttrib)) {
        attribs += (_b = [" segno=\"", "\""], _b.raw = [" segno=\"", "\""], xml(_b, barline.segnoAttrib));
    }
    if (defined(barline.codaAttrib)) {
        attribs += (_c = [" coda=\"", "\""], _c.raw = [" coda=\"", "\""], xml(_c, barline.codaAttrib));
    }
    if (defined(barline.divisions)) {
        attribs += (_d = [" divisions=\"", "\""], _d.raw = [" divisions=\"", "\""], xml(_d, barline.divisions));
    }
    return (_e = ["<barline", ">\n", "\n</barline>"], _e.raw = ["<barline", ">\\n", "\\n</barline>"], dangerous(_e, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e;
}
function directionTypeToXML(d) {
    // <!ELEMENT direction-type (rehearsal+ | segno+ | words+ |
    var children = [];
    (d.rehearsals || []).forEach(function (rehearsal) {
        children.push(rehearsalToXML(rehearsal));
    });
    (d.segnos || []).forEach(function (segno) {
        children.push(segnoToXML(segno));
    });
    (d.words || []).forEach(function (words) {
        children.push(wordsToXML(words));
    });
    //     coda+ | wedge | dynamics+ | dashes | bracket | pedal |
    (d.codas || []).forEach(function (coda) {
        children.push(codaToXML(coda));
    });
    if (defined(d.wedge)) {
        children.push(wedgeToXML(d.wedge));
    }
    if (defined(d.dynamics)) {
        children.push(dynamicsToXML(d.dynamics));
    }
    if (defined(d.dashes)) {
        children.push(dashesToXML(d.dashes));
    }
    if (defined(d.bracket)) {
        children.push(bracketToXML(d.bracket));
    }
    if (defined(d.pedal)) {
        children.push(pedalToXML(d.pedal));
    }
    //     metronome | octave-shift | harp-pedals | damp | damp-all |
    if (defined(d.metronome)) {
        children.push(metronomeToXML(d.metronome));
    }
    if (defined(d.octaveShift)) {
        children.push(octaveShiftToXML(d.octaveShift));
    }
    if (defined(d.harpPedals)) {
        children.push(harpPedalsToXML(d.harpPedals));
    }
    if (defined(d.damp)) {
        children.push(dampToXML(d.damp));
    }
    if (defined(d.dampAll)) {
        children.push(dampAllToXML(d.dampAll));
    }
    //     eyeglasses | string-mute | scordatura | image |
    if (defined(d.eyeglasses)) {
        children.push(eyeglassesToXML(d.eyeglasses));
    }
    if (defined(d.stringMute)) {
        children.push(stringMuteToXML(d.stringMute));
    }
    if (defined(d.scordatura)) {
        children.push(scordaturaToXML(d.scordatura));
    }
    if (defined(d.image)) {
        children.push(imageToXML(d.image));
    }
    //     principal-voice | accordion-registration | percussion+ |
    if (defined(d.principalVoice)) {
        children.push(principalVoiceToXML(d.principalVoice));
    }
    if (defined(d.accordionRegistration)) {
        children.push(accordionRegistrationToXML(d.accordionRegistration));
    }
    (d.percussions || []).forEach(function (p) {
        children.push(percussionToXML(p));
    });
    //     other-direction)>
    if (defined(d.otherDirection)) {
        children.push(otherDirectionToXML(d.otherDirection));
    }
    return (_a = ["<direction-type>\n", "\n</direction-type>"], _a.raw = ["<direction-type>\\n", "\\n</direction-type>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function offsetToXML(offset) {
    // <!ELEMENT offset (#PCDATA)>
    // <!ATTLIST offset
    //     sound %yes-no; #IMPLIED
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, offset.data || ""));
    var attribs = (_b = [" sound=\"", "\""], _b.raw = [" sound=\"", "\""], yesNo(_b, offset.sound));
    return (_c = ["<offset", ">", "</offset>"], _c.raw = ["<offset", ">", "</offset>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function rehearsalToXML(rehearsal) {
    // <!ELEMENT rehearsal (#PCDATA)>
    // <!ATTLIST rehearsal
    //     %text-formatting;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, rehearsal.data));
    return (_b = ["<rehearsal", ">", "</rehearsal>"], _b.raw = ["<rehearsal", ">", "</rehearsal>"], dangerous(_b, textFormattingToXML(rehearsal), pcdata));
    var _a, _b;
}
function wordsToXML(words) {
    // <!ELEMENT words (#PCDATA)>
    // <!ATTLIST words
    //     %text-formatting;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, words.data));
    return (_b = ["<words", ">", "</words>"], _b.raw = ["<words", ">", "</words>"], dangerous(_b, textFormattingToXML(words), pcdata));
    var _a, _b;
}
var wedgeTypeToXML = (_d = {},
    _d[WedgeType.Diminuendo] = "diminuendo",
    _d[WedgeType.Crescendo] = "crescendo",
    _d[WedgeType.Stop] = "stop",
    _d[WedgeType.Continue] = "continue",
    _d
);
function wedgeToXML(wedge) {
    // <!ELEMENT wedge EMPTY>
    // <!ATTLIST wedge
    //     type (crescendo | diminuendo | stop | continue) #REQUIRED
    //     number %number-level; #IMPLIED
    //     spread %tenths; #IMPLIED
    //     niente %yes-no; #IMPLIED
    //     %line-type;
    //     %dashed-formatting;
    //     %position;
    //     %color;
    // >
    var attribs = "" +
        (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, wedgeTypeToXML[wedge.type])) +
        numberLevelToXML(wedge);
    if (defined(wedge.spread)) {
        attribs += (_b = [" spread=\"", "\""], _b.raw = [" spread=\"", "\""], xml(_b, wedge.spread));
    }
    if (defined(wedge.niente)) {
        attribs += (_c = [" niente=\"", "\""], _c.raw = [" niente=\"", "\""], yesNo(_c, wedge.niente));
    }
    attribs +=
        lineTypeToXML(wedge) +
            dashedFormattingToXML(wedge) +
            positionToXML(wedge) +
            colorToXML(wedge);
    return (_d = ["<wedge", " />"], _d.raw = ["<wedge", " />"], dangerous(_d, attribs));
    var _a, _b, _c, _d;
}
function dynamicsToXML(dynamics) {
    // <!ELEMENT dynamics ((p | pp | ppp | pppp | ppppp | pppppp |
    //     f | ff | fff | ffff | fffff | ffffff | mp | mf | sf |
    //     sfp | sfpp | fp | rf | rfz | sfz | sffz | fz |
    //     other-dynamics)*)>
    // <!ATTLIST dynamics
    //     %print-style-align;
    //     %placement;
    //     %text-decoration;
    //     %enclosure;
    // >
    // <!ELEMENT p EMPTY>
    // ...
    // <!ELEMENT other-dynamics (#PCDATA)>
    var oChildren = [];
    Object.keys(dynamics || {}).forEach(function (key) {
        var subDynamic = dynamics[key];
        if (!!subDynamic && ["p", "pp", "ppp", "pppp", "ppppp", "pppppp",
            "f", "ff", "fff", "ffff", "fffff", "ffffff", "mp", "mf", "sf",
            "sfp", "sfpp", "fp", "rf", "rfz", "sfz", "sffz", "fz"].indexOf(key) !== -1) {
            oChildren.push((_a = ["<", " />"], _a.raw = ["<", " />"], dangerous(_a, key)));
        }
        var _a;
    });
    if (dynamics.otherDynamics) {
        oChildren.push((_a = ["<other-dynamics>", "</other-dynamics>"], _a.raw = ["<other-dynamics>", "</other-dynamics>"], xml(_a, dynamics.otherDynamics)));
    }
    return (_b = ["<dynamics", ">\n", "\n</dynamics>"], _b.raw = ["<dynamics", ">\\n", "\\n</dynamics>"], dangerous(_b, printStyleAlignToXML(dynamics) +
        placementToXML(dynamics) +
        textDecorationToXML(dynamics) +
        enclosureToXML(dynamics), oChildren.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function dashesToXML(dashes) {
    // <!ELEMENT dashes EMPTY>
    // <!ATTLIST dashes
    //     type %start-stop-continue; #REQUIRED
    //     number %number-level; #IMPLIED
    //     %dashed-formatting;
    //     %position;
    //     %color;
    // >
    var attribs = "" +
        startStopContinueToXML(dashes) +
        numberLevelToXML(dashes) +
        dashedFormattingToXML(dashes) +
        positionToXML(dashes) +
        colorToXML(dashes);
    return (_a = ["<dashes", " />"], _a.raw = ["<dashes", " />"], dangerous(_a, attribs));
    var _a;
}
var lineEndTypeToXML = (_e = {},
    _e[LineEndType.None] = "none",
    _e[LineEndType.Both] = "both",
    _e[LineEndType.Arrow] = "arrow",
    _e[LineEndType.Down] = "down",
    _e[LineEndType.Up] = "up",
    _e
);
function bracketToXML(bracket) {
    // <!ELEMENT bracket EMPTY>
    // <!ATTLIST bracket
    //     type %start-stop-continue; #REQUIRED
    //     number %number-level; #IMPLIED
    //     line-end (up | down | both | arrow | none) #REQUIRED
    //     end-length %tenths; #IMPLIED
    //     %line-type;
    //     %dashed-formatting;
    //     %position;
    //     %color;
    // >
    var attribs = "" +
        startStopContinueToXML(bracket) +
        numberLevelToXML(bracket);
    attribs += (_a = [" line-end=\"", "\""], _a.raw = [" line-end=\"", "\""], xml(_a, lineEndTypeToXML[bracket.lineEnd]));
    if (defined(bracket.endLength)) {
        attribs += (_b = [" end-length=\"", "\""], _b.raw = [" end-length=\"", "\""], xml(_b, bracket.endLength));
    }
    attribs +=
        lineTypeToXML(bracket) +
            dashedFormattingToXML(bracket) +
            positionToXML(bracket) +
            colorToXML(bracket);
    return (_c = ["<bracket", " />"], _c.raw = ["<bracket", " />"], dangerous(_c, attribs));
    var _a, _b, _c;
}
var pedalTypeToXML = (_f = {},
    _f[PedalType.Change] = "change",
    _f[PedalType.Start] = "start",
    _f[PedalType.Stop] = "stop",
    _f[PedalType.Continue] = "continue",
    _f
);
function pedalToXML(pedal) {
    // <!ELEMENT pedal EMPTY>
    // <!ATTLIST pedal
    //     type (start | stop | continue | change) #REQUIRED
    //     line %yes-no; #IMPLIED
    //     sign %yes-no; #IMPLIED
    //     %print-style-align;
    // >
    var attribs = "" +
        (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, pedalTypeToXML[pedal.type]));
    if (defined(pedal.line)) {
        attribs += (_b = [" line=\"", "\""], _b.raw = [" line=\"", "\""], yesNo(_b, pedal.line));
    }
    if (defined(pedal.sign)) {
        attribs += (_c = [" sign=\"", "\""], _c.raw = [" sign=\"", "\""], yesNo(_c, pedal.sign));
    }
    attribs += printStyleAlignToXML(pedal);
    return (_d = ["<pedal", " />"], _d.raw = ["<pedal", " />"], dangerous(_d, attribs));
    var _a, _b, _c, _d;
}
function metronomeToXML(metronome) {
    // <!ELEMENT metronome
    //     ((beat-unit, beat-unit-dot*,
    //      (per-minute | (beat-unit, beat-unit-dot*))) |
    //     (metronome-note+, (metronome-relation, metronome-note+)?))>
    // <!ATTLIST metronome
    //     %print-style-align;
    //     %justify;
    //     parentheses %yes-no; #IMPLIED
    // >
    var children = [];
    var attribs = "" +
        printStyleAlignToXML(metronome) +
        justifyToXML(metronome);
    if (defined(metronome.parentheses)) {
        attribs += (_a = [" parentheses=\"", "\""], _a.raw = [" parentheses=\"", "\""], yesNo(_a, metronome.parentheses));
    }
    if (defined(metronome.beatUnit)) {
        // <!ELEMENT beat-unit (#PCDATA)>
        children.push((_b = ["<beat-unit>", "</beat-unit>"], _b.raw = ["<beat-unit>", "</beat-unit>"], xml(_b, metronome.beatUnit)));
    }
    (metronome.beatUnitDots || []).forEach(function () {
        // <!ELEMENT beat-unit-dot EMPTY>
        children.push((_a = ["<beat-unit-dot />"], _a.raw = ["<beat-unit-dot />"], xml(_a)));
        var _a;
    });
    if (defined(metronome.perMinute)) {
        // <!ELEMENT per-minute (#PCDATA)>
        // <!ATTLIST per-minute
        //     %font;
        // >
        var pcdata = (_c = ["", ""], _c.raw = ["", ""], xml(_c, metronome.perMinute.data));
        children.push((_d = ["<per-minute", ">", "</per-minute>"], _d.raw = ["<per-minute", ">", "</per-minute>"], dangerous(_d, fontToXML(metronome.perMinute), pcdata)));
    }
    else {
        if (defined(metronome.beatUnitChange)) {
            // <!ELEMENT beat-unit (#PCDATA)>
            children.push((_e = ["<beat-unit>", "</beat-unit>"], _e.raw = ["<beat-unit>", "</beat-unit>"], xml(_e, metronome.beatUnitChange)));
        }
        (metronome.beatUnitDotsChange || []).forEach(function () {
            // <!ELEMENT beat-unit-dot EMPTY>
            children.push((_a = ["<beat-unit-dot />"], _a.raw = ["<beat-unit-dot />"], xml(_a)));
            var _a;
        });
    }
    // TODO musicxml-interfaces second beat-unit!!
    (metronome.metronomeNotes || []).forEach(function (note) {
        // <!ELEMENT metronome-note
        //     (metronome-type, metronome-dot*,
        //      metronome-beam*, metronome-tuplet?)>
        var oChildren = [];
        if (defined(note.metronomeType)) {
            // <!ELEMENT metronome-type (#PCDATA)>
            oChildren.push((_a = ["<metronome-type>", "</metronome-type>"], _a.raw = ["<metronome-type>", "</metronome-type>"], xml(_a, note.metronomeType)));
        }
        (note.metronomeDots || []).forEach(function () {
            // <!ELEMENT metronome-dot EMPTY>
            oChildren.push((_a = ["<metronome-dot />"], _a.raw = ["<metronome-dot />"], xml(_a)));
            var _a;
        });
        (note.metronomeBeams || []).forEach(function (beam) {
            // <!ELEMENT metronome-beam (#PCDATA)>
            // <!ATTLIST metronome-beam
            //     number %beam-level; "1"
            // >
            var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, beam.data));
            oChildren.push((_b = ["<metronome-beam", ">", "</metronome-beam>"], _b.raw = ["<metronome-beam", ">", "</metronome-beam>"], dangerous(_b, numberLevelToXML(beam), pcdata)));
            var _a, _b;
        });
        if (defined(note.metronomeTuplet)) {
            oChildren.push(metronomeTupletToXML(note.metronomeTuplet));
        }
        children.push((_b = ["<metronome-note>\n", "\n</metronome-note>"], _b.raw = ["<metronome-note>\\n", "\\n</metronome-note>"], dangerous(_b, oChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a, _b;
    });
    if (defined(metronome.metronomeRelation)) {
        // <!ELEMENT metronome-relation (#PCDATA)>
        children.push((_f = ["<metronome-relation>", "</metronome-relation>"], _f.raw = ["<metronome-relation>", "</metronome-relation>"], xml(_f, metronome.metronomeRelation)));
    }
    return (_g = ["<metronome", ">\n", "\n</metronome>"], _g.raw = ["<metronome", ">\\n", "\\n</metronome>"], dangerous(_g, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g;
}
function metronomeTupletToXML(metronomeTuplet) {
    // <!ELEMENT metronome-tuplet
    //     (actual-notes, normal-notes,
    //      (normal-type, normal-dot*)?)>
    // <!ATTLIST metronome-tuplet
    //     type %start-stop; #REQUIRED
    //     bracket %yes-no; #IMPLIED
    //     show-number (actual | both | none) #IMPLIED
    // >
    var children = [];
    var attribs = "" +
        startStopToXML(metronomeTuplet);
    if (defined(metronomeTuplet.bracket)) {
        attribs += (_a = [" bracket=\"", "\""], _a.raw = [" bracket=\"", "\""], yesNo(_a, metronomeTuplet.bracket));
    }
    if (defined(metronomeTuplet.showNumber)) {
        attribs += (_b = [" show-number=\"", "\""], _b.raw = [" show-number=\"", "\""], xml(_b, actualBothNoneToXML[metronomeTuplet.showNumber]));
    }
    if (metronomeTuplet.actualNotes) {
        children.push((_c = ["<actual-notes>", "</actual-notes>"], _c.raw = ["<actual-notes>", "</actual-notes>"], xml(_c, metronomeTuplet.actualNotes)));
    }
    if (metronomeTuplet.normalNotes) {
        children.push((_d = ["<normal-notes>", "</normal-notes>"], _d.raw = ["<normal-notes>", "</normal-notes>"], xml(_d, metronomeTuplet.normalNotes)));
    }
    if (metronomeTuplet.normalType) {
        children.push((_e = ["<normal-type>", "</normal-type>"], _e.raw = ["<normal-type>", "</normal-type>"], xml(_e, metronomeTuplet.normalType)));
    }
    (metronomeTuplet.normalDots || []).forEach(function () {
        children.push((_a = ["<normal-dot />"], _a.raw = ["<normal-dot />"], xml(_a)));
        var _a;
    });
    return (_f = ["<metronome-tuplet", ">\n", "\n</metronome-tuplet>"], _f.raw = ["<metronome-tuplet", ">\\n", "\\n</metronome-tuplet>"], dangerous(_f, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f;
}
var octaveShiftTypeToXML = (_g = {},
    _g[OctaveShiftType.Down] = "down",
    _g[OctaveShiftType.Stop] = "stop",
    _g[OctaveShiftType.Up] = "up",
    _g[OctaveShiftType.Continue] = "continue",
    _g
);
function octaveShiftToXML(octaveShift) {
    // <!ELEMENT octave-shift EMPTY>
    // <!ATTLIST octave-shift
    //     type (up | down | stop | continue) #REQUIRED
    //     number %number-level; #IMPLIED
    //     size CDATA "8"
    //     %dashed-formatting;
    //     %print-style;
    // >
    var attribs = "" +
        (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, octaveShiftTypeToXML[octaveShift.type])) +
        numberLevelToXML(octaveShift);
    if (defined(octaveShift.size)) {
        attribs += (_b = [" size=\"", "\""], _b.raw = [" size=\"", "\""], xml(_b, octaveShift.size));
    }
    attribs +=
        dashedFormattingToXML(octaveShift) +
            printStyleToXML(octaveShift);
    return (_c = ["<octave-shift", " />"], _c.raw = ["<octave-shift", " />"], dangerous(_c, attribs));
    var _a, _b, _c;
}
function harpPedalsToXML(harpPedals) {
    // <!ELEMENT harp-pedals (pedal-tuning)+>
    // <!ATTLIST harp-pedals
    //     %print-style-align;
    // >
    // <!ELEMENT pedal-tuning (pedal-step, pedal-alter)>
    // <!ELEMENT pedal-step (#PCDATA)>
    // <!ELEMENT pedal-alter (#PCDATA)>
    var children = [];
    (harpPedals.pedalTunings || []).forEach(function (tuning) {
        var nChildren = [];
        if (tuning.pedalStep) {
            nChildren.push((_a = ["<pedal-step>", "</pedal-step>"], _a.raw = ["<pedal-step>", "</pedal-step>"], xml(_a, tuning.pedalStep)));
        }
        if (tuning.pedalAlter) {
            nChildren.push((_b = ["<pedal-alter>", "</pedal-alter>"], _b.raw = ["<pedal-alter>", "</pedal-alter>"], xml(_b, tuning.pedalAlter)));
        }
        children.push((_c = ["<pedal-tuning>\n", "\n</pedal-tuning>"], _c.raw = ["<pedal-tuning>\\n", "\\n</pedal-tuning>"], dangerous(_c, nChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a, _b, _c;
    });
    var attribs = printStyleAlignToXML(harpPedals);
    return (_a = ["<harp-pedals", ">\n", "\n</harp-pedals>"], _a.raw = ["<harp-pedals", ">\\n", "\\n</harp-pedals>"], dangerous(_a, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function dampToXML(damp) {
    // <!ELEMENT damp EMPTY>
    // <!ATTLIST damp
    //     %print-style-align;
    // >
    return (_a = ["<damp", " />"], _a.raw = ["<damp", " />"], dangerous(_a, printStyleAlignToXML(damp)));
    var _a;
}
function dampAllToXML(dampAll) {
    // <!ELEMENT damp-all EMPTY>
    // <!ATTLIST damp-all
    //     %print-style-align;
    // >
    return (_a = ["<damp-all", " />"], _a.raw = ["<damp-all", " />"], dangerous(_a, printStyleAlignToXML(dampAll)));
    var _a;
}
function eyeglassesToXML(eyeglasses) {
    // <!ELEMENT eyeglasses EMPTY>
    // <!ATTLIST eyeglasses
    //     %print-style-align;
    // >
    return (_a = ["<eyeglasses", " />"], _a.raw = ["<eyeglasses", " />"], dangerous(_a, printStyleAlignToXML(eyeglasses)));
    var _a;
}
function stringMuteToXML(stringMute) {
    // <!ELEMENT string-mute EMPTY>
    // <!ATTLIST string-mute
    //     type (on | off) #REQUIRED
    //     %print-style-align;
    // >
    var attribs = (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, stringMute.type)) + printStyleAlignToXML(stringMute);
    return (_b = ["<string-mute", " />"], _b.raw = ["<string-mute", " />"], dangerous(_b, attribs));
    var _a, _b;
}
function scordaturaToXML(scordatura) {
    // <!ELEMENT scordatura (accord+)>
    // <!ELEMENT accord
    //     (tuning-step, tuning-alter?, tuning-octave)>
    // <!ATTLIST accord
    //     string CDATA #REQUIRED
    // >
    var children = [];
    (scordatura.accords || []).forEach(function (accord) {
        var oChildren = tuningStepAlterOctaveToXML(accord);
        var oAttribs = (_a = [" string=\"", "\""], _a.raw = [" string=\"", "\""], xml(_a, accord.string));
        children.push((_b = ["<accord", ">\n", "\n</accord>"], _b.raw = ["<accord", ">\\n", "\\n</accord>"], dangerous(_b, oAttribs, oChildren.join("\n").split("\n")
            .map(function (n) { return "  " + n; }).join("\n"))));
        var _a, _b;
    });
    return (_a = ["<scordatura>\n", "\n</scordatura>"], _a.raw = ["<scordatura>\\n", "\\n</scordatura>"], dangerous(_a, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function imageToXML(image) {
    // <!ELEMENT image EMPTY>
    // <!ATTLIST image
    //     source CDATA #REQUIRED
    //     type CDATA #REQUIRED
    //     %position;
    //     %halign;
    //     %valign-image;
    // >
    var attribs = "" +
        (_a = [" source=\"", "\""], _a.raw = [" source=\"", "\""], xml(_a, image.source)) +
        (_b = [" type=\"", "\""], _b.raw = [" type=\"", "\""], xml(_b, image.type)) +
        positionToXML(image) +
        halignToXML(image) +
        valignImageToXML(image);
    return (_c = ["<image", " />"], _c.raw = ["<image", " />"], dangerous(_c, attribs));
    var _a, _b, _c;
}
var voiceSymbolToXML = (_h = {},
    _h[VoiceSymbol.None] = "none",
    _h[VoiceSymbol.Hauptstimme] = "hauptstimme",
    _h[VoiceSymbol.Nebenstimme] = "nebenstimme",
    _h[VoiceSymbol.Plain] = "plain",
    _h
);
function principalVoiceToXML(principalVoice) {
    // <!ELEMENT principal-voice (#PCDATA)>
    // <!ATTLIST principal-voice
    //     type %start-stop; #REQUIRED
    //     symbol (Hauptstimme | Nebenstimme | plain | none) #REQUIRED
    //     %print-style-align;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, principalVoice.data));
    var attribs = startStopToXML(principalVoice) +
        (_b = [" symbol=\"", "\""], _b.raw = [" symbol=\"", "\""], xml(_b, voiceSymbolToXML[principalVoice.symbol])) +
        printStyleAlignToXML(principalVoice);
    return (_c = ["<principal-voice", "", "</principal-voice>"], _c.raw = ["<principal-voice", "", "</principal-voice>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function accordionRegistrationToXML(accordionRegistration) {
    // <!ELEMENT accordion-registration
    //     (accordion-high?, accordion-middle?, accordion-low?)>
    // <!ATTLIST accordion-registration
    //     %print-style-align;
    // >
    // <!ELEMENT accordion-high EMPTY>
    // <!ELEMENT accordion-middle (#PCDATA)>
    // <!ELEMENT accordion-low EMPTY>
    var children = [];
    var attribs = printStyleAlignToXML(accordionRegistration);
    if (defined(accordionRegistration.accordionHigh)) {
        children.push((_a = ["<accordion-high />"], _a.raw = ["<accordion-high />"], xml(_a)));
    }
    if (defined(accordionRegistration.accordionMiddle)) {
        children.push((_b = ["<accordion-middle>", "</accordion-middle>"], _b.raw = ["<accordion-middle>", "</accordion-middle>"], xml(_b, accordionRegistration.accordionMiddle || "")));
    }
    if (defined(accordionRegistration.accordionLow)) {
        children.push((_c = ["<accordion-low />"], _c.raw = ["<accordion-low />"], xml(_c)));
    }
    return (_d = ["<accordion-registration", ">\n", "\n</accordion-registration>"], _d.raw = ["<accordion-registration", ">\\n", "\\n</accordion-registration>"], dangerous(_d, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d;
}
var tipDirectionToXML = (_j = {},
    _j[TipDirection.Right] = "right",
    _j[TipDirection.Northwest] = "northwest",
    _j[TipDirection.Southwest] = "southwest",
    _j[TipDirection.Down] = "down",
    _j[TipDirection.Northeast] = "northeast",
    _j[TipDirection.Southeast] = "southeast",
    _j[TipDirection.Up] = "up",
    _j[TipDirection.Left] = "left",
    _j
);
function percussionToXML(percussion) {
    // <!ELEMENT percussion
    //     (glass | metal | wood | pitched | membrane | effect |
    //      timpani | beater | stick | stick-location |
    //      other-percussion)>
    // <!ATTLIST percussion
    //     %print-style-align;
    //     %enclosure;
    // >
    var children = [];
    if (defined(percussion.glass)) {
        // <!ELEMENT glass (#PCDATA)>
        children.push((_a = ["<glass>", "</glass>"], _a.raw = ["<glass>", "</glass>"], xml(_a, percussion.glass)));
    }
    if (defined(percussion.metal)) {
        // <!ELEMENT metal (#PCDATA)>
        children.push((_b = ["<metal>", "</metal>"], _b.raw = ["<metal>", "</metal>"], xml(_b, percussion.metal)));
    }
    if (defined(percussion.wood)) {
        // <!ELEMENT wood (#PCDATA)>
        children.push((_c = ["<wood>", "</wood>"], _c.raw = ["<wood>", "</wood>"], xml(_c, percussion.wood)));
    }
    if (defined(percussion.pitched)) {
        // <!ELEMENT pitched (#PCDATA)>
        children.push((_d = ["<pitched>", "</pitched>"], _d.raw = ["<pitched>", "</pitched>"], xml(_d, percussion.pitched)));
    }
    if (defined(percussion.membrane)) {
        // <!ELEMENT membrane (#PCDATA)>
        children.push((_e = ["<membrane>", "</membrane>"], _e.raw = ["<membrane>", "</membrane>"], xml(_e, percussion.membrane)));
    }
    if (defined(percussion.effect)) {
        // <!ELEMENT effect (#PCDATA)>
        children.push((_f = ["<effect>", "</effect>"], _f.raw = ["<effect>", "</effect>"], xml(_f, percussion.effect)));
    }
    if (defined(percussion.timpani)) {
        // <!ELEMENT timpani EMPTY>
        children.push((_g = ["<timpani />"], _g.raw = ["<timpani />"], xml(_g)));
    }
    if (defined(percussion.beater)) {
        // <!ELEMENT beater (#PCDATA)>
        // <!ATTLIST beater
        //     tip %tip-direction; #IMPLIED
        // >
        var pcdata = (_h = ["", ""], _h.raw = ["", ""], xml(_h, percussion.beater.data || ""));
        var oAttribs = "";
        if (defined(percussion.beater.tip)) {
            oAttribs += (_j = [" tip=\"", "\""], _j.raw = [" tip=\"", "\""], xml(_j, tipDirectionToXML[percussion.beater.tip]));
        }
        children.push((_k = ["<beater", ">", "</beater>"], _k.raw = ["<beater", ">", "</beater>"], dangerous(_k, oAttribs, pcdata)));
    }
    if (defined(percussion.stick)) {
        // <!ELEMENT stick (stick-type, stick-material)>
        // <!ATTLIST stick
        //     tip %tip-direction; #IMPLIED
        //     >
        // <!ELEMENT stick-type (#PCDATA)>
        // <!ELEMENT stick-material (#PCDATA)>
        var pcdata = "";
        var oAttribs = "";
        if (defined(percussion.stick.tip)) {
            oAttribs += (_l = [" tip=\"", "\""], _l.raw = [" tip=\"", "\""], xml(_l, tipDirectionToXML[percussion.stick.tip]));
        }
        if (defined(percussion.stick.stickType)) {
            pcdata += (_m = ["  <stick-type>", "</stick-type>\n"], _m.raw = ["  <stick-type>", "</stick-type>\\n"], xml(_m, percussion.stick.stickType));
        }
        if (defined(percussion.stick.stickMaterial)) {
            pcdata += (_o = ["  <stick-material>", "</stick-material>\n"], _o.raw = ["  <stick-material>", "</stick-material>\\n"], xml(_o, percussion.stick.stickMaterial));
        }
        children.push((_p = ["<stick", ">", "</stick>"], _p.raw = ["<stick", ">", "</stick>"], dangerous(_p, oAttribs, pcdata)));
    }
    if (defined(percussion.stickLocation)) {
        // <!ELEMENT stick-location (#PCDATA)>
        children.push((_q = ["<stick-location>", "</stick-location>"], _q.raw = ["<stick-location>", "</stick-location>"], xml(_q, percussion.stickLocation)));
    }
    if (defined(percussion.otherPercussion)) {
        // <!ELEMENT other-percussion (#PCDATA)>
        children.push((_r = ["<other-percussion>", "</other-percussion>"], _r.raw = ["<other-percussion>", "</other-percussion>"], xml(_r, percussion.otherPercussion)));
    }
    return (_s = ["<percussion>\n", "\n</percussion>"], _s.raw = ["<percussion>\\n", "\\n</percussion>"], dangerous(_s, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
}
function otherDirectionToXML(otherDirection) {
    // <!ELEMENT other-direction (#PCDATA)>
    // <!ATTLIST other-direction
    //     %print-object;
    //     %print-style-align;
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, otherDirection.data));
    return (_b = ["<other-direction", ">", "</other-direction>"], _b.raw = ["<other-direction", ">", "</other-direction>"], dangerous(_b, printObjectToXML(otherDirection) +
        printStyleAlignToXML(otherDirection), pcdata));
    var _a, _b;
}
function wavyLineToXML(wavyLine) {
    // <!ELEMENT wavy-line EMPTY>
    // <!ATTLIST wavy-line
    //     type %start-stop-continue; #REQUIRED
    //     number %number-level; #IMPLIED
    //     %position;
    //     %placement;
    //     %color;
    //     %trill-sound;
    // >
    var attribs = "" +
        startStopContinueToXML(wavyLine) +
        numberLevelToXML(wavyLine) +
        positionToXML(wavyLine) +
        placementToXML(wavyLine) +
        colorToXML(wavyLine) +
        trillSoundToXML(wavyLine);
    return (_a = ["<wavy-line", " />"], _a.raw = ["<wavy-line", " />"], dangerous(_a, attribs));
    var _a;
}
var barStyleTypeToXML = {
    0: "regular",
    5: "light-heavy",
    6: "heavy-light",
    9: "short",
    10: "none",
    2: "dashed",
    7: "heavy-heavy",
    8: "tick",
    1: "dotted",
    3: "heavy",
    4: "light-light"
};
function barStyleToXML(barStyle) {
    // <!ELEMENT bar-style (#PCDATA)>
    // <!ATTLIST bar-style
    //     %color;
    // >
    var attribs = "" +
        colorToXML(barStyle);
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, barStyleTypeToXML[barStyle.data] || ""));
    return (_b = ["<bar-style", ">", "</bar-style>"], _b.raw = ["<bar-style", ">", "</bar-style>"], dangerous(_b, attribs, pcdata));
    var _a, _b;
}
var startStopDiscontinueTypeToXML = (_k = {},
    _k[StartStopDiscontinue.Start] = "start",
    _k[StartStopDiscontinue.Stop] = "stop",
    _k[StartStopDiscontinue.Discontinue] = "discontinue",
    _k
);
function endingToXML(ending) {
    // <!ELEMENT ending (#PCDATA)>
    // <!ATTLIST ending
    //     number CDATA #REQUIRED
    //     type (start | stop | discontinue) #REQUIRED
    //     %print-object;
    //     %print-style;
    //     end-length %tenths; #IMPLIED
    //     text-x %tenths; #IMPLIED
    //     text-y %tenths; #IMPLIED
    // >
    var attribs = "" +
        numberLevelToXML(ending) +
        startStopDiscontinueToXML(ending) +
        printObjectToXML(ending) +
        printStyleToXML(ending);
    if (defined(ending.endLength)) {
        attribs += (_a = [" end-length=\"", "\""], _a.raw = [" end-length=\"", "\""], xml(_a, ending.endLength));
    }
    if (defined(ending.textX)) {
        attribs += (_b = [" text-x=\"", "\""], _b.raw = [" text-x=\"", "\""], xml(_b, ending.textX));
    }
    if (defined(ending.textY)) {
        attribs += (_c = [" text-y=\"", "\""], _c.raw = [" text-y=\"", "\""], xml(_c, ending.textY));
    }
    var pcdata = (_d = ["", ""], _d.raw = ["", ""], xml(_d, ending.ending));
    return (_e = ["<ending", ">", "</ending>"], _e.raw = ["<ending", ">", "</ending>"], dangerous(_e, attribs, pcdata));
    var _a, _b, _c, _d, _e;
}
var directionTypeBgToXML = (_l = {},
    _l[DirectionTypeBg.Forward] = "forward",
    _l[DirectionTypeBg.Backward] = "backward",
    _l
);
var wingedTypeToXML = (_m = {},
    _m[WingedType.None] = "none",
    _m[WingedType.Curved] = "curved",
    _m[WingedType.DoubleCurved] = "double-curved",
    _m[WingedType.Straight] = "straight",
    _m[WingedType.DoubleStraight] = "double-straight",
    _m
);
function repeatToXML(repeat) {
    // <!ELEMENT repeat EMPTY>
    // <!ATTLIST repeat
    //     direction (backward | forward) #REQUIRED
    //     times CDATA #IMPLIED
    //     winged (none | straight | curved |
    //         double-straight | double-curved) #IMPLIED
    // >
    var attribs = "" +
        (_a = [" direction=\"", "\""], _a.raw = [" direction=\"", "\""], xml(_a, directionTypeBgToXML[repeat.direction]));
    if (defined(repeat.times)) {
        attribs += (_b = [" times=\"", "\""], _b.raw = [" times=\"", "\""], xml(_b, repeat.times));
    }
    if (defined(repeat.winged)) {
        attribs += (_c = [" winged=\"", "\""], _c.raw = [" winged=\"", "\""], xml(_c, wingedTypeToXML[repeat.winged]));
    }
    return (_d = ["<repeat", " />"], _d.raw = ["<repeat", " />"], dangerous(_d, attribs));
    var _a, _b, _c, _d;
}
function segnoToXML(segno) {
    // <!ELEMENT segno EMPTY>
    // <!ATTLIST segno
    //     %print-style-align;
    // >
    var attribs = "" +
        printStyleAlignToXML(segno);
    return (_a = ["<segno", " />"], _a.raw = ["<segno", " />"], dangerous(_a, attribs));
    var _a;
}
function codaToXML(coda) {
    // <!ELEMENT coda EMPTY>
    // <!ATTLIST coda
    //     %print-style-align;
    // >
    var attribs = "" +
        printStyleAlignToXML(coda);
    return (_a = ["<coda", " />"], _a.raw = ["<coda", " />"], dangerous(_a, attribs));
    var _a;
}
var uprightInvertedToXML = {
    0: "upright",
    1: "inverted"
};
var normalAngledSquareToXML = {
    1: "angled",
    2: "square",
    0: "normal"
};
function fermataToXML(fermata) {
    // <!ELEMENT fermata  (#PCDATA)>
    // <!ATTLIST fermata
    //     type (upright | inverted) #IMPLIED
    //     %print-style;
    // >
    var pcdata = defined(fermata.shape) ? normalAngledSquareToXML[fermata.shape] : "";
    var attribs = defined(fermata.type) ? (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, uprightInvertedToXML[fermata.type])) : "";
    attribs += printStyleToXML(fermata);
    return (_b = ["<fermata", ">", "</fermata>"], _b.raw = ["<fermata", ">", "</fermata>"], dangerous(_b, attribs, pcdata));
    var _a, _b;
}
function playToXML(play) {
    // <!ELEMENT play ((ipa | mute | semi-pitched | other-play)*)>
    // <!ATTLIST play
    //     id IDREF #IMPLIED
    // >
    // TODO musicxml-interfaces: missing id
    var children = [];
    if (defined(play.ipa)) {
        children.push((_a = ["<ipa>", "</ipa>"], _a.raw = ["<ipa>", "</ipa>"], xml(_a, play.ipa)));
    }
    if (defined(play.mute)) {
        children.push((_b = ["<mute>", "</mute>"], _b.raw = ["<mute>", "</mute>"], xml(_b, play.mute)));
    }
    if (defined(play.semiPitched)) {
        children.push((_c = ["<semi-pitched>", "</semi-pitched>"], _c.raw = ["<semi-pitched>", "</semi-pitched>"], xml(_c, play.semiPitched)));
    }
    if (defined(play.otherPlay)) {
        var pcdata = (_d = ["", ""], _d.raw = ["", ""], xml(_d, play.otherPlay.data));
        var oAttribs = "";
        if (defined(play.otherPlay.type)) {
            oAttribs += (_e = [" type=\"", "\""], _e.raw = [" type=\"", "\""], xml(_e, play.otherPlay.type));
        }
        children.push((_f = ["<other-play", ">", "</other-play>"], _f.raw = ["<other-play", ">", "</other-play>"], dangerous(_f, oAttribs, pcdata)));
    }
    return (_g = ["<play>\n", "\n</play>"], _g.raw = ["<play>\\n", "\\n</play>"], dangerous(_g, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g;
}
function staffLayoutToXML(staffLayout) {
    // <!ELEMENT staff-layout (staff-distance?)>
    // <!ELEMENT staff-distance %layout-tenths;>
    // <!ATTLIST staff-layout
    //     number CDATA #IMPLIED
    // >
    var children = [];
    if (defined(staffLayout.staffDistance)) {
        children.push((_a = ["<staff-distance>", "</staff-distance>"], _a.raw = ["<staff-distance>", "</staff-distance>"], xml(_a, staffLayout.staffDistance)));
    }
    var attribs = numberLevelToXML(staffLayout);
    return (_b = ["<staff-layout", ">\n", "\n</staff-layout>"], _b.raw = ["<staff-layout", ">\\n", "\\n</staff-layout>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function measureLayoutToXML(measureLayout) {
    // <!ELEMENT measure-layout (measure-distance?)>
    // <!ELEMENT measure-distance %layout-tenths;>
    var children = [];
    if (defined(measureLayout.measureDistance)) {
        children.push((_a = ["<measure-distance>", "</measure-distance>"], _a.raw = ["<measure-distance>", "</measure-distance>"], xml(_a, measureLayout.measureDistance)));
    }
    return (_b = ["<measure-layout>\n", "\n</measure-layout>"], _b.raw = ["<measure-layout>\\n", "\\n</measure-layout>"], dangerous(_b, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function measureNumberingToXML(measureNumbering) {
    // <!ELEMENT measure-numbering (#PCDATA)>
    // <!ATTLIST measure-numbering
    //     %print-style-align;
    // >
    var attribs = printStyleAlignToXML(measureNumbering);
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, measureNumbering.data));
    return (_b = ["<measure-numbering", ">", "</measure-numbering>"], _b.raw = ["<measure-numbering", ">", "</measure-numbering>"], dangerous(_b, attribs, pcdata));
    var _a, _b;
}
function keyToXML(key) {
    // <!ELEMENT key (((cancel?, fifths, mode?) |
    //     ((key-step, key-alter, key-accidental?)*)), key-octave*)>
    // <!ATTLIST key
    //     number CDATA #IMPLIED
    //     %print-style;
    //     %print-object;
    // >
    var children = [];
    var attribs = "" +
        numberLevelToXML(key) +
        printStyleToXML(key) +
        printObjectToXML(key);
    if (defined(key.cancel)) {
        children.push(cancelToXML(key.cancel));
    }
    if (defined(key.fifths)) {
        // <!ELEMENT fifths (#PCDATA)>
        children.push((_a = ["<fifths>", "</fifths>"], _a.raw = ["<fifths>", "</fifths>"], xml(_a, key.fifths)));
    }
    if (defined(key.mode)) {
        // <!ELEMENT mode (#PCDATA)>
        children.push((_b = ["<mode>", "</mode>"], _b.raw = ["<mode>", "</mode>"], xml(_b, key.mode)));
    }
    (key.keySteps || []).forEach(function (keyStep, idx) {
        // <!ELEMENT key-step (#PCDATA)>
        // <!ELEMENT key-alter (#PCDATA)>
        // <!ELEMENT key-accidental (#PCDATA)>
        children.push((_a = ["<key-step>", "</key-step>"], _a.raw = ["<key-step>", "</key-step>"], xml(_a, keyStep)));
        children.push((_b = ["<key-alter>", "</key-alter>"], _b.raw = ["<key-alter>", "</key-alter>"], xml(_b, key.keyAlters[idx])));
        if (key.keyAccidentals && key.keyAccidentals[idx]) {
            children.push((_c = ["<key-accidental>", "</key-accidental>"], _c.raw = ["<key-accidental>", "</key-accidental>"], xml(_c, key.keyAccidentals[idx])));
        }
        var _a, _b, _c;
    });
    (key.keyOctaves || []).forEach(function (keyOctave) {
        children.push(keyOctaveToXML(keyOctave));
    });
    return (_c = ["<key", ">\n", "\n</key>"], _c.raw = ["<key", ">\\n", "\\n</key>"], dangerous(_c, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
var cancelLocationToXML = {
    1: "right",
    2: "before-barline",
    0: "left"
};
function cancelToXML(cancel) {
    // <!ELEMENT cancel (#PCDATA)>
    // <!ATTLIST cancel
    //     location (left | right | before-barline) #IMPLIED
    // >
    var attribs = "";
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, cancel.fifths));
    if (defined(cancel.location)) {
        attribs += (_b = [" location=\"", "\""], _b.raw = [" location=\"", "\""], xml(_b, cancelLocationToXML[cancel.location]));
    }
    return (_c = ["<cancel", ">", "</cancel>"], _c.raw = ["<cancel", ">", "</cancel>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function keyOctaveToXML(keyOctave) {
    // <!ELEMENT key-octave (#PCDATA)>
    // <!ATTLIST key-octave
    //     number NMTOKEN #REQUIRED
    //     cancel %yes-no; #IMPLIED
    // >
    var attribs = numberLevelToXML(keyOctave);
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, keyOctave.octave));
    if (defined(keyOctave.cancel)) {
        attribs += (_b = [" cancel=\"", "\""], _b.raw = [" cancel=\"", "\""], yesNo(_b, keyOctave.cancel));
    }
    return (_c = ["<key-octave", ">", "</key-octave>"], _c.raw = ["<key-octave", ">", "</key-octave>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function timeToXML(time) {
    // <!ELEMENT time
    //     (((beats, beat-type)+, interchangeable?) | senza-misura)>
    // <!ATTLIST time
    //     number CDATA #IMPLIED
    //     %time-symbol;
    //     %time-separator;
    //     %print-style-align;
    //     %print-object;
    // >
    var attribs = "" +
        numberLevelToXML(time) +
        timeSymbolToXML(time) +
        timeSeparatorToXML(time) +
        printStyleAlignToXML(time) +
        printObjectToXML(time);
    var children = [];
    if (time.senzaMisura != null) {
        // <!ELEMENT senza-misura (#PCDATA)>
        // TODO musicxml-interfaces: PCDATA?
        children.push((_a = ["<senza-misura />"], _a.raw = ["<senza-misura />"], xml(_a)));
    }
    else {
        // TODO musicxml-interfaces: check this
        (time.beats || []).forEach(function (beats, idx) {
            // <!ELEMENT beats (#PCDATA)>
            // <!ELEMENT beat-type (#PCDATA)>
            children.push((_a = ["<beats>", "</beats>"], _a.raw = ["<beats>", "</beats>"], xml(_a, beats)));
            children.push((_b = ["<beat-type>", "</beat-type>"], _b.raw = ["<beat-type>", "</beat-type>"], xml(_b, time.beatTypes[idx])));
            var _a, _b;
        });
        if (defined(time.interchangeable)) {
            children.push(interchangeableToXML(time.interchangeable));
        }
    }
    return (_b = ["<time", ">\n", "\n</time>"], _b.raw = ["<time", ">\\n", "\\n</time>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
var timeSymbolTypeToXML = {
    4: "dotted-note",
    1: "cut",
    2: "single-number",
    3: "note",
    0: "common",
    5: "normal"
};
function timeSymbolToXML(timeSymbol) {
    // <!ENTITY % time-symbol
    //     "symbol (common | cut | single-number |
    //              note | dotted-note | normal) #IMPLIED">
    if (defined(timeSymbol.symbol)) {
        return (_a = [" symbol=\"", "\""], _a.raw = [" symbol=\"", "\""], xml(_a, timeSymbolTypeToXML[timeSymbol.symbol]));
    }
    return "";
    var _a;
}
var separatorTypeToXML = {
    0: "none",
    1: "horizontal",
    2: "diagonal",
    3: "vertical",
    4: "adjacent"
};
function timeSeparatorToXML(timeSeparator) {
    // <!ENTITY % time-separator
    //     "separator (none | horizontal | diagonal |
    //         vertical | adjacent) #IMPLIED">
    if (defined(timeSeparator.separator)) {
        return (_a = [" separator=\"", "\""], _a.raw = [" separator=\"", "\""], xml(_a, separatorTypeToXML[timeSeparator.separator]));
    }
    return "";
    var _a;
}
function interchangeableToXML(interchangeable) {
    // <!ELEMENT interchangeable (time-relation?, (beats, beat-type)+)>
    // <!ATTLIST interchangeable
    //     %time-symbol;
    //     %time-separator;
    // >
    var attribs = "" +
        timeSymbolToXML(interchangeable) +
        timeSeparatorToXML(interchangeable);
    var children = [];
    (interchangeable.beats || []).forEach(function (beats, idx) {
        // <!ELEMENT beats (#PCDATA)>
        // <!ELEMENT beat-type (#PCDATA)>
        children.push((_a = ["<beats>", "</beats>"], _a.raw = ["<beats>", "</beats>"], xml(_a, beats)));
        children.push((_b = ["<beat-type>", "</beat-type>"], _b.raw = ["<beat-type>", "</beat-type>"], xml(_b, interchangeable.beatTypes[idx])));
        var _a, _b;
    });
    if (defined(interchangeable.timeRelation)) {
        // <!ELEMENT time-relation (#PCDATA)>
        children.push((_a = ["<time-relation>", "</time-relation>"], _a.raw = ["<time-relation>", "</time-relation>"], xml(_a, interchangeable.timeRelation)));
    }
    return (_b = ["<interchangeable", ">\n", "\n</interchangeable>"], _b.raw = ["<interchangeable", ">\\n", "\\n</interchangeable>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
var partSymbolTypeToXML = {
    0: "none",
    2: "line",
    3: "bracket",
    4: "square",
    1: "brace"
};
function partSymbolToXML(partSymbol) {
    // <!ELEMENT part-symbol (#PCDATA)>
    // <!ATTLIST part-symbol
    //     top-staff CDATA #IMPLIED
    //     bottom-staff CDATA #IMPLIED
    //     %position;
    //     %color;
    // >
    var pcdata = "";
    if (defined(partSymbol.type)) {
        pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, partSymbolTypeToXML[partSymbol.type]));
    }
    var attribs = "";
    if (defined(partSymbol.topStaff)) {
        attribs += (_b = [" top-staff=\"", "\""], _b.raw = [" top-staff=\"", "\""], xml(_b, partSymbol.topStaff));
    }
    if (defined(partSymbol.bottomStaff)) {
        attribs += (_c = [" bottom-staff=\"", "\""], _c.raw = [" bottom-staff=\"", "\""], xml(_c, partSymbol.bottomStaff));
    }
    attribs += positionToXML(partSymbol) +
        colorToXML(partSymbol);
    return (_d = ["<part-symbol", ">", "</part-symbol>"], _d.raw = ["<part-symbol", ">", "</part-symbol>"], dangerous(_d, attribs, pcdata));
    var _a, _b, _c, _d;
}
var symbolSizeToXML = {
    1: "full",
    2: "cue",
    3: "large"
};
function clefToXML(clef) {
    // <!ELEMENT clef (sign, line?, clef-octave-change?)>
    // <!ATTLIST clef
    //     number CDATA #IMPLIED
    //     additional %yes-no; #IMPLIED
    //     size %symbol-size; #IMPLIED
    //     after-barline %yes-no; #IMPLIED
    //     %print-style;
    //     %print-object;
    // >
    var attribs = "" +
        numberLevelToXML(clef);
    var children = [];
    if (defined(clef.additional)) {
        attribs += (_a = [" additional=\"", "\""], _a.raw = [" additional=\"", "\""], yesNo(_a, clef.additional));
    }
    if (clef.size >= SymbolSize.Unspecified) {
        attribs += (_b = [" size=\"", "\""], _b.raw = [" size=\"", "\""], xml(_b, symbolSizeToXML[clef.size]));
    }
    if (defined(clef.afterBarline)) {
        attribs += (_c = [" after-barline=\"", "\""], _c.raw = [" after-barline=\"", "\""], yesNo(_c, clef.afterBarline));
    }
    attribs += printStyleToXML(clef) + printObjectToXML(clef);
    if (defined(clef.sign)) {
        // <!ELEMENT sign (#PCDATA)>
        children.push((_d = ["<sign>", "</sign>"], _d.raw = ["<sign>", "</sign>"], xml(_d, clef.sign)));
    }
    if (defined(clef.line)) {
        // <!ELEMENT line (#PCDATA)>
        children.push((_e = ["<line>", "</line>"], _e.raw = ["<line>", "</line>"], xml(_e, clef.line)));
    }
    if (defined(clef.clefOctaveChange)) {
        // <!ELEMENT clef-octave-change (#PCDATA)>
        children.push((_f = ["<clef-octave-change>", "</clef-octave-change>"], _f.raw = ["<clef-octave-change>", "</clef-octave-change>"], xml(_f, clef.clefOctaveChange)));
    }
    return (_g = ["<clef", ">\n", "\n</clef>"], _g.raw = ["<clef", ">\\n", "\\n</clef>"], dangerous(_g, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e, _f, _g;
}
function staffDetailsToXML(staffDetails) {
    // <!ELEMENT staff-details (staff-type?, staff-lines?,
    //     staff-tuning*, capo?, staff-size?)>
    // <!ATTLIST staff-details
    //     number         CDATA                #IMPLIED
    //     show-frets     (numbers | letters)  #IMPLIED
    //     %print-object;
    //     %print-spacing;
    // >
    var attribs = "";
    var children = [];
    attribs += numberLevelToXML(staffDetails);
    // TODO: musicxml-interfaces show__FRETS__
    attribs += printObjectToXML(staffDetails);
    attribs += printSpacingToXML(staffDetails);
    if (defined(staffDetails.staffType)) {
        // <!ELEMENT staff-type (#PCDATA)>
        children.push((_a = ["<staff-type>", "</staff-type>"], _a.raw = ["<staff-type>", "</staff-type>"], xml(_a, staffDetails.staffType)));
    }
    if (defined(staffDetails.staffLines)) {
        // <!ELEMENT staff-lines (#PCDATA)>
        children.push((_b = ["<staff-lines>", "</staff-lines>"], _b.raw = ["<staff-lines>", "</staff-lines>"], xml(_b, staffDetails.staffLines)));
    }
    (staffDetails.staffTunings || []).forEach(function (tuning) {
        children.push(staffTuningToXML(tuning));
    });
    if (defined(staffDetails.capo)) {
        // <!ELEMENT capo (#PCDATA)>
        children.push((_c = ["<capo>", "</capo>"], _c.raw = ["<capo>", "</capo>"], xml(_c, staffDetails.capo)));
    }
    if (defined(staffDetails.staffSize)) {
        // <!ELEMENT staff-size (#PCDATA)>
        children.push((_d = ["<staff-size>", "</staff-size>"], _d.raw = ["<staff-size>", "</staff-size>"], xml(_d, staffDetails.staffSize)));
    }
    return (_e = ["<staff-details", ">\n", "\n</staff-details>"], _e.raw = ["<staff-details", ">\\n", "\\n</staff-details>"], dangerous(_e, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e;
}
function staffTuningToXML(staffTuning) {
    // <!ELEMENT staff-tuning
    //     (tuning-step, tuning-alter?, tuning-octave)>
    // <!ATTLIST staff-tuning
    //     line CDATA #REQUIRED
    var children = [];
    var attribs = "";
    if (defined(staffTuning.line)) {
        attribs += (_a = [" line=\"", "\""], _a.raw = [" line=\"", "\""], xml(_a, staffTuning.line));
    }
    children = children.concat(tuningStepAlterOctaveToXML(staffTuning));
    return (_b = ["<staff-tuning", ">\n", "\n</staff-tuning>"], _b.raw = ["<staff-tuning", ">\\n", "\\n</staff-tuning>"], dangerous(_b, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b;
}
function tuningStepAlterOctaveToXML(tuning) {
    var children = [];
    if (defined(tuning.tuningStep)) {
        // <!ELEMENT tuning-step (#PCDATA)>
        children.push((_a = ["<tuning-step>", "</tuning-step>"], _a.raw = ["<tuning-step>", "</tuning-step>"], xml(_a, tuning.tuningStep)));
    }
    if (defined(tuning.tuningAlter)) {
        // <!ELEMENT tuning-alter (#PCDATA)>
        children.push((_b = ["<tuning-alter>", "</tuning-alter>"], _b.raw = ["<tuning-alter>", "</tuning-alter>"], xml(_b, tuning.tuningAlter)));
    }
    if (defined(tuning.tuningOctave)) {
        // <!ELEMENT tuning-octave (#PCDATA)>
        children.push((_c = ["<tuning-octave>", "</tuning-octave>"], _c.raw = ["<tuning-octave>", "</tuning-octave>"], xml(_c, tuning.tuningOctave)));
    }
    return children;
    var _a, _b, _c;
}
function transposeToXML(transpose) {
    // <!ELEMENT transpose
    //     (diatonic?, chromatic, octave-change?, double?)>
    // <!ATTLIST transpose
    //     number CDATA #IMPLIED
    // >
    var children = [];
    var attribs = numberLevelToXML(transpose);
    if (defined(transpose.diatonic)) {
        // <!ELEMENT diatonic (#PCDATA)>
        children.push((_a = ["<diatonic>", "</diatonic>"], _a.raw = ["<diatonic>", "</diatonic>"], xml(_a, transpose.diatonic)));
    }
    if (defined(transpose.chromatic)) {
        // <!ELEMENT chromatic (#PCDATA)>
        children.push((_b = ["<chromatic>", "</chromatic>"], _b.raw = ["<chromatic>", "</chromatic>"], xml(_b, transpose.chromatic)));
    }
    if (defined(transpose.octaveChange)) {
        // <!ELEMENT octave-change (#PCDATA)>
        children.push((_c = ["<octave-change>", "</octave-change>"], _c.raw = ["<octave-change>", "</octave-change>"], xml(_c, transpose.octaveChange)));
    }
    if (defined(transpose.double)) {
        // <!ELEMENT double EMPTY>
        children.push((_d = ["<double />"], _d.raw = ["<double />"], xml(_d)));
    }
    return (_e = ["<transpose", ">\n", "\n</transpose>"], _e.raw = ["<transpose", ">\\n", "\\n</transpose>"], dangerous(_e, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d, _e;
}
function directiveToXML(directive) {
    // <!ELEMENT directive (#PCDATA)>
    // <!ATTLIST directive
    //     %print-style;
    //     xml:lang NMTOKEN #IMPLIED
    // >
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, directive.data));
    var attribs = printStyleToXML(directive); // TODO musicxml-interfaces xml:lang
    return (_b = ["<directive", ">", "</directive>"], _b.raw = ["<directive", ">", "</directive>"], dangerous(_b, attribs, pcdata));
    var _a, _b;
}
function measureStyleToXML(measureStyle) {
    // <!ELEMENT measure-style (multiple-rest |
    //     measure-repeat | beat-repeat | slash)>
    // <!ATTLIST measure-style
    //     number CDATA #IMPLIED
    //     %font;
    //     %color;
    // >
    var children = [];
    var attribs = "" +
        numberLevelToXML(measureStyle) +
        fontToXML(measureStyle) +
        colorToXML(measureStyle);
    // TODO: Make one at a time!!
    if (defined(measureStyle.multipleRest)) {
        children.push(multipleRestToXML(measureStyle.multipleRest));
    }
    if (defined(measureStyle.measureRepeat)) {
        children.push(measureRepeatToXML(measureStyle.measureRepeat));
    }
    if (defined(measureStyle.beatRepeat)) {
        children.push(beatRepeatToXML(measureStyle.beatRepeat));
    }
    if (defined(measureStyle.slash)) {
        children.push(slashElToXML(measureStyle.slash));
    }
    return (_a = ["<measure-style", ">\n", "\n</measure-style>"], _a.raw = ["<measure-style", ">\\n", "\\n</measure-style>"], dangerous(_a, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a;
}
function multipleRestToXML(multipleRest) {
    // <!ELEMENT multiple-rest (#PCDATA)>
    // <!ATTLIST multiple-rest
    //     use-symbols %yes-no; #IMPLIED
    // >
    var attribs = "";
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, multipleRest.count));
    if (defined(multipleRest.useSymbols)) {
        attribs += (_b = [" use-symbols=\"", "\""], _b.raw = [" use-symbols=\"", "\""], yesNo(_b, multipleRest.useSymbols));
    }
    return (_c = ["<multiple-rest", ">", "</multiple-rest>"], _c.raw = ["<multiple-rest", ">", "</multiple-rest>"], dangerous(_c, attribs, pcdata));
    var _a, _b, _c;
}
function measureRepeatToXML(measureRepeat) {
    // <!ELEMENT measure-repeat (#PCDATA)>
    // <!ATTLIST measure-repeat
    //     type %start-stop; #REQUIRED
    //     slashes NMTOKEN #IMPLIED
    // >
    var attribs = "";
    var pcdata = (_a = ["", ""], _a.raw = ["", ""], xml(_a, measureRepeat.data || ""));
    attribs += startStopToXML(measureRepeat);
    // TODO: musicxml-interfaces: slashed -> slashes
    return (_b = ["<measure-repeat", ">", "</measure-repeat>"], _b.raw = ["<measure-repeat", ">", "</measure-repeat>"], dangerous(_b, attribs, pcdata));
    var _a, _b;
}
function beatRepeatToXML(beatRepeat) {
    // <!ELEMENT beat-repeat ((slash-type, slash-dot*)?)>
    // <!ATTLIST beat-repeat
    //     type %start-stop; #REQUIRED
    //     slashes NMTOKEN #IMPLIED
    //     use-dots %yes-no; #IMPLIED
    // >
    // <!ELEMENT slash-type (#PCDATA)>
    var children = [];
    var attribs = "" +
        startStopToXML(beatRepeat);
    // TODO: musicxml-interfaces: slases -> slashes
    if (defined(beatRepeat.useDots)) {
        attribs += (_a = [" use-dots=\"", "\""], _a.raw = [" use-dots=\"", "\""], yesNo(_a, beatRepeat.useDots));
    }
    if (defined(beatRepeat.slashType)) {
        children.push((_b = ["<slash-type>", "</slash-type>"], _b.raw = ["<slash-type>", "</slash-type>"], xml(_b, beatRepeat.slashType)));
    }
    (beatRepeat.slashDots || []).forEach(function (dot) {
        // <!ELEMENT slash-dot EMPTY>
        children.push((_a = ["<slash-dot />"], _a.raw = ["<slash-dot />"], xml(_a)));
        var _a;
    });
    return (_c = ["<beat-repeat", ">\n", "\n</beat-repeat>"], _c.raw = ["<beat-repeat", ">\\n", "\\n</beat-repeat>"], dangerous(_c, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c;
}
function slashElToXML(slash) {
    // <!ELEMENT slash ((slash-type, slash-dot*)?)>
    // <!ATTLIST slash
    //     type %start-stop; #REQUIRED
    //     use-dots %yes-no; #IMPLIED
    //     use-stems %yes-no; #IMPLIED
    // >
    var attribs = startStopToXML(slash);
    if (defined(slash.useDots)) {
        attribs += (_a = [" use-dots=\"", "\""], _a.raw = [" use-dots=\"", "\""], yesNo(_a, slash.useDots));
    }
    if (defined(slash.useStems)) {
        attribs += (_b = [" use-stems=\"", "\""], _b.raw = [" use-stems=\"", "\""], yesNo(_b, slash.useStems));
    }
    var children = [];
    if (defined(slash.slashType)) {
        children.push((_c = ["<slash-type>", "</slash-type>"], _c.raw = ["<slash-type>", "</slash-type>"], xml(_c, slash.slashType)));
    }
    (slash.slashDots || []).forEach(function (dot) {
        // <!ELEMENT slash-dot EMPTY>
        children.push((_a = ["<slash-dot />"], _a.raw = ["<slash-dot />"], xml(_a)));
        var _a;
    });
    return (_d = ["<slash", ">\n", "\n</slash>"], _d.raw = ["<slash", ">\\n", "\\n</slash>"], dangerous(_d, attribs, children.join("\n").split("\n")
        .map(function (n) { return "  " + n; }).join("\n")));
    var _a, _b, _c, _d;
}
function printStyleToXML(printStyle) {
    // <!ENTITY % print-style
    //     "%position;
    //      %font;
    //      %color;">
    return positionToXML(printStyle) +
        fontToXML(printStyle) +
        colorToXML(printStyle);
}
function printoutToXML(printout) {
    // <!ENTITY % printout
    //     "%print-object;
    //      print-dot     %yes-no;  #IMPLIED
    //      %print-spacing;
    //      print-lyric   %yes-no;  #IMPLIED">
    var attribs = printObjectToXML(printout);
    if (defined(printout.printDot)) {
        attribs += (_a = [" print-dot=\"", "\""], _a.raw = [" print-dot=\"", "\""], yesNo(_a, printout.printDot));
    }
    attribs += printSpacingToXML(printout);
    if (defined(printout.printLyric)) {
        attribs += (_b = [" print-lyric=\"", "\""], _b.raw = [" print-lyric=\"", "\""], yesNo(_b, printout.printLyric));
    }
    return attribs;
    var _a, _b;
}
function timeOnlyToXML(timeOnly) {
    // <!ENTITY % time-only
    //     "time-only CDATA #IMPLIED">
    if (defined(timeOnly.timeOnly)) {
        return (_a = [" time-only=\"", "\""], _a.raw = [" time-only=\"", "\""], xml(_a, timeOnly.timeOnly));
    }
    return "";
    var _a;
}
function editorialToXML(editorial) {
    // <!ENTITY % editorial "(footnote?, level?)">
    // <!ELEMENT footnote (#PCDATA)>
    // <!ATTLIST footnote
    //     %text-formatting;
    // >
    // <!ELEMENT level (#PCDATA)>
    // <!ATTLIST level
    //    reference %yes-no; #IMPLIED
    //    %level-display;
    // >
    // <!ELEMENT voice (#PCDATA)>
    var elements = [];
    if (defined(editorial.footnote) && !!editorial.footnote.text) {
        var footnoteEscaped = (_a = ["", ""], _a.raw = ["", ""], xml(_a, editorial.footnote.text));
        elements.push((_b = ["<footnote", ">\n            ", "</footnote>"], _b.raw = ["<footnote", ">\n            ", "</footnote>"], dangerous(_b, textFormattingToXML(editorial.footnote), footnoteEscaped)));
    }
    if (defined(editorial.level) && !!editorial.level.text) {
        var levelEscaped = (_c = ["", ""], _c.raw = ["", ""], xml(_c, editorial.level.text));
        var attribs = "";
        if (defined(editorial.level.reference)) {
            attribs += (_d = [" reference=\"", "\""], _d.raw = [" reference=\"", "\""], yesNo(_d, editorial.level.reference));
        }
        attribs += levelDisplayToXML(editorial.level);
        elements.push((_e = ["<level", ">", "</level>"], _e.raw = ["<level", ">", "</level>"], dangerous(_e, attribs, levelEscaped)));
    }
    return elements;
    var _a, _b, _c, _d, _e;
}
function editorialVoiceToXML(editorial) {
    // <!ENTITY % editorial-voice "(footnote?, level?, voice?)">
    // <!ELEMENT footnote (#PCDATA)>
    // <!ATTLIST footnote
    //     %text-formatting;
    // >
    // <!ELEMENT level (#PCDATA)>
    // <!ATTLIST level
    //    reference %yes-no; #IMPLIED
    //    %level-display;
    // >
    var elements = editorialToXML(editorial);
    // <!ELEMENT voice (#PCDATA)>
    if (defined(editorial.voice)) {
        elements.push((_a = ["<voice>", "</voice>"], _a.raw = ["<voice>", "</voice>"], xml(_a, editorial.voice)));
    }
    return elements;
    var _a;
}
var solidDashedDottedWavyToXML = {
    1: "dashed",
    2: "dotted",
    3: "wavy",
    0: "solid"
};
function lineTypeToXML(lineType) {
    // <!ENTITY % line-type
    //     "line-type (solid | dashed | dotted | wavy) #IMPLIED">
    if (defined(lineType.lineType)) {
        return (_a = [" line-type=\"", "\""], _a.raw = [" line-type=\"", "\""], xml(_a, solidDashedDottedWavyToXML[lineType.lineType]));
    }
    return "";
    var _a;
}
function startStopToXML(startStop) {
    // <!ENTITY % start-stop "(start | stop)">
    if (defined(startStop.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, startStop.type === StartStop.Start ?
            "start" : "stop"));
    }
    return "";
    var _a;
}
function startStopDiscontinueToXML(startStop) {
    // <!ENTITY % start-stop "(start | stop)">
    if (defined(startStop.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, startStopDiscontinueTypeToXML[startStop.type]));
    }
    return "";
    var _a;
}
function numberLevelToXML(numberLevel) {
    if (defined(numberLevel.number)) {
        return (_a = [" number=\"", "\""], _a.raw = [" number=\"", "\""], xml(_a, numberLevel.number));
    }
    return "";
    var _a;
}
var startStopContinueSingleToXML = {
    0: "start",
    1: "stop",
    2: "continue",
    3: "single"
};
function startStopContinueToXML(startStopContinue) {
    // <!ENTITY % start-stop-continue "(start | stop | continue)">
    if (defined(startStopContinue.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, startStopContinueSingleToXML[startStopContinue.type]));
    }
    return "";
    var _a;
}
function nameToXML(name) {
    if (defined(name.name)) {
        return (_a = [" name=\"", "\""], _a.raw = [" name=\"", "\""], xml(_a, name.name));
    }
    return "";
    var _a;
}
function startStopSingleToXML(startStopSingle) {
    // <!ENTITY % start-stop-single "(start | stop | single)">
    if (defined(startStopSingle.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, startStopContinueSingleToXML[startStopSingle.type]));
    }
    return "";
    var _a;
}
function dashedFormattingToXML(dashedFormatting) {
    // <!ENTITY % dashed-formatting
    //     "dash-length   %tenths;  #IMPLIED
    //      space-length  %tenths;  #IMPLIED">
    var attribs = "";
    if (defined(dashedFormatting.dashLength)) {
        attribs += (_a = [" dash-length=\"", "\""], _a.raw = [" dash-length=\"", "\""], xml(_a, dashedFormatting.dashLength));
    }
    if (defined(dashedFormatting.spaceLength)) {
        attribs += (_b = [" space-length=\"", "\""], _b.raw = [" space-length=\"", "\""], xml(_b, dashedFormatting.spaceLength));
    }
    return attribs;
    var _a, _b;
}
var straightCurvedToXML = {
    1: "curved",
    0: "straight"
};
function lineShapeToXML(lineShape) {
    if (defined(lineShape.lineShape)) {
        return (_a = [" line-shape=\"", "\""], _a.raw = [" line-shape=\"", "\""], xml(_a, straightCurvedToXML[lineShape.lineShape]));
    }
    return "";
    var _a;
}
function positionToXML(pos) {
    // <!ENTITY % position
    //     "default-x     %tenths;    #IMPLIED
    //      default-y     %tenths;    #IMPLIED
    //      relative-x    %tenths;    #IMPLIED
    //      relative-y    %tenths;    #IMPLIED">
    var attribs = "";
    if (defined(pos.defaultX)) {
        attribs += (_a = [" default-x=\"", "\""], _a.raw = [" default-x=\"", "\""], xml(_a, pos.defaultX));
    }
    if (defined(pos.defaultY)) {
        attribs += (_b = [" default-y=\"", "\""], _b.raw = [" default-y=\"", "\""], xml(_b, pos.defaultY));
    }
    if (defined(pos.relativeX)) {
        attribs += (_c = [" relative-x=\"", "\""], _c.raw = [" relative-x=\"", "\""], xml(_c, pos.relativeX));
    }
    if (defined(pos.relativeY)) {
        attribs += (_d = [" relative-y=\"", "\""], _d.raw = [" relative-y=\"", "\""], xml(_d, pos.relativeY));
    }
    return attribs;
    var _a, _b, _c, _d;
}
function placementToXML(placement) {
    // <!ENTITY % placement
    //     "placement %above-below; #IMPLIED">
    if (placement.placement > AboveBelow.Unspecified) {
        return (_a = [" placement=\"", "\""], _a.raw = [" placement=\"", "\""], xml(_a, placement.placement === AboveBelow.Above ?
            "above" : "below"));
    }
    return "";
    var _a;
}
function orientationToXML(orientation) {
    // <!ENTITY % orientation
    //     "orientation (over | under) #IMPLIED">
    if (orientation.orientation > OverUnder.Unspecified) {
        return (_a = [" orientation=\"", "\""], _a.raw = [" orientation=\"", "\""], xml(_a, orientation.orientation === OverUnder.Over ?
            "over" : "under"));
    }
    return "";
    var _a;
}
function bezierToXML(bezier) {
    // <!ENTITY % bezier
    //     "bezier-offset  CDATA     #IMPLIED
    //      bezier-offset2 CDATA     #IMPLIED
    //      bezier-x       %tenths;  #IMPLIED
    //      bezier-y       %tenths;  #IMPLIED
    //      bezier-x2      %tenths;  #IMPLIED
    //      bezier-y2      %tenths;  #IMPLIED">
    var attribs = "";
    if (defined(bezier.bezierOffset)) {
        attribs += (_a = [" bezier-offset=\"", "\""], _a.raw = [" bezier-offset=\"", "\""], xml(_a, bezier.bezierOffset));
    }
    if (defined(bezier.bezierOffset2)) {
        attribs += (_b = [" bezier-offset2=\"", "\""], _b.raw = [" bezier-offset2=\"", "\""], xml(_b, bezier.bezierOffset2));
    }
    if (defined(bezier.bezierX)) {
        attribs += (_c = [" bezier-x=\"", "\""], _c.raw = [" bezier-x=\"", "\""], xml(_c, bezier.bezierX));
    }
    if (defined(bezier.bezierY)) {
        attribs += (_d = [" bezier-y=\"", "\""], _d.raw = [" bezier-y=\"", "\""], xml(_d, bezier.bezierY));
    }
    if (defined(bezier.bezierX2)) {
        attribs += (_e = [" bezier-x2=\"", "\""], _e.raw = [" bezier-x2=\"", "\""], xml(_e, bezier.bezierX2));
    }
    if (defined(bezier.bezierY2)) {
        attribs += (_f = [" bezier-y2=\"", "\""], _f.raw = [" bezier-y2=\"", "\""], xml(_f, bezier.bezierY2));
    }
    return attribs;
    var _a, _b, _c, _d, _e, _f;
}
function fontToXML(font) {
    // <!ENTITY % font
    //     "font-family  CDATA  #IMPLIED
    //      font-style   CDATA  #IMPLIED
    //      font-size    CDATA  #IMPLIED
    //      font-weight  CDATA  #IMPLIED">
    var attribs = "";
    if (defined(font.fontFamily)) {
        attribs += (_a = [" font-family=\"", "\""], _a.raw = [" font-family=\"", "\""], xml(_a, font.fontFamily));
    }
    if (defined(font.fontStyle)) {
        attribs += (_b = [" font-style=\"", "\""], _b.raw = [" font-style=\"", "\""], xml(_b, font.fontStyle ===
            NormalItalic.Italic ? "italic" : "normal"));
    }
    if (defined(font.fontSize)) {
        attribs += (_c = [" font-size=\"", "\""], _c.raw = [" font-size=\"", "\""], xml(_c, font.fontSize));
    }
    if (defined(font.fontWeight)) {
        attribs += (_d = [" font-weight=\"", "\""], _d.raw = [" font-weight=\"", "\""], xml(_d, font.fontWeight ===
            NormalBold.Bold ? "bold" : "normal"));
    }
    return attribs;
    var _a, _b, _c, _d;
}
function printObjectToXML(printObject) {
    // <!ENTITY % print-object
    //     "print-object  %yes-no;  #IMPLIED">
    if (defined(printObject.printObject)) {
        return (_a = [" print-object=\"", "\""], _a.raw = [" print-object=\"", "\""], yesNo(_a, printObject.printObject));
    }
    return "";
    var _a;
}
function printSpacingToXML(printSpacing) {
    // <!ENTITY % print-spacing
    //     "print-spacing %yes-no;  #IMPLIED">
    if (defined(printSpacing.printSpacing)) {
        return (_a = [" print-spacing=\"", "\""], _a.raw = [" print-spacing=\"", "\""], yesNo(_a, printSpacing.printSpacing));
    }
    return "";
    var _a;
}
function textFormattingToXML(textFormatting) {
    // <!ENTITY % text-formatting
    //     "%justify;
    //      %print-style-align;
    //      %text-decoration;
    //      %text-rotation;
    //      %letter-spacing;
    //      %line-height;
    //      xml:lang NMTOKEN #IMPLIED TODO musicxml-interfaces
    //      xml:space (default | preserve) #IMPLIED TODO musicxml-interfaces
    //      %text-direction;
    //      %enclosure;">
    return "" +
        justifyToXML(textFormatting) +
        printStyleAlignToXML(textFormatting) +
        textDecorationToXML(textFormatting) +
        textRotationToXML(textFormatting) +
        letterSpacingToXML(textFormatting) +
        lineHeightToXML(textFormatting) +
        textDirectionToXML(textFormatting) +
        enclosureToXML(textFormatting);
}
var leftCenterRightToXML = {
    1: "right",
    2: "center",
    0: "left"
};
function justifyToXML(justify) {
    if (defined(justify.justify)) {
        return (_a = [" justify=\"", "\""], _a.raw = [" justify=\"", "\""], xml(_a, leftCenterRightToXML[justify.justify]));
    }
    return "";
    var _a;
}
function halignToXML(halign) {
    if (defined(halign.halign)) {
        return (_a = [" halign=\"", "\""], _a.raw = [" halign=\"", "\""], xml(_a, leftCenterRightToXML[halign.halign]));
    }
    return "";
    var _a;
}
function valignToXML(valign) {
    if (defined(valign.valign)) {
        return (_a = [" valign=\"", "\""], _a.raw = [" valign=\"", "\""], xml(_a, topMiddleBottomBaselineToXML[valign.valign]));
    }
    return "";
    var _a;
}
function printStyleAlignToXML(printStyleAlign) {
    return "" +
        printStyleToXML(printStyleAlign) +
        halignToXML(printStyleAlign) +
        valignToXML(printStyleAlign);
}
function textDecorationToXML(textDecoration) {
    // <!ENTITY % text-decoration
    //     "underline  %number-of-lines;  #IMPLIED
    //      overline  %number-of-lines;   #IMPLIED
    //      line-through  %number-of-lines;   #IMPLIED">
    var attribs = "";
    if (defined(textDecoration.underline)) {
        attribs += (_a = [" underline=\"", "\""], _a.raw = [" underline=\"", "\""], xml(_a, textDecoration.underline));
    }
    if (defined(textDecoration.overline)) {
        attribs += (_b = [" overline=\"", "\""], _b.raw = [" overline=\"", "\""], xml(_b, textDecoration.overline));
    }
    if (defined(textDecoration.lineThrough)) {
        attribs += (_c = [" line-through=\"", "\""], _c.raw = [" line-through=\"", "\""], xml(_c, textDecoration.lineThrough));
    }
    return attribs;
    var _a, _b, _c;
}
function textRotationToXML(textRotation) {
    var attribs = "";
    if (defined(textRotation.rotation)) {
        attribs += (_a = [" rotation=\"", "\""], _a.raw = [" rotation=\"", "\""], xml(_a, textRotation.rotation));
    }
    return attribs;
    var _a;
}
function letterSpacingToXML(letterSpacing) {
    var attribs = "";
    if (defined(letterSpacing.letterSpacing)) {
        attribs += (_a = [" letter-spacing=\"", "\""], _a.raw = [" letter-spacing=\"", "\""], xml(_a, letterSpacing.letterSpacing));
    }
    return attribs;
    var _a;
}
function lineHeightToXML(lineHeight) {
    var attribs = "";
    if (defined(lineHeight.lineHeight)) {
        attribs += (_a = [" line-height=\"", "\""], _a.raw = [" line-height=\"", "\""], xml(_a, lineHeight.lineHeight));
    }
    return attribs;
    var _a;
}
var directionModeToXML = {
    0: "ltr",
    1: "rtl",
    2: "lro",
    3: "rlo"
};
function textDirectionToXML(textDirection) {
    // <!ENTITY % text-direction
    //     "dir (ltr | rtl | lro | rlo) #IMPLIED">
    var attribs = "";
    if (defined(textDirection.dir)) {
        attribs += (_a = [" dir=\"", "\""], _a.raw = [" dir=\"", "\""], xml(_a, directionModeToXML[textDirection.dir]));
    }
    return attribs;
    var _a;
}
var enclosureShapeToXML = {
    3: "circle",
    4: "bracket",
    5: "triangle",
    6: "diamond",
    7: "none",
    1: "square",
    2: "oval",
    0: "rectangle"
};
function enclosureToXML(enclosure) {
    var attribs = "";
    if (defined(enclosure.enclosure)) {
        attribs += (_a = [" enclosure=\"", "\""], _a.raw = [" enclosure=\"", "\""], xml(_a, enclosureShapeToXML[enclosure.enclosure]));
    }
    return attribs;
    var _a;
}
function levelDisplayToXML(levelDisplay) {
    var attribs = "";
    if (defined(levelDisplay.bracket)) {
        attribs += (_a = [" bracket=\"", "\""], _a.raw = [" bracket=\"", "\""], yesNo(_a, levelDisplay.bracket));
    }
    if (levelDisplay.size >= SymbolSize.Unspecified) {
        attribs += (_b = [" size=\"", "\""], _b.raw = [" size=\"", "\""], xml(_b, symbolSizeToXML[levelDisplay.size]));
    }
    if (defined(levelDisplay.parentheses)) {
        attribs += (_c = [" parentheses=\"", "\""], _c.raw = [" parentheses=\"", "\""], yesNo(_c, levelDisplay.bracket));
    }
    return attribs;
    var _a, _b, _c;
}
function bendSoundToXML(bendSound) {
    var attribs = "";
    if (defined(bendSound.accelerate)) {
        attribs += (_a = [" accelerate=\"", "\""], _a.raw = [" accelerate=\"", "\""], yesNo(_a, bendSound.accelerate));
    }
    if (defined(bendSound.beats)) {
        attribs += (_b = [" beats=\"", "\""], _b.raw = [" beats=\"", "\""], xml(_b, bendSound.beats));
    }
    if (defined(bendSound.firstBeat)) {
        attribs += (_c = [" first-beat=\"", "\""], _c.raw = [" first-beat=\"", "\""], xml(_c, bendSound.firstBeat));
    }
    if (defined(bendSound.lastBeat)) {
        attribs += (_d = [" last-beat=\"", "\""], _d.raw = [" last-beat=\"", "\""], xml(_d, bendSound.lastBeat));
    }
    return attribs;
    var _a, _b, _c, _d;
}
var upperMainBelowToXML = {
    1: "main",
    2: "below",
    0: "upper"
};
var wholeHalfUnisonToXML = {
    2: "unison",
    0: "whole",
    1: "half"
};
var wholeHalfNoneToXML = {
    3: "none",
    0: "whole",
    1: "half"
};
function trillSoundToXML(trillSound) {
    // <!ENTITY % trill-sound
    //     "start-note    (upper | main | below)  #IMPLIED
    //      trill-step    (whole | half | unison) #IMPLIED
    //      two-note-turn (whole | half | none)   #IMPLIED
    //      accelerate    %yes-no; #IMPLIED
    //      beats         CDATA    #IMPLIED
    //      second-beat   CDATA    #IMPLIED
    //      last-beat     CDATA    #IMPLIED">
    var attribs = "";
    if (defined(trillSound.startNote)) {
        attribs += (_a = [" start-note=\"", "\""], _a.raw = [" start-note=\"", "\""], xml(_a, upperMainBelowToXML[trillSound.startNote]));
    }
    if (defined(trillSound.trillStep)) {
        attribs += (_b = [" trill-step=\"", "\""], _b.raw = [" trill-step=\"", "\""], xml(_b, wholeHalfUnisonToXML[trillSound.trillStep]));
    }
    if (defined(trillSound.twoNoteTurn)) {
        attribs += (_c = [" two-note-turn=\"", "\""], _c.raw = [" two-note-turn=\"", "\""], xml(_c, wholeHalfNoneToXML[trillSound.twoNoteTurn]));
    }
    if (defined(trillSound.accelerate)) {
        attribs += (_d = [" accelerate=\"", "\""], _d.raw = [" accelerate=\"", "\""], yesNo(_d, trillSound.accelerate));
    }
    if (defined(trillSound.beats)) {
        attribs += (_e = [" beats=\"", "\""], _e.raw = [" beats=\"", "\""], xml(_e, trillSound.beats));
    }
    if (defined(trillSound.secondBeat)) {
        attribs += (_f = [" second-beat=\"", "\""], _f.raw = [" second-beat=\"", "\""], xml(_f, trillSound.secondBeat));
    }
    if (defined(trillSound.lastBeat)) {
        attribs += (_g = [" last-beat=\"", "\""], _g.raw = [" last-beat=\"", "\""], xml(_g, trillSound.lastBeat));
    }
    return attribs;
    var _a, _b, _c, _d, _e, _f, _g;
}
function slashToXML(slash) {
    if (defined(slash.slash)) {
        return (_a = [" slash=\"", "\""], _a.raw = [" slash=\"", "\""], yesNo(_a, slash.slash));
    }
    return "";
    var _a;
}
function mordentSubsetToXML(mordent) {
    //     long %yes-no; #IMPLIED
    //     approach %above-below; #IMPLIED
    //     departure %above-below; #IMPLIED
    var attribs = "";
    if (defined(mordent.long)) {
        attribs += (_a = [" long=\"", "\""], _a.raw = [" long=\"", "\""], yesNo(_a, mordent.long));
    }
    if (defined(mordent.approach)) {
        attribs += (_b = [" approach=\"", "\""], _b.raw = [" approach=\"", "\""], xml(_b, mordent.approach === AboveBelow.Above ?
            "above" : "below"));
    }
    if (defined(mordent.departure)) {
        attribs += (_c = [" departure=\"", "\""], _c.raw = [" departure=\"", "\""], xml(_c, mordent.departure === AboveBelow.Above ?
            "above" : "below"));
    }
    return attribs;
    var _a, _b, _c;
}
function upDownToXML(upDown) {
    if (defined(upDown.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, upDown.type ? "down" : "up"));
    }
    return "";
    var _a;
}
function topBottomToXML(topBottom) {
    if (defined(topBottom.type)) {
        return (_a = [" type=\"", "\""], _a.raw = [" type=\"", "\""], xml(_a, topBottom.type ? "bottom" : "top"));
    }
    return "";
    var _a;
}
function colorToXML(color) {
    // <!ENTITY % color
    //     "color CDATA #IMPLIED">
    if (defined(color.color)) {
        return (_a = [" color=\"", "\""], _a.raw = [" color=\"", "\""], xml(_a, color.color));
    }
    return "";
    var _a;
}
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
