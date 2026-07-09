/**
 * (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015.
 * Part of the musicxml-interfaces <https://github.com/emilyskidsister/musicxml-interfaces>.
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
export function parseScore(score: string): ScoreTimewise {
  let dom: Document = xmlToParttimeDoc(score);
  return xmlToScoreTimewise(dom.documentElement);
}

/**
 * Reads a document, and returns header information.
 *
 * ScoreHeader is a subset of ScoreTimewise, so you can always just call MusicXML.parse.score.
 * This function is a bit faster though, if you only care about metadata.
 */
export function paseScoreHeader(score: string): ScoreHeader {
  return xmlToScoreHeader(xmlToDoc(score).documentElement);
}

/**
 * Converts a MusicXML <measure /> from a **parttime** document into JSON.
 */
export function parseMeasure(str: string) {
  return xmlToMeasure(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <note /> into JSON.
 */
export function parseNote(str: string) {
  return xmlToNote(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <clef /> into JSON.
 */
export function parseClef(str: string) {
  return xmlToClef(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <time /> into JSON.
 */
export function parseTime(str: string) {
  return xmlToTime(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <key /> into JSON.
 */
export function parseKey(str: string) {
  return xmlToKey(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <part-symbol /> into JSON.
 */
export function parsePartSymbol(str: string) {
  return xmlToPartSymbol(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <backup /> into JSON.
 */
export function parseBackup(str: string) {
  return xmlToBackup(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <harmony /> into JSON.
 */
export function parseHarmony(str: string) {
  return xmlToHarmony(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <forward /> into JSON.
 */
export function parseForward(str: string) {
  return xmlToForward(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <print /> into JSON.
 */
export function parsePrint(str: string) {
  return xmlToPrint(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <figured-bass /> into JSON.
 */
export function parseFiguredBass(str: string) {
  return xmlToFiguredBass(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <direction /> into JSON.
 */
export function parseDirection(str: string) {
  return xmlToDirection(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <attributes /> object into JSON.
 */
export function parseAttributes(str: string) {
  return xmlToAttributes(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <sound /> into JSON.
 */
export function parseSound(str: string) {
  return xmlToSound(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <barline /> into JSON.
 */
export function parseBarline(str: string) {
  return xmlToBarline(xmlToDoc(str).documentElement);
}

/**
 * Converts a MusicXML <grouping /> into JSON.
 */
export function parseGrouping(str: string) {
  return xmlToGrouping(xmlToDoc(str).documentElement);
}

/*---- Serialization API ------------------------------------------------------------------------*/

export function serializeScore(
  score: ScoreTimewise,
  parttime: boolean = false
): string {
  let timewise = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-timewise
  PUBLIC "-//Recordare//DTD MusicXML 3.0 Timewise//EN" "http://www.musicxml.org/dtds/timewise.dtd">
<score-timewise version="3.0">
${scoreHeaderToXML(score)
  .join("\n")
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}
${score.measures
  .map((measure) => measureToXML(measure))
  .join("\n")
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}
</score-timewise>`;
  if (!parttime) {
    return timewise;
  }
  return timewiseToPartwise(timewise);
}

export function serializeScoreHeader(scoreHeader: ScoreHeader) {
  return scoreHeaderToXML(scoreHeader).join("\n");
}
export let serializeMeasure = <(measure: Measure) => string>measureToXML;
export let serializeNote = <(note: Note) => string>noteToXML;
export let serializeClef = <(clef: Clef) => string>clefToXML;
export let serializeTime = <(time: Time) => string>timeToXML;
export let serializeKey = <(key: Key) => string>keyToXML;
export let serializePartSymbol = <(partSymbol: PartSymbol) => string>(
  partSymbolToXML
);
export let serializeBackup = <(backup: Backup) => string>backupToXML;
export let serializeHarmony = <(harmony: Harmony) => string>harmonyToXML;
export let serializeForward = <(forward: Forward) => string>forwardToXML;
export let serializePrint = <(print: Print) => string>printToXML;
export let serializeFiguredBass = <(figuredBass: FiguredBass) => string>(
  figuredBassToXML
);
export let serializeDirection = <(direction: Direction) => string>(
  directionToXML
);
export let serializeAttributes = <(attributes: Attributes) => string>(
  attributesToXML
);
export let serializeSound = <(sound: Sound) => string>soundToXML;
export let serializeBarline = <(barline: Barline) => string>barlineToXML;
export let serializeGrouping = <(grouping: Grouping) => string>groupingToXML;

/*---- Initialization and Utility ---------------------------------------------------------------*/

declare let require: {
  (id: string): any;
  resolve(id: string): string;
  cache: any;
  extensions: any;
  main: any;
};

declare class XSLTProcessor {
  constructor();

  importStylesheet(xsl: Node): void;

  setParameter(param: string, name: string, value: string): void;
  setParameter(param: string, name: string, value: number): void;

  reset(): void;

  transformToFragment(xml: Node, document: Document): Node;

  transformToDocument(xml: Node): Document;
}

let process: any;
let isIE = typeof window !== "undefined" && "ActiveXObject" in window;
let isNode =
  typeof window === "undefined" ||
  (typeof (<any>process) !== "undefined" && !(<any>process).browser);

var xmlToParttimeDoc: (str: string) => Document;
var timewiseToPartwise: (str: string) => string;
var xmlToDoc: (str: string) => Document;

(function init() {
  let parttimeXSLBuffer =
    '<?xml version="1.0" encoding="UTF-8"?> <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"> <xsl:output method="xml" indent="yes" encoding="UTF-8" omit-xml-declaration="no" standalone="no" doctype-system="http://www.musicxml.org/dtds/timewise.dtd" doctype-public="-//Recordare//DTD MusicXML 3.0 Timewise//EN" /> <xsl:template match="/"> <xsl:apply-templates select="./score-partwise"/> <xsl:apply-templates select="./score-timewise"/> </xsl:template> <xsl:template match="score-timewise"> <xsl:copy-of select="." /> </xsl:template> <xsl:template match="text()"> <xsl:value-of select="." /> </xsl:template> <xsl:template match="*|@*|comment()|processing-instruction()"> <xsl:copy><xsl:apply-templates select="*|@*|comment()|processing-instruction()|text()" /></xsl:copy> </xsl:template> <xsl:template match="score-partwise"> <xsl:element name="score-timewise"> <xsl:apply-templates select="@version[.!=\'1.0\']"/> <xsl:apply-templates select="work"/> <xsl:apply-templates select="movement-number"/> <xsl:apply-templates select="movement-title"/> <xsl:apply-templates select="identification"/> <xsl:apply-templates select="defaults"/> <xsl:apply-templates select="credit"/> <xsl:apply-templates select="part-list"/> <xsl:for-each select="part[1]/measure"> <xsl:variable name="measure-number"> <xsl:value-of select="@number"/> </xsl:variable> <xsl:element name="measure"> <xsl:attribute name="number"> <xsl:value-of select="$measure-number"/> </xsl:attribute> <xsl:if test="@implicit[. = \'yes\']"> <xsl:attribute name="implicit"> <xsl:value-of select="@implicit"/> </xsl:attribute> </xsl:if> <xsl:if test="@non-controlling[. = \'yes\']"> <xsl:attribute name="non-controlling"> <xsl:value-of select="@non-controlling"/> </xsl:attribute> </xsl:if> <xsl:if test="@width"> <xsl:attribute name="width"> <xsl:value-of select="@width"/> </xsl:attribute> </xsl:if> <xsl:for-each select="../../part/measure"> <xsl:if test="@number=$measure-number"> <xsl:element name="part"> <xsl:attribute name="id"> <xsl:value-of select="parent::part/@id"/> </xsl:attribute> <xsl:apply-templates /> </xsl:element> </xsl:if> </xsl:for-each> </xsl:element> </xsl:for-each> </xsl:element> </xsl:template> </xsl:stylesheet>';
  let timepartXSLBuffer =
    '<?xml version="1.0" encoding="UTF-8"?> <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"> <xsl:output method="xml" indent="yes" encoding="UTF-8" omit-xml-declaration="no" standalone="no" doctype-system="http://www.musicxml.org/dtds/partwise.dtd" doctype-public="-//Recordare//DTD MusicXML 3.0 Partwise//EN" /> <xsl:template match="/"> <xsl:apply-templates select="./score-partwise"/> <xsl:apply-templates select="./score-timewise"/> </xsl:template> <xsl:template match="score-partwise"> <xsl:copy-of select="." /> </xsl:template> <xsl:template match="text()"> <xsl:value-of select="." /> </xsl:template> <xsl:template match="*|@*|comment()|processing-instruction()"> <xsl:copy><xsl:apply-templates select="*|@*|comment()|processing-instruction()|text()" /></xsl:copy> </xsl:template> <xsl:template match="score-timewise"> <xsl:element name="score-partwise"> <xsl:apply-templates select="@version[.!=\'1.0\']"/> <xsl:apply-templates select="work"/> <xsl:apply-templates select="movement-number"/> <xsl:apply-templates select="movement-title"/> <xsl:apply-templates select="identification"/> <xsl:apply-templates select="defaults"/> <xsl:apply-templates select="credit"/> <xsl:apply-templates select="part-list"/> <xsl:for-each select="measure[1]/part"> <xsl:variable name="part-id"> <xsl:value-of select="@id"/> </xsl:variable> <xsl:element name="part"> <xsl:copy-of select="@id" /> <xsl:for-each select="../../measure/part"> <xsl:if test="@id=$part-id"> <xsl:element name="measure"> <xsl:attribute name="number"> <xsl:value-of select="parent::measure/@number"/> </xsl:attribute> <xsl:if test="parent::measure/@implicit[. = \'yes\']"> <xsl:attribute name="implicit"> <xsl:value-of select="parent::measure/@implicit"/> </xsl:attribute> </xsl:if> <xsl:if test="parent::measure/@non-controlling[. = \'yes\']"> <xsl:attribute name="non-controlling"> <xsl:value-of select="parent::measure/@non-controlling"/> </xsl:attribute> </xsl:if> <xsl:if test="parent::measure/@width"> <xsl:attribute name="width"> <xsl:value-of select="parent::measure/@width"/> </xsl:attribute> </xsl:if> <xsl:apply-templates /> </xsl:element> </xsl:if> </xsl:for-each> </xsl:element> </xsl:for-each> </xsl:element> </xsl:template> </xsl:stylesheet>';

  if (isIE) {
    var DOMParser = (<any>window).DOMParser;
    xmlToDoc = function (str: string) {
      return new DOMParser().parseFromString(str, "text/xml");
    };
    xmlToParttimeDoc = function (str: string) {
      let xslt = new ActiveXObject("Msxml2.XSLTemplate");
      let xmlDoc = new ActiveXObject("Msxml2.DOMDocument");
      let xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");

      // Why these aren't set by default completely flabbergasts me.
      xmlDoc.validateOnParse = false;
      xslDoc.validateOnParse = false;
      xmlDoc.resolveExternals = false;
      xslDoc.resolveExternals = false;

      xmlDoc.loadXML(str);
      xslDoc.loadXML(parttimeXSLBuffer);
      xslt.stylesheet = xslDoc;
      let xslProc = xslt.createProcessor();
      xslProc.input = xmlDoc;
      xslProc.transform();
      return xmlToDoc(xslProc.output);
    };
    timewiseToPartwise = function (str: string) {
      let xslt = new ActiveXObject("Msxml2.XSLTemplate");
      let xmlDoc = new ActiveXObject("Msxml2.DOMDocument");
      let xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");

      // Why these aren't set by default completely flabbergasts me.
      xmlDoc.validateOnParse = false;
      xslDoc.validateOnParse = false;
      xmlDoc.resolveExternals = false;
      xslDoc.resolveExternals = false;

      xmlDoc.loadXML(str);
      xslDoc.loadXML(timepartXSLBuffer);
      xslt.stylesheet = xslDoc;
      let xslProc = xslt.createProcessor();
      xslProc.input = xmlDoc;
      xslProc.transform();
      return xslProc.output;
    };
  } else if (isNode) {
    var DOMParser: typeof DOMParser = require("@xmldom/xmldom").DOMParser;
    let spawnSync = (<any>require("child_process")).spawnSync;
    let path = <any>require("path");
    xmlToDoc = function (str: string) {
      return new DOMParser().parseFromString(str, "text/xml");
    };
    xmlToParttimeDoc = function (str: string) {
      let res = spawnSync(
        "xsltproc",
        [
          "--nonet",
          path.join(__dirname, "..", "vendor", "musicxml-dtd", "parttime.xsl"),
          "-",
        ],
        {
          input: str,
          env: {
            XML_CATALOG_FILES: path.join(
              __dirname,
              "..",
              "vendor",
              "musicxml-dtd",
              "catalog.xml"
            ),
          },
        }
      );
      if (res.error) {
        throw res.error;
      }
      return xmlToDoc(res.stdout.toString());
    };
    timewiseToPartwise = function (str: string) {
      let res = spawnSync(
        "xsltproc",
        [
          "--nonet",
          path.join(__dirname, "..", "vendor", "musicxml-dtd", "parttime.xsl"),
          "-",
        ],
        {
          input: str,
          env: {
            XML_CATALOG_FILES: path.join(
              __dirname,
              "..",
              "vendor",
              "musicxml-dtd",
              "catalog.xml"
            ),
          },
        }
      );
      if (res.error) {
        throw res.error;
      }
      return res.stdout.toString();
    };
  } else {
    var DOMParser = (<any>window).DOMParser;
    let parttimeXSLDoc = new DOMParser().parseFromString(
      parttimeXSLBuffer,
      "text/xml"
    );
    let timepartXSLDoc = new DOMParser().parseFromString(
      timepartXSLBuffer,
      "text/xml"
    );

    let parttimeXSLProcessor: XSLTProcessor = new XSLTProcessor();
    parttimeXSLProcessor.importStylesheet(parttimeXSLDoc);
    let timepartXSLProcessor: XSLTProcessor = new XSLTProcessor();
    timepartXSLProcessor.importStylesheet(timepartXSLDoc);

    xmlToDoc = function (str: string) {
      return new DOMParser().parseFromString(str, "text/xml");
    };

    xmlToParttimeDoc = function (str: string) {
      let dom: Document = new DOMParser().parseFromString(str, "text/xml");
      return parttimeXSLProcessor.transformToDocument(dom);
    };
    timewiseToPartwise = function (str: string) {
      let dom: Document = new DOMParser().parseFromString(str, "text/xml");
      return new XMLSerializer().serializeToString(
        timepartXSLProcessor.transformToDocument(dom).documentElement
      );
    };
  }
})();

function popFront(t: string) {
  return t.slice(1);
}

function getString(ch: Node, required: boolean) {
  return (
    ch.nodeType === ch.ATTRIBUTE_NODE ? (<Attr>ch).value : ch.textContent
  ).trim();
}

function getNumber(ch: Node, required: boolean) {
  let s = getString(ch, required);
  if (s.toLowerCase().indexOf("0x") === 0) {
    return parseInt(s, 16);
  } else {
    return parseFloat(s);
  }
}

function toCamelCase(input: string) {
  return input.toLowerCase().replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
}

/*---- Types ------------------------------------------------------------------------------------*/

export interface TextSegment {
  _snapshot?: TextSegment;
  acc?: AccidentalText;
  text?: DisplayText;
}

export interface EncodingDate extends CalendarDate {
  _snapshot?: EncodingDate;
}

/**
 * Calendar dates are represented yyyy-mm-dd format, following
 * ISO 8601.
 */
export interface CalendarDate {
  _snapshot?: CalendarDate;
  /**
   * The 1-indexed month number
   */
  month: number;

  /**
   * The day of the month
   */
  day: number;

  /**
   * The year number (e.g., 2015)
   */
  year: number;
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
export enum StartStop {
  Start = 0,
  Stop = 1,
}

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
export enum StartStopContinue {
  Start = 0,
  Stop = 1,
  Continue = 2,
}

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
export enum StartStopSingle {
  Single = 3,
  Start = 0,
  Stop = 1,
}

/**
 * The symbol-size entity is used to indicate full vs.
 * cue-sized vs. oversized symbols. The large value
 * for oversized symbols was added in version 1.1.
 */
export enum SymbolSize {
  /**
   * Context-dependant.
   */
  Unspecified = 0,
  Full = 1,
  Cue = 2,
  /**
   * Oversized.
   */
  Large = 3,
}

/**
 * The above-below type is used to indicate whether one
 * element appears above or below another element.
 */
export enum AboveBelow {
  Above = 1,
  Below = 2,
  Unspecified = 0,
}

/**
 * Specifies orientation.
 */
export enum OverUnder {
  Over = 1,
  Under = 2,
  Unspecified = 0,
}

/**
 * The up-down entity is used for arrow direction,
 * indicating which way the tip is pointing.
 */
export enum UpDown {
  Down = 1,
  Up = 0,
}

/**
 * The top-bottom entity is used to indicate the top or
 * bottom part of a vertical shape like non-arpeggiate.
 */
export enum TopBottom {
  Top = 0,
  Bottom = 1,
}

/**
 * The left-right entity is used to indicate whether one
 * element appears to the left or the right of another
 * element.
 */
export enum LeftRight {
  Right = 1,
  Left = 0,
}

/**
 * The enclosure-shape entity describes the shape and
 * presence / absence of an enclosure around text. A bracket
 * enclosure is similar to a rectangle with the bottom line
 * missing, as is common in jazz notation.
 */
export enum EnclosureShape {
  Circle = 3,
  Bracket = 4,
  Triangle = 5,
  Diamond = 6,
  None = 7,
  Square = 1,
  Oval = 2,
  Rectangle = 0,
}

export enum NormalItalic {
  Italic = 1,
  Normal = 0,
}

export enum NormalBold {
  Bold = 2,
  Normal = 0,
}

/**
 * The position attributes are based on MuseData print
 * suggestions. For most elements, any program will compute
 * a default x and y position. The position attributes let
 * the computation of the default position be changed or an
 * offset added.
 *
 * Positive x is right, negative x is left; positive y is up,
 * negative y is down. All units are in tenths of interline
 * space. For stems, positive relative-y lengthens a stem
 * while negative relative-y shortens it.
 *
 * As elsewhere in the MusicXML format, tenths are the global
 * tenths defined by the scaling element, not the local tenths
 * of a staff resized by the staff-size element.
 */
export interface Position {
  _snapshot?: Position;
  /**
   * The default-x attribute changes the
   * computation of the default position. For most elements,
   * the origin is changed relative to the left-hand side of
   * the note or the musical position within the bar (x).
   *
   * For the following elements, the default-x value changes
   * the origin relative to the start of the current measure:
   *
   *     - note
   *     - figured-bass
   *     - harmony
   *     - link
   *     - directive
   *     - measure-numbering
   *     - all descendants of the part-list element
   *     - all children of the direction-type element
   *
   * This origin is from the start of the entire measure,
   * at either the left barline or the start of the system.
   *
   * When the default-x attribute is used within a child element
   * of the part-name-display, part-abbreviation-display,
   * group-name-display, or group-abbreviation-display elements,
   * it changes the origin relative to the start of the first
   * measure on the system. These values are used when the current
   * measure or a succeeding measure starts a new system. The same
   * change of origin is used for the group-symbol element.
   *
   * For the note, figured-bass, and harmony elements, the
   * default-x value is considered to have adjusted the musical
   * position within the bar for its descendant elements.
   *
   * Since the credit-words and credit-image elements are not
   * related to a measure, in these cases the default-x and
   * default-y attributes adjust the origin relative to the
   * bottom left-hand corner of the specified page.
   *
   * The default-x and default-y position attributes provide
   * higher-resolution positioning data than related features
   * such as the placement attribute and the offset element.
   * Applications reading a MusicXML file that can understand
   * both features should generally rely on the default-x and
   * default-y attributes for their greater accuracy. For the
   * relative-x and relative-y attributes, the offset element,
   * placement attribute, and directive attribute provide
   * context for the relative position information, so the two
   * features should be interpreted together.
   */
  defaultX?: number;
  /**
   * The relative-y attribute changes the vertical position
   * relative to the default position, either as computed by the
   * individual program, or as overridden by the default-y attribute.
   */
  relativeY?: number;
  /**
   * The default-y attribute changes the
   * computation of the default position. For most elements,
   * the origin is changed relative to the top line of the staff (y).
   *
   * Since the credit-words and credit-image elements are not
   * related to a measure, in these cases the default-x and
   * default-y attributes adjust the origin relative to the
   * bottom left-hand corner of the specified page.
   *
   * The default-x and default-y position attributes provide
   * higher-resolution positioning data than related features
   * such as the placement attribute and the offset element.
   * Applications reading a MusicXML file that can understand
   * both features should generally rely on the default-x and
   * default-y attributes for their greater accuracy. For the
   * relative-x and relative-y attributes, the offset element,
   * placement attribute, and directive attribute provide
   * context for the relative position information, so the two
   * features should be interpreted together.
   */
  defaultY?: number;
  /**
   * The relative-x attribute changes the horizontal position
   * relative to the default position, either as computed by the
   * individual program, or as overridden by the default-x attribute.
   */
  relativeX?: number;
}
/**
 * The placement attribute indicates whether something is
 * above or below another element, such as a note or a
 * notation.
 */
export interface Placement {
  _snapshot?: Placement;
  placement?: AboveBelow;
}

/**
 * The orientation attribute indicates whether slurs and
 * ties are overhand (tips down) or underhand (tips up).
 * This is distinct from the placement entity used by any
 * notation type.
 */
export interface Orientation {
  _snapshot?: Orientation;
  orientation?: OverUnder;
}

/**
 * The directive entity changes the default-x position
 * of a direction. It indicates that the left-hand side of the
 * direction is aligned with the left-hand side of the time
 * signature. If no time signature is present, it is aligned
 * with the left-hand side of the first music notational
 * element in the measure. If a default-x, justify, or halign
 * attribute is present, it overrides the directive entity.
 */
export interface DirectiveEntity {
  _snapshot?: DirectiveEntity;
  directive?: boolean;
}

/**
 * The bezier entity is used to indicate the curvature of
 * slurs and ties, representing the control points for a
 * cubic bezier curve. For ties, the bezier entity is
 * used with the tied element.
 * Normal slurs, S-shaped slurs, and ties need only two
 * bezier points: one associated with the start of the slur
 * or tie, the other with the stop. Complex slurs and slurs
 * divided over system breaks can specify additional
 * bezier data at slur elements with a continue type.
 *
 * The bezier-offset, bezier-x, and bezier-y attributes
 * describe the outgoing bezier point for slurs and ties
 * with a start type, and the incoming bezier point for
 * slurs and ties with types of stop or continue. The
 * attributes bezier-offset2, bezier-x2, and bezier-y2
 * are only valid with slurs of type continue, and
 * describe the outgoing bezier point.
 *
 * The bezier-offset and bezier-offset2 attributes are
 * measured in terms of musical divisions, like the offset
 * element. These are the recommended attributes for
 * specifying horizontal position. The other attributes
 * are specified in tenths, relative to any position
 * settings associated with the slur or tied element.
 */
export interface Bezier {
  _snapshot?: Bezier;
  bezierX2?: number;
  bezierOffset?: number;
  bezierOffset2?: number;
  bezierX?: number;
  bezierY?: number;
  bezierY2?: number;
}

/**
 * The font entity gathers together attributes for
 * determining the font within a directive or direction.
 * They are based on the text styles for Cascading
 * Style Sheets. The font-family is a comma-separated list
 * of font names. These can be specific font styles such
 * as Maestro or Opus, or one of several generic font styles:
 * music, engraved, handwritten, text, serif, sans-serif,
 * handwritten, cursive, fantasy, and monospace. The music,
 * engraved, and handwritten values refer to music fonts;
 * the rest refer to text fonts. The fantasy style refers to
 * decorative text such as found in older German-style
 * printing. The font-style can be normal or italic. The
 * font-size can be one of the CSS sizes (xx-small, x-small,
 * small, medium, large, x-large, xx-large) or a numeric
 * point size. The font-weight can be normal or bold. The
 * default is application-dependent, but is a text font vs.
 * a music font.
 */
export interface Font {
  _snapshot?: Font;
  fontFamily?: string;
  fontWeight?: NormalBold;
  fontStyle?: NormalItalic;
  fontSize?: string;
}

export enum LeftCenterRight {
  Right = 1,
  Center = 2,
  Left = 0,
}

export enum TopMiddleBottomBaseline {
  Top = 0,
  Middle = 1,
  Baseline = 3,
  Bottom = 2,
}

export enum DirectionMode {
  Lro = 2,
  Rlo = 3,
  Ltr = 0,
  Rtl = 1,
}

export enum StraightCurved {
  Curved = 1,
  Straight = 0,
}

export enum SolidDashedDottedWavy {
  Dashed = 1,
  Wavy = 3,
  Dotted = 2,
  Solid = 0,
}

export enum NormalAngledSquare {
  Angled = 1,
  Square = 2,
  Normal = 0,
}

export enum UprightInverted {
  Upright = 0,
  Inverted = 1,
}

export enum UpperMainBelow {
  Main = 1,
  Below = 2,
  Upper = 0,
}

export enum WholeHalfUnison {
  Unison = 2,
  Whole = 0,
  Half = 1,
}

export enum WholeHalfNone {
  None = 3,
  Whole = 0,
  Half = 1,
}

/**
 * The color entity indicates the color of an element.
 * Color may be represented as hexadecimal RGB triples,
 * as in HTML, or as hexadecimal ARGB tuples, with the
 * A indicating alpha of transparency. An alpha value
 * of 00 is totally transparent; FF is totally opaque.
 * If RGB is used, the A value is assumed to be FF.
 * For instance, the RGB value "#800080" represents
 * purple. An ARGB value of "#40800080" would be a
 * transparent purple.
 *
 *
 * As in SVG 1.1, colors are defined in terms of the
 * sRGB color space (IEC 61966).
 */
export interface Color {
  _snapshot?: Color;
  color?: string;
}
/**
 * The text-decoration entity is based on the similar
 * feature in XHTML and CSS. It allows for text to
 * be underlined, overlined, or struck-through. It
 * extends the CSS version by allow double or
 * triple lines instead of just being on or off.
 */
export interface TextDecoration {
  _snapshot?: TextDecoration;
  underline?: number;
  overline?: number;
  lineThrough?: number;
}

/**
 * The justify entity is used to indicate left, center, or
 * right justification. The default value leties for different
 * elements. For elements where the justify attribute is present
 * but the halign attribute is not, the justify attribute
 * indicates horizontal alignment as well as justification.
 */
export interface Justify {
  _snapshot?: Justify;
  justify?: LeftCenterRight;
}

/**
 * In cases where text extends over more than one line,
 * horizontal alignment and justify values can be different.
 * The most typical case is for credits, such as:
 * Words and music by
 *   Pat Songwriter
 *
 *
 * Typically this type of credit is aligned to the right,
 * so that the position information refers to the right-
 * most part of the text. But in this example, the text
 * is center-justified, not right-justified.
 *
 * The halign attribute is used in these situations. If it
 * is not present, its value is the same as for the justify
 * attribute.
 */
export interface Halign {
  _snapshot?: Halign;
  halign?: LeftCenterRight;
}

/**
 * The valign entity is used to indicate vertical
 * alignment to the top, middle, bottom, or baseline
 * of the text. Defaults are implementation-dependent.
 */
export interface Valign {
  _snapshot?: Valign;
  valign?: TopMiddleBottomBaseline;
}

/**
 * The valign-image entity is used to indicate vertical
 * alignment for images and graphics, so it removes the
 * baseline value. Defaults are implementation-dependent.
 */
export interface ValignImage {
  _snapshot?: ValignImage;
  valignImage?: TopMiddleBottomBaseline;
}

/**
 * The letter-spacing entity specifies text tracking.
 * Values are either "normal" or a number representing
 * the number of ems to add between each letter. The
 * number may be negative in order to subtract space.
 * The default is normal, which allows flexibility of
 * letter-spacing for purposes of text justification.
 */
export interface LetterSpacing {
  _snapshot?: LetterSpacing;
  letterSpacing?: string;
}

function xmlToEncodingDate(node: Node): CalendarDate {
  let text: string = getString(node, true);
  if (text.length < 10) {
    return null;
  }
  return {
    year: parseFloat(text.slice(0, 4)),
    month: parseFloat(text.slice(5, 7)),
    day: parseFloat(text.slice(8, 10)),
  };
}

function xmlToMeasure(node: Element) {
  let ret: Measure = <any>{};
  let foundImplicit = false;
  let foundNonControlling = false;
  let foundNumber = false;
  let foundWidth = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "part") {
      let dataPart = xmlToPart(ch);
      ret.parts = ret.parts || {};
      ret.parts[(<any>ch).getAttribute("id")] = dataPart;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getString(ch2, true);
      ret.number = dataNumber;
      foundNumber = true;
    }
    if (ch2.name === "implicit") {
      let dataImplicit = xmlToYesNo(ch2, true);
      ret.implicit = dataImplicit;
      foundImplicit = true;
    }
    if (ch2.name === "width") {
      let dataWidth = getNumber(ch2, true);
      ret.width = dataWidth;
      foundWidth = true;
    }
    if (ch2.name === "non-controlling") {
      let dataNonControlling = xmlToYesNo(ch2, true);
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

function xmlToYesNo(p: Node, required?: boolean): boolean {
  let s = getString(p, true);
  if (s == "no") {
    return false;
  }
  if (s == "yes") {
    return true;
  }
  return false;
}

function xmlToNoteheadText(p: Node): NoteheadText {
  // TODO
  return null;
}

function xmlToPartNameDisplay(p: Node): PartNameDisplay {
  // TODO
  return null;
}

function xmlToPartAbbreviationDisplay(p: Node): PartAbbreviationDisplay {
  // TODO
  return null;
}

function xmlToGroupNameDisplay(p: Node): GroupNameDisplay {
  // TODO
  return null;
}

function xmlToGroupAbbreviationDisplay(p: Node): GroupAbbreviationDisplay {
  // TODO
  return null;
}

function xmlToLyric(node: Element) {
  let ret: Lyric = <any>{};
  let foundNumber_ = false;
  let foundJustify = false;
  let foundDefaultX = false;
  let foundRelativeY = false;
  let foundDefaultY = false;
  let foundRelativeX = false;
  let foundPlacement = false;
  let foundColor = false;
  let foundPrintObject = false;
  let foundName = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber_ = getNumber(ch2, true);
      ret.number = dataNumber_;
      foundNumber_ = true;
    }
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
      foundDefaultX = true;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
      foundRelativeY = true;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
      foundDefaultY = true;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
      foundRelativeX = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "name") {
      let dataName = getString(ch2, true);
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

function getStartStop(node: Node, fallbackVal?: StartStop) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getStartStopContinue(node: Node, fallbackVal?: StartStopContinue) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getStartStopSingle(node: Node, fallbackVal?: StartStopSingle) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getSymbolSize(node: Node, fallbackVal?: SymbolSize) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getAboveBelow(node: Node, fallbackVal?: AboveBelow) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getUpDown(node: Node, fallbackVal?: UpDown) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getOverUnder(node: Node, fallbackVal?: OverUnder) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getTopBottom(node: Node, fallbackVal?: TopBottom) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getLeftRight(node: Node, fallbackVal?: LeftRight) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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
function verifyNumberOfLines(m: number) {
  // assert(m >= 0 && m <= 3);
}

function xmlToNumberOfLines(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

function verifyRotation(m: number) {
  // assert(m >= -180 && m <= 180);
}

function xmlToRotation(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

function getEnclosureShape(node: Node, fallbackVal?: EnclosureShape) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getNormalItalic(node: Node, fallbackVal?: NormalItalic) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getNormalBold(node: Node, fallbackVal?: NormalBold) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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
function verifyNumberLevel(m: number) {
  // assert(m >= 1 && m <= 6);
}

function xmlToNumberLevel(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
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
function verifyBeamLevel(m: number) {
  // assert(m >= 1 && m <= 8);
}

function xmlToBeamLevel(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

function xmlToPosition(node: Element) {
  let ret: Position = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
  }
  return ret;
}

function xmlToPlacement(node: Element) {
  let ret: Placement = <any>{};
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  if (!foundPlacement) {
    ret.placement = AboveBelow.Unspecified;
  }
  return ret;
}

function xmlToDirectiveEntity(node: Element) {
  let ret: DirectiveEntity = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "directive") {
      let dataDirective = xmlToYesNo(ch2);
      ret.directive = dataDirective;
    }
  }
  return ret;
}

function xmlToBezier(node: Element) {
  let ret: Bezier = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "bezier-x2") {
      let dataBezierX2 = getNumber(ch2, true);
      ret.bezierX2 = dataBezierX2;
    }
    if (ch2.name === "bezier-offset") {
      let dataBezierOffset = getNumber(ch2, true);
      ret.bezierOffset = dataBezierOffset;
    }
    if (ch2.name === "bezier-offset2") {
      let dataBezierOffset2 = getNumber(ch2, true);
      ret.bezierOffset2 = dataBezierOffset2;
    }
    if (ch2.name === "bezier-x") {
      let dataBezierX = getNumber(ch2, true);
      ret.bezierX = dataBezierX;
    }
    if (ch2.name === "bezier-y") {
      let dataBezierY = getNumber(ch2, true);
      ret.bezierY = dataBezierY;
    }
    if (ch2.name === "bezier-y2") {
      let dataBezierY2 = getNumber(ch2, true);
      ret.bezierY2 = dataBezierY2;
    }
  }
  return ret;
}

function xmlToOrientation(node: Element) {
  let ret: Orientation = <any>{};
  let foundOrientation = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "orientation") {
      let dataOrientation = getOverUnder(ch2, OverUnder.Unspecified);
      ret.orientation = dataOrientation;
      foundOrientation = true;
    }
  }
  if (!foundOrientation) {
    ret.orientation = OverUnder.Unspecified;
  }
  return ret;
}

function xmlToFont(node: Element) {
  let ret: Font = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
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

function getLeftCenterRight(node: Node, fallbackVal?: LeftCenterRight) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getTopMiddleBottomBaseline(
  node: Node,
  fallbackVal?: TopMiddleBottomBaseline
) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getDirectionMode(node: Node, fallbackVal?: DirectionMode) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getStraightCurved(node: Node, fallbackVal?: StraightCurved) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getSolidDashedDottedWavy(
  node: Node,
  fallbackVal?: SolidDashedDottedWavy
) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getNormalAngledSquare(node: Node, fallbackVal?: NormalAngledSquare) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getUprightInverted(node: Node, fallbackVal?: UprightInverted) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getUpperMainBelow(node: Node, fallbackVal?: UpperMainBelow) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getWholeHalfUnison(node: Node, fallbackVal?: WholeHalfUnison) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function getWholeHalfNone(node: Node, fallbackVal?: WholeHalfNone) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

function xmlToColor(node: Element) {
  let ret: Color = <any>{};
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  if (!foundColor) {
    ret.color = "#000000";
  }
  return ret;
}

function xmlToTextDecoration(node: Element) {
  let ret: TextDecoration = <any>{};
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
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

function xmlToJustify(node: Element) {
  let ret: Justify = <any>{};
  let foundJustify = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
  }
  if (!foundJustify) {
    ret.justify = LeftCenterRight.Left;
  }
  return ret;
}

function xmlToHalign(node: Element) {
  let ret: Halign = <any>{};
  let foundHalign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
  }
  if (!foundHalign) {
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  return ret;
}

function xmlToValign(node: Element) {
  let ret: Valign = <any>{};
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

function xmlToValignImage(node: Element) {
  let ret: ValignImage = <any>{};
  let foundValignImage = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "valign") {
      let dataValignImage = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valignImage = dataValignImage;
      foundValignImage = true;
    }
  }
  if (!foundValignImage) {
    ret.valignImage = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

function xmlToLetterSpacing(node: Element) {
  let ret: LetterSpacing = <any>{};
  let foundLetterSpacing = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
  }
  if (!foundLetterSpacing) {
    ret.letterSpacing = "normal";
  }
  return ret;
}

/**
 * The line-height entity specified text leading. Values
 * are either "normal" or a number representing the
 * percentage of the current font height  to use for
 * leading. The default is "normal". The exact normal
 * value is implementation-dependent, but values
 * between 100 and 120 are recommended.
 */
export interface LineHeight {
  _snapshot?: LineHeight;
  lineHeight?: string;
}

function xmlToLineHeight(node: Element) {
  let ret: LineHeight = <any>{};
  let foundLineHeight = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
  }
  if (!foundLineHeight) {
    ret.lineHeight = "normal";
  }
  return ret;
}

/**
 * The text-direction entity is used to adjust and override
 * the Unicode bidirectional text algorithm, similar to the
 * W3C Internationalization Tag Set recommendation. Values
 * are ltr (left-to-right embed), rtl (right-to-left embed),
 * lro (left-to-right bidi-override), and rlo (right-to-left
 * bidi-override). The default value is ltr. This entity
 * is typically used by applications that store text in
 * left-to-right visual order rather than logical order.
 * Such applications can use the lro value to better
 * communicate with other applications that more fully
 * support bidirectional text.
 */
export interface TextDirection {
  _snapshot?: TextDirection;
  dir?: DirectionMode;
}

function xmlToTextDirection(node: Element) {
  let ret: TextDirection = <any>{};
  let foundDir = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
  }
  if (!foundDir) {
    ret.dir = DirectionMode.Ltr;
  }
  return ret;
}

/**
 * The text-rotation entity is used to rotate text
 * around the alignment point specified by the
 * halign and valign entities. The value is a number
 * ranging from -180 to 180. Positive values are
 * clockwise rotations, while negative values are
 * counter-clockwise rotations.
 */
export interface TextRotation {
  _snapshot?: TextRotation;
  rotation?: number;
}

function xmlToTextRotation(node: Element) {
  let ret: TextRotation = <any>{};
  let foundRotation = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
  }
  if (!foundRotation) {
    ret.rotation = 0;
  }
  return ret;
}

/**
 * The enclosure entity is used to specify the
 * formatting of an enclosure around text or symbols.
 */
export interface Enclosure {
  _snapshot?: Enclosure;
  enclosure?: EnclosureShape;
}

function xmlToEnclosure(node: Element) {
  let ret: Enclosure = <any>{};
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  if (!foundEnclosure) {
    ret.enclosure = EnclosureShape.None;
  }
  return ret;
}

/**
 * The print-style entity groups together the most popular
 * combination of printing attributes: position, font, and
 * color.
 */
export interface PrintStyle extends Position, Font, Color {
  _snapshot?: PrintStyle;
}

function xmlToPrintStyle(node: Element) {
  let ret: PrintStyle = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
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

/**
 * The print-style-align entity adds the halign and valign
 * attributes to the position, font, and color attributes.
 */
export interface PrintStyleAlign extends PrintStyle, Halign, Valign {
  _snapshot?: PrintStyleAlign;
}

function xmlToPrintStyleAlign(node: Element) {
  let ret: PrintStyleAlign = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The line-shape entity is used to distinguish between
 * straight and curved lines. The line-type entity
 * distinguishes between solid, dashed, dotted, and
 * wavy lines.
 */
export interface LineShape {
  _snapshot?: LineShape;
  lineShape?: StraightCurved;
}

function xmlToLineShape(node: Element) {
  let ret: LineShape = <any>{};
  let foundLineShape = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
  }
  if (!foundLineShape) {
    ret.lineShape = StraightCurved.Straight;
  }
  return ret;
}

/**
 * The line-shape entity is used to distinguish between
 * straight and curved lines. The line-type entity
 * distinguishes between solid, dashed, dotted, and
 * wavy lines.
 */
export interface LineType {
  _snapshot?: LineType;
  lineType?: SolidDashedDottedWavy;
}

/**
 * The dashed-formatting entity represents the length of
 * dashes and spaces in a dashed line. Both the dash-length
 * and space-length attributes are represented in tenths.
 * These attributes are ignored if the corresponding
 * line-type attribute is not dashed.
 */
export interface DashedFormatting {
  _snapshot?: DashedFormatting;
  dashLength?: number;
  spaceLength?: number;
}

function xmlToDashedFormatting(node: Element) {
  let ret: DashedFormatting = <any>{};
  let foundDashLength = false;
  let foundSpaceLength = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
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

/**
 * The printout entity is based on MuseData print
 * suggestions. They allow a way to specify not to print
 * print an object (e.g. note or rest), its augmentation
 * dots, or its lyrics. This is especially useful for notes
 * that overlap in different voices, or for chord sheets
 * that contain lyrics and chords but no melody. For wholly
 * invisible notes, such as those providing sound-only data,
 * the attribute for print-spacing may be set to no so that
 * no space is left for this note. The print-spacing value
 * is only used if no note, dot, or lyric is being printed.
 * By default, all these attributes are set to yes. If
 * print-object is set to no, print-dot and print-lyric are
 * interpreted to also be set to no if they are not present.
 */
export interface PrintObject {
  _snapshot?: PrintObject;
  printObject?: boolean;
}

function xmlToPrintObject(node: Element) {
  let ret: PrintObject = <any>{};
  let foundPrintObject = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
  }
  if (!foundPrintObject) {
    ret.printObject = true;
  }
  return ret;
}

/**
 * The printout entity is based on MuseData print
 * suggestions. They allow a way to specify not to print
 * print an object (e.g. note or rest), its augmentation
 * dots, or its lyrics. This is especially useful for notes
 * that overlap in different voices, or for chord sheets
 * that contain lyrics and chords but no melody. For wholly
 * invisible notes, such as those providing sound-only data,
 * the attribute for print-spacing may be set to no so that
 * no space is left for this note. The print-spacing value
 * is only used if no note, dot, or lyric is being printed.
 * By default, all these attributes are set to yes. If
 * print-object is set to no, print-dot and print-lyric are
 * interpreted to also be set to no if they are not present.
 */
export interface PrintSpacing {
  _snapshot?: PrintSpacing;
  printSpacing?: boolean;
}

function xmlToPrintSpacing(node: Element) {
  let ret: PrintSpacing = <any>{};
  let foundPrintSpacing = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-spacing") {
      let dataPrintSpacing = xmlToYesNo(ch2);
      ret.printSpacing = dataPrintSpacing;
      foundPrintSpacing = true;
    }
  }
  if (!foundPrintSpacing) {
    ret.printSpacing = true;
  }
  return ret;
}

/**
 * The printout entity is based on MuseData print
 * suggestions. They allow a way to specify not to print
 * print an object (e.g. note or rest), its augmentation
 * dots, or its lyrics. This is especially useful for notes
 * that overlap in different voices, or for chord sheets
 * that contain lyrics and chords but no melody. For wholly
 * invisible notes, such as those providing sound-only data,
 * the attribute for print-spacing may be set to no so that
 * no space is left for this note. The print-spacing value
 * is only used if no note, dot, or lyric is being printed.
 * By default, all these attributes are set to yes. If
 * print-object is set to no, print-dot and print-lyric are
 * interpreted to also be set to no if they are not present.
 */
export interface Printout extends PrintObject, PrintSpacing {
  _snapshot?: Printout;
  printDot?: boolean;
  printLyric?: boolean;
}

/**
 * The text-formatting entity contains the common formatting
 * attributes for text elements. Default values may differ
 * across the elements that use this entity.
 */
export interface TextFormatting
  extends Justify,
    PrintStyleAlign,
    TextDecoration,
    TextRotation,
    LetterSpacing,
    LineHeight,
    TextDirection,
    Enclosure {
  _snapshot?: TextFormatting;
}

function xmlToTextFormatting(node: Element) {
  let ret: TextFormatting = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

/**
 * The level-display entity allows specification of three
 * common ways to indicate editorial indications: putting
 * parentheses or square brackets around a symbol, or making
 * the symbol a different size. If not specified, they are
 * left to application defaults. It is used by the level and
 * accidental elements.
 */
export interface LevelDisplay {
  _snapshot?: LevelDisplay;
  bracket?: boolean;
  size?: SymbolSize;
  parentheses?: boolean;
}

function xmlToLevelDisplay(node: Element) {
  let ret: LevelDisplay = <any>{};
  let foundBracket = false;
  let foundSize = false;
  let foundParentheses = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "bracket") {
      let dataBracket = xmlToYesNo(ch2);
      ret.bracket = dataBracket;
      foundBracket = true;
    }
    if (ch2.name === "size") {
      let dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
      ret.size = dataSize;
      foundSize = true;
    }
    if (ch2.name === "parentheses") {
      let dataParentheses = xmlToYesNo(ch2);
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

/**
 * The trill-sound entity includes attributes used to guide
 * the sound of trills, mordents, turns, shakes, and wavy
 * lines, based on MuseData sound suggestions. The default
 * choices are:
 *
 * start-note = "upper"
 *
 * trill-step = "whole"        two-note-turn = "none"
 *
 * accelerate = "no"        beats = "4" (minimum of "2").
 *
 * Second-beat and last-beat are percentages for landing on
 * the indicated beat, with defaults of 25 and 75 respectively.
 *
 * For mordent and inverted-mordent elements, the defaults
 * are different:
 *
 * The default start-note is "main", not "upper".
 * The default for beats is "3", not "4".
 * The default for second-beat is "12", not "25".
 * The default for last-beat is "24", not "75".
 */
export interface TrillSound {
  _snapshot?: TrillSound;
  startNote?: UpperMainBelow;
  accelerate?: boolean;
  beats?: number;
  lastBeat?: number;
  trillStep?: WholeHalfUnison;
  twoNoteTurn?: WholeHalfNone;
  secondBeat?: number;
}

function xmlToTrillSound(node: Element) {
  let ret: TrillSound = <any>{};
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The bend-sound entity is used for bend and slide elements,
 * and is similar to the trill-sound. Here the beats element
 * refers to the number of discrete elements (like MIDI pitch
 * bends) used to represent a continuous bend or slide. The
 * first-beat indicates the percentage of the direction for
 * starting a bend; the last-beat the percentage for ending it.
 * The default choices are:
 *
 * accelerate = "no"
 *
 * beats = "4" (minimum of "2")
 * first-beat = "25"
 *
 * last-beat = "75"
 */
export interface BendSound {
  _snapshot?: BendSound;
  accelerate?: boolean;
  beats?: number;
  firstBeat?: number;
  lastBeat?: number;
}

function xmlToBendSound(node: Element) {
  let ret: BendSound = <any>{};
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "first-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The time-only entity is used to indicate that a particular
 * playback-related element only applies particular times through
 * a repeated section.
 */
export interface TimeOnly {
  _snapshot?: TimeOnly;
  timeOnly?: string;
}

function xmlToTimeOnly(node: Element) {
  let ret: TimeOnly = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "time-only") {
      let dataTimeOnly = getString(ch2, true);
      ret.timeOnly = dataTimeOnly;
    }
  }
  return ret;
}

/**
 * The document-attributes entity is used to specify the
 * attributes for an entire MusicXML document. Currently
 * this is used for the version attribute.
 */
export interface DocumentAttributes {
  _snapshot?: DocumentAttributes;
  version: string;
}

function xmlToDocumentAttributes(node: Element) {
  let ret: DocumentAttributes = <any>{};
  let foundVersion_ = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "version") {
      let dataVersion = getString(ch2, true);
      ret.version = dataVersion;
      foundVersion_ = true;
    }
  }
  if (!foundVersion_) {
    ret.version = "1.0";
  }
  return ret;
}

/**
 * Two entities for editorial information in notes. These
 * entities, and their elements defined below, are used
 * across all the different component DTD modules.
 */
export interface Editorial {
  _snapshot?: Editorial;
  footnote?: Footnote;
  level?: Level;
  _class?: string;
}

function xmlToEditorial(node: Element) {
  let ret: Editorial = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Two entities for editorial information in notes. These
 * entities, and their elements defined below, are used
 * across all the different component DTD modules.
 */
export interface EditorialVoice {
  _snapshot?: EditorialVoice;
  voice?: number;
  footnote?: Footnote;
  level?: Level;
  _class?: string;
}

function xmlToEditorialVoice(node: Element) {
  let ret: EditorialVoice = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "voice") {
      let dataVoice = getNumber(ch, true);
      ret.voice = dataVoice;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Footnote and level are used to specify editorial
 * information, while voice is used to distinguish between
 * multiple voices (what MuseData calls tracks) in individual
 * parts. These elements are used throughout the different
 * MusicXML DTD modules. If the reference attribute for the
 * level element is yes, this indicates editorial information
 * that is for display only and should not affect playback.
 * For instance, a modern edition of older music may set
 * reference="yes" on the attributes containing the music's
 * original clef, key, and time signature. It is no by default.
 */
export interface Footnote extends TextFormatting {
  _snapshot?: Footnote;
  text: string;
}

function xmlToFootnote(node: Element) {
  let ret: Footnote = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

/**
 * Footnote and level are used to specify editorial
 * information, while voice is used to distinguish between
 * multiple voices (what MuseData calls tracks) in individual
 * parts. These elements are used throughout the different
 * MusicXML DTD modules. If the reference attribute for the
 * level element is yes, this indicates editorial information
 * that is for display only and should not affect playback.
 * For instance, a modern edition of older music may set
 * reference="yes" on the attributes containing the music's
 * original clef, key, and time signature. It is no by default.
 */
export interface Level extends LevelDisplay {
  _snapshot?: Level;
  text: string;
  reference?: boolean;
}

function xmlToLevel(node: Element) {
  let ret: Level = <any>{};
  let foundBracket = false;
  let foundSize = false;
  let foundParentheses = false;
  let foundReference = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "bracket") {
      let dataBracket = xmlToYesNo(ch2);
      ret.bracket = dataBracket;
      foundBracket = true;
    }
    if (ch2.name === "size") {
      let dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
      ret.size = dataSize;
      foundSize = true;
    }
    if (ch2.name === "parentheses") {
      let dataParentheses = xmlToYesNo(ch2);
      ret.parentheses = dataParentheses;
      foundParentheses = true;
    }
    if (ch2.name === "reference") {
      let dataReference = xmlToYesNo(ch2);
      ret.reference = dataReference;
      foundReference = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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

/**
 * Fermata and wavy-line elements can be applied both to
 * notes and to measures, so they are defined here. Wavy
 * lines are one way to indicate trills; when used with a
 * measure element, they should always have type="continue"
 *
 * set. The fermata text content represents the shape of the
 * fermata sign and may be normal, angled, or square.
 * An empty fermata element represents a normal fermata.
 * The fermata type is upright if not specified.
 */
export interface Fermata extends PrintStyle {
  _snapshot?: Fermata;
  shape: NormalAngledSquare;
  type?: UprightInverted;
}

function xmlToFermata(node: Element) {
  let ret: Fermata = <any>{};
  let foundShape = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundType = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getUprightInverted(ch2, UprightInverted.Upright);
      ret.type = dataType;
      foundType = true;
    }
  }
  let ch3 = node;
  let dataShape = getNormalAngledSquare(ch3, NormalAngledSquare.Normal);
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

/**
 * Fermata and wavy-line elements can be applied both to
 * notes and to measures, so they are defined here. Wavy
 * lines are one way to indicate trills; when used with a
 * measure element, they should always have type="continue"
 *
 * set. The fermata text content represents the shape of the
 * fermata sign and may be normal, angled, or square.
 * An empty fermata element represents a normal fermata.
 * The fermata type is upright if not specified.
 */
export interface WavyLine extends Position, Placement, Color, TrillSound {
  _snapshot?: WavyLine;
  number?: number;
  type: StartStopContinue;
}

function xmlToWavyLine(node: Element) {
  let ret: WavyLine = <any>{};
  let foundNumber_ = false;
  let foundPlacement = false;
  let foundColor = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
      ret.secondBeat = dataSecondBeat;
      foundSecondBeat = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopContinue(ch2, null);
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

/**
 * Segno and coda signs can be associated with a measure
 * or a general musical direction. These are visual
 * indicators only; a sound element is needed to guide
 * playback applications reliably.
 */
export interface Segno extends PrintStyleAlign {
  _snapshot?: Segno;
}

function xmlToSegno(node: Element) {
  let ret: Segno = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * Segno and coda signs can be associated with a measure
 * or a general musical direction. These are visual
 * indicators only; a sound element is needed to guide
 * playback applications reliably.
 */
export interface Coda extends PrintStyleAlign {
  _snapshot?: Coda;
}

function xmlToCoda(node: Element) {
  let ret: Coda = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * These elements are used both in the time-modification and
 * metronome-tuplet elements. The actual-notes element
 * describes how many notes are played in the time usually
 * occupied by the number of normal-notes. If the normal-notes
 * type is different than the current note type (e.g., a
 * quarter note within an eighth note triplet), then the
 * normal-notes type (e.g. eighth) is specified in the
 * normal-type and normal-dot elements. The content of the
 * actual-notes and normal-notes elements ia a non-negative
 * integer.
 */
export interface NormalDot {
  _snapshot?: NormalDot;
}

function xmlToNormalDot(node: Element) {
  let ret: NormalDot = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Dynamics can be associated either with a note or a general
 * musical direction. To avoid inconsistencies between and
 * amongst the letter abbreviations for dynamics (what is sf
 * vs. sfz, standing alone or with a trailing dynamic that is
 * not always piano), we use the actual letters as the names
 * of these dynamic elements. The other-dynamics element
 * allows other dynamic marks that are not covered here, but
 * many of those should perhaps be included in a more general
 * musical direction element. Dynamics may also be combined as
 * in <sf/><mp/>.
 *
 * These letter dynamic symbols are separated from crescendo,
 * decrescendo, and wedge indications. Dynamic representation
 * is inconsistent in scores. Many things are assumed by the
 * composer and left out, such as returns to original dynamics.
 * Systematic representations are quite complex: for example,
 * Humdrum has at least 3 representation formats related to
 * dynamics. The MusicXML format captures what is in the score,
 * but does not try to be optimal for analysis or synthesis of
 * dynamics.
 */
export interface Dynamics
  extends PrintStyleAlign,
    Placement,
    TextDecoration,
    Enclosure {
  _snapshot?: Dynamics;
  f?: boolean;
  ff?: boolean;
  fff?: boolean;
  ffff?: boolean;
  fffff?: boolean;
  ffffff?: boolean;
  fp?: boolean;
  fz?: boolean;
  mf?: boolean;
  mp?: boolean;
  otherDynamics?: string;
  p?: boolean;
  pp?: boolean;
  ppp?: boolean;
  pppp?: boolean;
  ppppp?: boolean;
  pppppp?: boolean;
  rf?: boolean;
  rfz?: boolean;
  sf?: boolean;
  sffz?: boolean;
  sfp?: boolean;
  sfpp?: boolean;
  sfz?: boolean;
}

function xmlToDynamics(node: Element) {
  let ret: Dynamics = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundPlacement = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "fp") {
      let dataFp = true;
      ret.fp = dataFp;
    }
    if (ch.nodeName === "pp") {
      let dataPp = true;
      ret.pp = dataPp;
    }
    if (ch.nodeName === "ppp") {
      let dataPpp = true;
      ret.ppp = dataPpp;
    }
    if (ch.nodeName === "fff") {
      let dataFff = true;
      ret.fff = dataFff;
    }
    if (ch.nodeName === "sf") {
      let dataSf = true;
      ret.sf = dataSf;
    }
    if (ch.nodeName === "rf") {
      let dataRf = true;
      ret.rf = dataRf;
    }
    if (ch.nodeName === "mp") {
      let dataMp = true;
      ret.mp = dataMp;
    }
    if (ch.nodeName === "sfpp") {
      let dataSfpp = true;
      ret.sfpp = dataSfpp;
    }
    if (ch.nodeName === "f") {
      let dataF = true;
      ret.f = dataF;
    }
    if (ch.nodeName === "ffffff") {
      let dataFfffff = true;
      ret.ffffff = dataFfffff;
    }
    if (ch.nodeName === "sfz") {
      let dataSfz = true;
      ret.sfz = dataSfz;
    }
    if (ch.nodeName === "ff") {
      let dataFf = true;
      ret.ff = dataFf;
    }
    if (ch.nodeName === "pppppp") {
      let dataPppppp = true;
      ret.pppppp = dataPppppp;
    }
    if (ch.nodeName === "rfz") {
      let dataRfz = true;
      ret.rfz = dataRfz;
    }
    if (ch.nodeName === "other-dynamics") {
      let dataOtherDynamics = getString(ch, true);
      ret.otherDynamics = dataOtherDynamics;
    }
    if (ch.nodeName === "fz") {
      let dataFz = true;
      ret.fz = dataFz;
    }
    if (ch.nodeName === "ppppp") {
      let dataPpppp = true;
      ret.ppppp = dataPpppp;
    }
    if (ch.nodeName === "mf") {
      let dataMf = true;
      ret.mf = dataMf;
    }
    if (ch.nodeName === "pppp") {
      let dataPppp = true;
      ret.pppp = dataPppp;
    }
    if (ch.nodeName === "fffff") {
      let dataFffff = true;
      ret.fffff = dataFffff;
    }
    if (ch.nodeName === "sffz") {
      let dataSffz = true;
      ret.sffz = dataSffz;
    }
    if (ch.nodeName === "sfp") {
      let dataSfp = true;
      ret.sfp = dataSfp;
    }
    if (ch.nodeName === "p") {
      let dataP = true;
      ret.p = dataP;
    }
    if (ch.nodeName === "ffff") {
      let dataFfff = true;
      ret.ffff = dataFfff;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

/**
 * Fingering is typically indicated 1,2,3,4,5. Multiple
 * fingerings may be given, typically to substitute
 * fingerings in the middle of a note. The substitution
 * and alternate values are "no" if the attribute is
 * not present. For guitar and other fretted instruments,
 * the fingering element represents the fretting finger;
 * the pluck element represents the plucking finger.
 */
export interface Fingering extends PrintStyle, Placement {
  _snapshot?: Fingering;
  substitution?: boolean;
  finger?: number;
  alternate?: boolean;
}

function xmlToFingering(node: Element) {
  let ret: Fingering = <any>{};
  let foundSubstitution = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundAlternate = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "substitution") {
      let dataSubstitution = xmlToYesNo(ch2);
      ret.substitution = dataSubstitution;
      foundSubstitution = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "alternate") {
      let dataAlternate = xmlToYesNo(ch2);
      ret.alternate = dataAlternate;
      foundAlternate = true;
    }
  }
  let ch3 = node;
  let dataFinger = getNumber(ch3, false);
  ret.finger = dataFinger;
  if (isNaN(ret.finger)) {
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

/**
 * Fret and string are used with tablature notation and chord
 * symbols. Fret numbers start with 0 for an open string and
 * 1 for the first fret. String numbers start with 1 for the
 * highest string. The string element can also be used in
 * regular notation.
 */
export interface Fret extends Font, Color {
  _snapshot?: Fret;
  fret: number;
}

function xmlToFret(node: Element) {
  let ret: Fret = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataFret = getNumber(ch3, true);
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

/**
 * Fret and string are used with tablature notation and chord
 * symbols. Fret numbers start with 0 for an open string and
 * 1 for the first fret. String numbers start with 1 for the
 * highest string. The string element can also be used in
 * regular notation.
 */
export interface String extends PrintStyle, Placement {
  _snapshot?: String;
  stringNum: number;
}

function xmlToString(node: Element) {
  let ret: String = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataStringNum = getNumber(ch3, true);
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

/**
 * The display-text element is used for exact formatting of
 * multi-font text in element in display elements such as
 * part-name-display. Language is Italian ("it") by default.
 * Enclosure is none by default.
 */
export interface DisplayText extends TextFormatting {
  _snapshot?: DisplayText;
  text: string;
}

function xmlToDisplayText(node: Element) {
  let ret: DisplayText = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

/**
 * The accidental-text element is used for exact formatting of
 * accidentals in display elements such as part-name-display.
 * Values are the same as for the accidental element.
 * Enclosure is none by default.
 */
export interface AccidentalText extends TextFormatting {
  _snapshot?: AccidentalText;
  text: string;
}

function xmlToAccidentalText(node: Element) {
  let ret: AccidentalText = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

/**
 * The part-name-display and part-abbreviation-display
 * elements are used in both the score.mod and direction.mod
 * files. They allow more precise control of how part names
 * and abbreviations appear throughout a score. The
 * print-object attributes can be used to determine what,
 * if anything, is printed at the start of each system.
 * Formatting specified in the part-name-display and
 * part-abbreviation-display elements override the formatting
 * specified in the part-name and part-abbreviation elements,
 * respectively.
 */
export interface PartNameDisplay extends PrintObject {
  _snapshot?: PartNameDisplay;
  name: TextSegment[];
}

/**
 * The part-name-display and part-abbreviation-display
 * elements are used in both the score.mod and direction.mod
 * files. They allow more precise control of how part names
 * and abbreviations appear throughout a score. The
 * print-object attributes can be used to determine what,
 * if anything, is printed at the start of each system.
 * Formatting specified in the part-name-display and
 * part-abbreviation-display elements override the formatting
 * specified in the part-name and part-abbreviation elements,
 * respectively.
 */
export interface PartAbbreviationDisplay extends PrintObject {
  _snapshot?: PartAbbreviationDisplay;
  name: TextSegment[];
}

/**
 * The midi-device content corresponds to the DeviceName
 * meta event in Standard MIDI Files. The optional port
 * attribute is a number from 1 to 16 that can be used
 * with the unofficial MIDI port (or cable) meta event.
 * Unlike the DeviceName meta event, there can be
 * multiple midi-device elements per MusicXML part
 * starting in MusicXML 3.0. The optional id attribute
 * refers to the score-instrument assigned to this
 * device. If missing, the device assignment affects
 * all score-instrument elements in the score-part.
 */
export interface MidiDevice {
  _snapshot?: MidiDevice;
  port?: number;
  deviceName: string;
  id?: number;
}

function xmlToMidiDevice(node: Element) {
  let ret: MidiDevice = <any>{};
  let foundDeviceName = false;
  let foundPort = false;
  let foundId = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "port") {
      let dataPort = getNumber(ch2, true);
      ret.port = dataPort;
      foundPort = true;
    }
    if (ch2.name === "id") {
      let dataId = getNumber(ch2, true);
      ret.id = dataId;
      foundId = true;
    }
  }
  let ch3 = node;
  let dataDeviceName = getString(ch3, true);
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
function verifyMidiChannel(m: number) {
  // assert(m >= 1 && m <= 16);
}

function xmlToMidiChannel(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

/**
 *  midi 1.0 bank numbers range from 1 to 16,384.
 */
function verifyMidiBank(m: number) {
  // assert(m >= 1 && m <= 16384);
}

function xmlToMidiBank(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

/**
 *  MIDI 1.0 program numbers range from 1 to 128.
 */
function verifyMidiProgram(m: number) {
  // assert(m >= 1 && m <= 128);
}

function xmlToMidiProgram(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

/**
 * For unpitched instruments, specify a MIDI 1.0 note number
 * ranging from 1 to 128. It is usually used with MIDI banks for
 * percussion. Note that MIDI 1.0 note numbers are generally
 * specified from 0 to 127 rather than the 1 to 128 numbering
 * used in this element.
 */
function verifyMidiUnpitched(m: number) {
  // assert(m >= 1 && m <= 128);
}

function xmlToMidiUnpitched(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

/**
 * The volume value is a percentage of the maximum
 * ranging from 0 to 100, with decimal values allowed.
 * This corresponds to a scaling value for the MIDI 1.0
 * channel volume controller.
 */
function verifyVolume(m: number) {
  // assert(m >= 1 && m <= 100);
}

function xmlToVolume(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
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
function verifyPan(m: number) {
  // assert(m >= -180 && m <= 180);
}

function xmlToPan(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
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
function verifyElevation(m: number) {
  // assert(m >= -180 && m <= 180);
}

function xmlToElevation(node: Node) {
  let str = node.textContent;
  let num =
    str.toLowerCase().indexOf("0x") === 0 ? parseInt(str, 16) : parseFloat(str);
  return num;
}

/**
 * The midi-instrument element can be a part of either
 * the score-instrument element at the start of a part,
 * or the sound element within a part. The id attribute
 * refers to the score-instrument affected by the change.
 */
export interface MidiInstrument {
  _snapshot?: MidiInstrument;
  midiUnpitched?: number;
  volume?: number;
  pan?: number;
  elevation?: number;
  midiBank?: number;
  midiProgram?: number;
  id: string;
  midiChannel?: number;
  midiName?: string;
}

function xmlToMidiInstrument(node: Element) {
  let ret: MidiInstrument = {
    midiUnpitched: null,
    volume: null,
    pan: null,
    elevation: null,
    midiBank: null,
    midiProgram: null,
    id: "",
    midiChannel: null,
    midiName: "",
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "midi-unpitched") {
      let dataMidiUnpitched = getNumber(ch, true);
      ret.midiUnpitched = dataMidiUnpitched;
    }
    if (ch.nodeName === "volume") {
      let dataVolume = getNumber(ch, true);
      ret.volume = dataVolume;
    }
    if (ch.nodeName === "pan") {
      let dataPan = getNumber(ch, true);
      ret.pan = dataPan;
    }
    if (ch.nodeName === "elevation") {
      let dataElevation = getNumber(ch, true);
      ret.elevation = dataElevation;
    }
    if (ch.nodeName === "midi-bank") {
      let dataMidiBank = getNumber(ch, true);
      ret.midiBank = dataMidiBank;
    }
    if (ch.nodeName === "midi-program") {
      let dataMidiProgram = getNumber(ch, true);
      ret.midiProgram = dataMidiProgram;
    }
    if (ch.nodeName === "midi-channel") {
      let dataMidiChannel = getNumber(ch, true);
      ret.midiChannel = dataMidiChannel;
    }
    if (ch.nodeName === "midi-name") {
      let dataMidiName = getString(ch, true);
      ret.midiName = dataMidiName;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "id") {
      let dataId = getString(ch2, true);
      ret.id = dataId;
    }
  }
  return ret;
}

/**
 * The play element, new in Version 3.0, specifies playback
 * techniques to be used in conjunction with the instrument-sound
 * element. When used as part of a sound element, it applies to
 * all notes going forward in score order. In multi-instrument
 * parts, the affected instrument should be specified using the
 * id attribute. When used as part of a note element, it applies
 * to the current note only.
 */
export interface Play {
  _snapshot?: Play;
  ipa?: string;
  mute?: string;
  otherPlay?: OtherPlay;
  semiPitched?: string;
  id: string;
}

function xmlToPlay(node: Element) {
  let ret: Play = {
    ipa: "",
    mute: "",
    otherPlay: null,
    semiPitched: "",
    id: "",
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "ipa") {
      let dataIpa = getString(ch, true);
      ret.ipa = dataIpa;
    }
    if (ch.nodeName === "mute") {
      let dataMute = getString(ch, true);
      ret.mute = dataMute;
    }
    if (ch.nodeName === "other-play") {
      let dataOtherPlay = xmlToOtherPlay(ch);
      ret.otherPlay = dataOtherPlay;
    }
    if (ch.nodeName === "semi-pitched") {
      let dataSemiPitched = getString(ch, true);
      ret.semiPitched = dataSemiPitched;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "id") {
      let dataId = getString(ch2, true);
      ret.id = dataId;
    }
  }
  return ret;
}

export interface OtherPlay {
  _snapshot?: OtherPlay;
  data: string;
  type: string;
}

function xmlToOtherPlay(node: Element) {
  let ret: OtherPlay = {
    data: "",
    type: "",
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  return ret;
}

/**
 * Margins, page sizes, and distances are all measured in
 * tenths to keep MusicXML data in a consistent coordinate
 * system as much as possible. The translation to absolute
 * units is done in the scaling element, which specifies
 * how many millimeters are equal to how many tenths. For
 * a staff height of 7 mm, millimeters would be set to 7
 * while tenths is set to 40. The ability to set a formula
 * rather than a single scaling factor helps avoid roundoff
 * errors.
 */
export interface Scaling {
  _snapshot?: Scaling;
  tenths?: number;
  millimeters?: number;
}

function xmlToScaling(node: Element) {
  let ret: Scaling = {
    tenths: null,
    millimeters: null,
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "tenths") {
      let dataTenths = getNumber(ch, true);
      ret.tenths = dataTenths;
    }
    if (ch.nodeName === "millimeters") {
      let dataMillimeters = getNumber(ch, true);
      ret.millimeters = dataMillimeters;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export enum OddEvenBoth {
  Both = 2,
  Even = 1,
  Odd = 0,
}

function getOddEvenBoth(node: Node, fallbackVal?: OddEvenBoth) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Page layout can be defined both in score-wide defaults
 * and in the print element. Page margins are specified either
 * for both even and odd pages, or via separate odd and even
 * page number values.
 */
export interface PageMargins {
  _snapshot?: PageMargins;
  topMargin: number;
  leftMargin: number;
  bottomMargin: number;
  type?: OddEvenBoth;
  rightMargin: number;
}

function xmlToPageMargins(node: Element) {
  let ret: PageMargins = <any>{};
  let foundType = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "top-margin") {
      let dataTopMargin = getNumber(ch, true);
      ret.topMargin = dataTopMargin;
    }
    if (ch.nodeName === "left-margin") {
      let dataLeftMargin = getNumber(ch, true);
      ret.leftMargin = dataLeftMargin;
    }
    if (ch.nodeName === "bottom-margin") {
      let dataBottomMargin = getNumber(ch, true);
      ret.bottomMargin = dataBottomMargin;
    }
    if (ch.nodeName === "right-margin") {
      let dataRightMargin = getNumber(ch, true);
      ret.rightMargin = dataRightMargin;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getOddEvenBoth(ch2, OddEvenBoth.Both);
      ret.type = dataType;
      foundType = true;
    }
  }
  if (!foundType) {
    ret.type = OddEvenBoth.Both;
  }
  return ret;
}

/**
 * Page layout can be defined both in score-wide defaults
 * and in the print element. Page margins are specified either
 * for both even and odd pages, or via separate odd and even
 * page number values. The type is not needed when used as
 * part of a print element. If omitted when used in the
 * defaults element, "both" is the default.
 */
export interface PageLayout {
  _snapshot?: PageLayout;
  pageHeight?: number;
  pageWidth?: number;
  pageMargins?: PageMargins[];
}

function xmlToPageLayout(node: Element) {
  let ret: PageLayout = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "page-height") {
      let dataPageHeight = getNumber(ch, true);
      ret.pageHeight = dataPageHeight;
    }
    if (ch.nodeName === "page-width") {
      let dataPageWidth = getNumber(ch, true);
      ret.pageWidth = dataPageWidth;
    }
    if (ch.nodeName === "page-margins") {
      let dataPageMargins = xmlToPageMargins(ch);
      ret.pageMargins = (ret.pageMargins || []).concat(dataPageMargins);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * A system is a group of staves that are read and played
 * simultaneously. System layout includes left and right
 * margins, the vertical distance from the previous system,
 * and the presence or absence of system dividers.
 *
 * Margins are relative to the page margins. Positive values
 * indent and negative values reduce the margin size. The
 * system distance is measured from the bottom line of the
 * previous system to the top line of the current system.
 * It is ignored for the first system on a page. The top
 * system distance is measured from the page's top margin to
 * the top line of the first system. It is ignored for all
 * but the first system on a page.
 *
 * Sometimes the sum of measure widths in a system may not
 * equal the system width specified by the layout elements due
 * to roundoff or other errors. The behavior when reading
 * MusicXML files in these cases is application-dependent.
 * For instance, applications may find that the system layout
 * data is more reliable than the sum of the measure widths,
 * and adjust the measure widths accordingly.
 *
 * When used in the layout element, the system-layout element
 * defines a default appearance for all systems in the score.
 * When used in the print element, the system layout element
 * affects the appearance of the current system only. All
 * other systems use the default values provided in the
 * defaults element. If any child elements are missing from
 * the system-layout element in a print element, the values
 * from the defaults element are used there as well.
 */
export interface SystemLayout {
  _snapshot?: SystemLayout;
  systemDividers?: SystemDividers;
  systemMargins?: SystemMargins;
  systemDistance?: number;
  topSystemDistance?: number;
}

function xmlToSystemLayout(node: Element) {
  let ret: SystemLayout = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "system-dividers") {
      let dataSystemDividers = xmlToSystemDividers(ch);
      ret.systemDividers = dataSystemDividers;
    }
    if (ch.nodeName === "system-margins") {
      let dataSystemMargins = xmlToSystemMargins(ch);
      ret.systemMargins = dataSystemMargins;
    }
    if (ch.nodeName === "system-distance") {
      let dataSystemDistance = getNumber(ch, true);
      ret.systemDistance = dataSystemDistance;
    }
    if (ch.nodeName === "top-system-distance") {
      let dataTopSystemDistance = getNumber(ch, true);
      ret.topSystemDistance = dataTopSystemDistance;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * A system is a group of staves that are read and played
 * simultaneously. System layout includes left and right
 * margins, the vertical distance from the previous system,
 * and the presence or absence of system dividers.
 *
 * Margins are relative to the page margins. Positive values
 * indent and negative values reduce the margin size. The
 * system distance is measured from the bottom line of the
 * previous system to the top line of the current system.
 * It is ignored for the first system on a page. The top
 * system distance is measured from the page's top margin to
 * the top line of the first system. It is ignored for all
 * but the first system on a page.
 *
 * Sometimes the sum of measure widths in a system may not
 * equal the system width specified by the layout elements due
 * to roundoff or other errors. The behavior when reading
 * MusicXML files in these cases is application-dependent.
 * For instance, applications may find that the system layout
 * data is more reliable than the sum of the measure widths,
 * and adjust the measure widths accordingly.
 *
 * When used in the layout element, the system-layout element
 * defines a default appearance for all systems in the score.
 * When used in the print element, the system layout element
 * affects the appearance of the current system only. All
 * other systems use the default values provided in the
 * defaults element. If any child elements are missing from
 * the system-layout element in a print element, the values
 * from the defaults element are used there as well.
 */
export interface SystemMargins {
  _snapshot?: SystemMargins;
  leftMargin: number;
  rightMargin: number;
}

function xmlToSystemMargins(node: Element) {
  let ret: SystemMargins = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "left-margin") {
      let dataLeftMargin = getNumber(ch, true);
      ret.leftMargin = dataLeftMargin;
    }
    if (ch.nodeName === "right-margin") {
      let dataRightMargin = getNumber(ch, true);
      ret.rightMargin = dataRightMargin;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The system-dividers element indicates the presence or
 * absence of system dividers (also known as system separation
 * marks) between systems displayed on the same page. Dividers
 * on the left and right side of the page are controlled by
 * the left-divider and right-divider elements respectively.
 * The default vertical position is half the system-distance
 * value from the top of the system that is below the divider.
 * The default horizontal position is the left and right
 * system margin, respectively.
 *
 * When used in the print element, the system-dividers element
 * affects the dividers that would appear between the current
 * system and the previous system.
 */
export interface SystemDividers {
  _snapshot?: SystemDividers;
  rightDivider: RightDivider;
  leftDivider: LeftDivider;
}

function xmlToSystemDividers(node: Element) {
  let ret: SystemDividers = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "right-divider") {
      let dataRightDivider = xmlToRightDivider(ch);
      ret.rightDivider = dataRightDivider;
    }
    if (ch.nodeName === "left-divider") {
      let dataLeftDivider = xmlToLeftDivider(ch);
      ret.leftDivider = dataLeftDivider;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The system-dividers element indicates the presence or
 * absence of system dividers (also known as system separation
 * marks) between systems displayed on the same page. Dividers
 * on the left and right side of the page are controlled by
 * the left-divider and right-divider elements respectively.
 * The default vertical position is half the system-distance
 * value from the top of the system that is below the divider.
 * The default horizontal position is the left and right
 * system margin, respectively.
 *
 * When used in the print element, the system-dividers element
 * affects the dividers that would appear between the current
 * system and the previous system.
 */
export interface LeftDivider extends PrintObject, PrintStyleAlign {
  _snapshot?: LeftDivider;
}

function xmlToLeftDivider(node: Element) {
  let ret: LeftDivider = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The system-dividers element indicates the presence or
 * absence of system dividers (also known as system separation
 * marks) between systems displayed on the same page. Dividers
 * on the left and right side of the page are controlled by
 * the left-divider and right-divider elements respectively.
 * The default vertical position is half the system-distance
 * value from the top of the system that is below the divider.
 * The default horizontal position is the left and right
 * system margin, respectively.
 *
 * When used in the print element, the system-dividers element
 * affects the dividers that would appear between the current
 * system and the previous system.
 */
export interface RightDivider extends PrintObject, PrintStyleAlign {
  _snapshot?: RightDivider;
}

function xmlToRightDivider(node: Element) {
  let ret: RightDivider = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * Staff layout includes the vertical distance from the bottom
 * line of the previous staff in this system to the top line
 * of the staff specified by the number attribute. The
 * optional number attribute refers to staff numbers within
 * the part, from top to bottom on the system. A value of 1
 * is assumed if not present. When used in the defaults
 * element, the values apply to all parts. This value is
 * ignored for the first staff in a system.
 */
export interface StaffLayout {
  _snapshot?: StaffLayout;
  staffDistance?: number;
  number: number;
}

function xmlToStaffLayout(node: Element) {
  let ret: StaffLayout = <any>{};
  let foundNum = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "staff-distance") {
      let dataStaffDistance = getNumber(ch, true);
      ret.staffDistance = dataStaffDistance;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNum = getNumber(ch2, true);
      ret.number = dataNum;
      foundNum = true;
    }
  }
  if (!foundNum) {
    ret.number = 1;
  }
  return ret;
}

/**
 * Measure layout includes the horizontal distance from the
 * previous measure. This value is only used for systems
 * where there is horizontal whitespace in the middle of a
 * system, as in systems with codas. To specify the measure
 * width, use the width attribute of the measure element.
 */
export interface MeasureLayout {
  _snapshot?: MeasureLayout;
  measureDistance?: number;
}

function xmlToMeasureLayout(node: Element) {
  let ret: MeasureLayout = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "measure-distance") {
      let dataMeasureDistance = getNumber(ch, true);
      ret.measureDistance = dataMeasureDistance;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The appearance element controls general graphical
 * settings for the music's final form appearance on a
 * printed page of display. This includes support
 * for line widths, definitions for note sizes, and standard
 * distances between notation elements, plus an extension
 * element for other aspects of appearance.
 *
 * The line-width element indicates the width of a line type
 * in tenths. The type attribute defines what type of line is
 * being defined. Values include beam, bracket, dashes,
 * enclosure, ending, extend, heavy barline, leger,
 * light barline, octave shift, pedal, slur middle, slur tip,
 * staff, stem, tie middle, tie tip, tuplet bracket, and
 * wedge. The text content is expressed in tenths.
 *
 * The note-size element indicates the percentage of the
 * regular note size to use for notes with a cue and large
 * size as defined in the type element. The grace type is
 * used for notes of cue size that that include a grace
 * element. The cue type is used for all other notes with
 * cue size, whether defined explicitly or implicitly via a
 * cue element. The large type is used for notes of large
 * size. The text content represent the numeric percentage.
 * A value of 100 would be identical to the size of a regular
 * note as defined by the music font.
 *
 * The distance element represents standard distances between
 * notation elements in tenths. The type attribute defines what
 * type of distance is being defined. Values include hyphen
 * (for hyphens in lyrics) and beam.
 *
 * The other-appearance element is used to define any
 * graphical settings not yet in the current version of the
 * MusicXML format. This allows extended representation,
 * though without application interoperability.
 */
export interface LineWidth {
  _snapshot?: LineWidth;
  tenths: number;
  type: string;
}

function xmlToLineWidth(node: Element) {
  let ret: LineWidth = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataTenths = getNumber(ch3, true);
  ret.tenths = dataTenths;
  return ret;
}

export enum CueGraceLarge {
  Grace = 1,
  Cue = 0,
  Large = 2,
}

function getCueGraceLarge(node: Node, fallbackVal?: CueGraceLarge) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The appearance element controls general graphical
 * settings for the music's final form appearance on a
 * printed page of display. This includes support
 * for line widths, definitions for note sizes, and standard
 * distances between notation elements, plus an extension
 * element for other aspects of appearance.
 *
 * The line-width element indicates the width of a line type
 * in tenths. The type attribute defines what type of line is
 * being defined. Values include beam, bracket, dashes,
 * enclosure, ending, extend, heavy barline, leger,
 * light barline, octave shift, pedal, slur middle, slur tip,
 * staff, stem, tie middle, tie tip, tuplet bracket, and
 * wedge. The text content is expressed in tenths.
 *
 * The note-size element indicates the percentage of the
 * regular note size to use for notes with a cue and large
 * size as defined in the type element. The grace type is
 * used for notes of cue size that that include a grace
 * element. The cue type is used for all other notes with
 * cue size, whether defined explicitly or implicitly via a
 * cue element. The large type is used for notes of large
 * size. The text content represent the numeric percentage.
 * A value of 100 would be identical to the size of a regular
 * note as defined by the music font.
 *
 * The distance element represents standard distances between
 * notation elements in tenths. The type attribute defines what
 * type of distance is being defined. Values include hyphen
 * (for hyphens in lyrics) and beam.
 *
 * The other-appearance element is used to define any
 * graphical settings not yet in the current version of the
 * MusicXML format. This allows extended representation,
 * though without application interoperability.
 */
export interface NoteSize {
  _snapshot?: NoteSize;
  size: number;
  type: CueGraceLarge;
}

function xmlToNoteSize(node: Element) {
  let ret: NoteSize = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getCueGraceLarge(ch2, null);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataSize = getNumber(ch3, true);
  ret.size = dataSize;
  return ret;
}

/**
 * The appearance element controls general graphical
 * settings for the music's final form appearance on a
 * printed page of display. This includes support
 * for line widths, definitions for note sizes, and standard
 * distances between notation elements, plus an extension
 * element for other aspects of appearance.
 *
 * The line-width element indicates the width of a line type
 * in tenths. The type attribute defines what type of line is
 * being defined. Values include beam, bracket, dashes,
 * enclosure, ending, extend, heavy barline, leger,
 * light barline, octave shift, pedal, slur middle, slur tip,
 * staff, stem, tie middle, tie tip, tuplet bracket, and
 * wedge. The text content is expressed in tenths.
 *
 * The note-size element indicates the percentage of the
 * regular note size to use for notes with a cue and large
 * size as defined in the type element. The grace type is
 * used for notes of cue size that that include a grace
 * element. The cue type is used for all other notes with
 * cue size, whether defined explicitly or implicitly via a
 * cue element. The large type is used for notes of large
 * size. The text content represent the numeric percentage.
 * A value of 100 would be identical to the size of a regular
 * note as defined by the music font.
 *
 * The distance element represents standard distances between
 * notation elements in tenths. The type attribute defines what
 * type of distance is being defined. Values include hyphen
 * (for hyphens in lyrics) and beam.
 *
 * The other-appearance element is used to define any
 * graphical settings not yet in the current version of the
 * MusicXML format. This allows extended representation,
 * though without application interoperability.
 */
export interface Distance {
  _snapshot?: Distance;
  tenths: number;
  type: string;
}

function xmlToDistance(node: Element) {
  let ret: Distance = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataTenths = getNumber(ch3, true);
  ret.tenths = dataTenths;
  return ret;
}

/**
 * The appearance element controls general graphical
 * settings for the music's final form appearance on a
 * printed page of display. This includes support
 * for line widths, definitions for note sizes, and standard
 * distances between notation elements, plus an extension
 * element for other aspects of appearance.
 *
 * The line-width element indicates the width of a line type
 * in tenths. The type attribute defines what type of line is
 * being defined. Values include beam, bracket, dashes,
 * enclosure, ending, extend, heavy barline, leger,
 * light barline, octave shift, pedal, slur middle, slur tip,
 * staff, stem, tie middle, tie tip, tuplet bracket, and
 * wedge. The text content is expressed in tenths.
 *
 * The note-size element indicates the percentage of the
 * regular note size to use for notes with a cue and large
 * size as defined in the type element. The grace type is
 * used for notes of cue size that that include a grace
 * element. The cue type is used for all other notes with
 * cue size, whether defined explicitly or implicitly via a
 * cue element. The large type is used for notes of large
 * size. The text content represent the numeric percentage.
 * A value of 100 would be identical to the size of a regular
 * note as defined by the music font.
 *
 * The distance element represents standard distances between
 * notation elements in tenths. The type attribute defines what
 * type of distance is being defined. Values include hyphen
 * (for hyphens in lyrics) and beam.
 *
 * The other-appearance element is used to define any
 * graphical settings not yet in the current version of the
 * MusicXML format. This allows extended representation,
 * though without application interoperability.
 */
export interface Appearance {
  _snapshot?: Appearance;
  lineWidths?: { [key: string]: LineWidth };
  distances?: { [key: string]: Distance };
  otherAppearances?: string[];
  noteSizes?: { [key: string]: NoteSize };
}

function xmlToAppearance(node: Element) {
  let ret: Appearance = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "line-width") {
      let dataLineWidths = xmlToLineWidth(ch);
      ret.lineWidths = ret.lineWidths || {};
      ret.lineWidths[
        popFront(
          toCamelCase(
            (dataLineWidths.type.length ? "_" : "") + dataLineWidths.type
          )
        )
      ] = dataLineWidths;
    }
    if (ch.nodeName === "distance") {
      let dataDistances = xmlToDistance(ch);
      ret.distances = ret.distances || {};
      ret.distances[
        popFront(
          toCamelCase(
            (dataDistances.type.length ? "_" : "") + dataDistances.type
          )
        )
      ] = dataDistances;
    }
    if (ch.nodeName === "other-appearance") {
      let dataOtherAppearances = getString(ch, true);
      ret.otherAppearances = (ret.otherAppearances || []).concat(
        dataOtherAppearances
      );
    }
    if (ch.nodeName === "note-size") {
      let dataNoteSizes = xmlToNoteSize(ch);
      ret.noteSizes = ret.noteSizes || {};
      ret.noteSizes[dataNoteSizes.type] = dataNoteSizes;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The creator element is borrowed from Dublin Core. It is
 * used for the creators of the score. The type attribute is
 * used to distinguish different creative contributions. Thus,
 * there can be multiple creators within an identification.
 */
export interface Creator {
  _snapshot?: Creator;
  creator: string;
  type: string;
}

function xmlToCreator(node: Element) {
  let ret: Creator = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataCreator = getString(ch3, true);
  ret.creator = dataCreator;
  return ret;
}

/**
 * Rights is borrowed from Dublin Core. It contains
 * copyright and other intellectual property notices.
 * Words, music, and derivatives can have different types,
 * so multiple rights tags with different type attributes
 * are supported.
 */
export interface Rights {
  _snapshot?: Rights;
  type: string;
  rights: string;
}

function xmlToRights(node: Element) {
  let ret: Rights = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataRights = getString(ch3, true);
  ret.rights = dataRights;
  return ret;
}

/**
 * The software used to encode the music.
 */
export interface Encoder {
  _snapshot?: Encoder;
  encoder: string;
  type: string;
}

function xmlToEncoder(node: Element) {
  let ret: Encoder = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataEncoder = getString(ch3, true);
  ret.encoder = dataEncoder;
  return ret;
}

/**
 * A related resource for the music that is encoded. This is
 * similar to the Dublin Core relation element.
 */
export interface Relation {
  _snapshot?: Relation;
  type: string;
  data: string;
}

function xmlToRelation(node: Element) {
  let ret: Relation = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  return ret;
}

/**
 * If a program has other metadata not yet supported in the
 * MusicXML format, it can go in the miscellaneous area.
 */
export interface MiscellaneousField {
  _snapshot?: MiscellaneousField;
  data: string;
  name: string;
}

function xmlToMiscellaneousField(node: Element) {
  let ret: MiscellaneousField = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "name") {
      let dataName = getString(ch2, true);
      ret.name = dataName;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  return ret;
}

/**
 *
 * If a program has other metadata not yet supported in the
 * MusicXML format, it can go in the miscellaneous area.
 */
export interface Miscellaneous {
  _snapshot?: Miscellaneous;
  miscellaneousFields?: MiscellaneousField[];
}

function xmlToMiscellaneous(node: Element) {
  let ret: Miscellaneous = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "miscellaneous-field") {
      let dataMiscellaneousFields = xmlToMiscellaneousField(ch);
      ret.miscellaneousFields = (ret.miscellaneousFields || []).concat(
        dataMiscellaneousFields
      );
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 *
 * Identification contains basic metadata about the score.
 * It includes the information in MuseData headers that
 * may apply at a score-wide, movement-wide, or part-wide
 * level. The creator, rights, source, and relation elements
 * are based on Dublin Core.
 */
export interface Identification {
  _snapshot?: Identification;
  miscellaneous?: Miscellaneous;
  creators?: Creator[];
  relations?: Relation[];
  rights?: Rights[];
  encoding?: Encoding;
  source?: string;
}

function xmlToIdentification(node: Element) {
  let ret: Identification = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "miscellaneous") {
      let dataMiscellaneous = xmlToMiscellaneous(ch);
      ret.miscellaneous = dataMiscellaneous;
    }
    if (ch.nodeName === "creator") {
      let dataCreators = xmlToCreator(ch);
      ret.creators = (ret.creators || []).concat(dataCreators);
    }
    if (ch.nodeName === "relation") {
      let dataRelations = xmlToRelation(ch);
      ret.relations = (ret.relations || []).concat(dataRelations);
    }
    if (ch.nodeName === "rights") {
      let dataRights = xmlToRights(ch);
      ret.rights = (ret.rights || []).concat(dataRights);
    }
    if (ch.nodeName === "encoding") {
      let dataEncoding = xmlToEncoding(ch);
      ret.encoding = dataEncoding;
    }
    if (ch.nodeName === "source") {
      let dataSource = getString(ch, true);
      ret.source = dataSource;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The supports element indicates if the encoding supports
 * a particular MusicXML element. This is recommended for
 * elements like beam, stem, and accidental, where the
 * absence of an element is ambiguous if you do not know
 * if the encoding supports that element. For Version 2.0,
 * the supports element is expanded to allow programs to
 * indicate support for particular attributes or particular
 * values. This lets applications communicate, for example,
 * that all system and/or page breaks are contained in the
 * MusicXML file.
 */
export interface Supports {
  _snapshot?: Supports;
  element: string;
  attribute?: string;
  value?: string;
  type: boolean;
}

function xmlToSupports(node: Element) {
  let ret: Supports = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "element") {
      let dataElement = getString(ch2, true);
      ret.element = dataElement;
    }
    if (ch2.name === "attribute") {
      let dataAttribute = getString(ch2, true);
      ret.attribute = dataAttribute;
    }
    if (ch2.name === "value") {
      let dataValue = getString(ch2, true);
      ret.value = dataValue;
    }
    if (ch2.name === "type") {
      let dataType = xmlToYesNo(ch2);
      ret.type = dataType;
    }
  }
  ret.element = ret.element || "";
  ret.attribute = ret.attribute || "";
  ret.value = ret.value || "";
  ret.type = defined(ret.type) ? ret.type : true;
  return ret;
}

/**
 * Encoding contains information about who did the digital
 * encoding, when, with what software, and in what aspects.
 */
export interface Encoding {
  _snapshot?: Encoding;
  encodingDescriptions?: string[];
  encodingDate?: EncodingDate;
  supports?: { [key: string]: Supports };
  encoders?: Encoder[];
  softwares?: string[];
}

function xmlToEncoding(node: Element) {
  let ret: Encoding = <any>{
    encodingDescriptions: [],
    encodingDate: null,
    supports: {},
    encoders: [],
    softwares: [],
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "encoding-description") {
      let dataEncodingDescriptions = getString(ch, true);
      ret.encodingDescriptions = (ret.encodingDescriptions || []).concat(
        dataEncodingDescriptions
      );
    }
    if (ch.nodeName === "encoding-date") {
      let dataEncodingDate = xmlToEncodingDate(ch);
      ret.encodingDate = dataEncodingDate;
    }
    if (ch.nodeName === "supports") {
      let dataSupports = xmlToSupports(ch);
      ret.supports = ret.supports || {};
      ret.supports[
        popFront(
          toCamelCase(
            (dataSupports.element.length ? "_" : "") + dataSupports.element
          ) +
            (dataSupports.attribute.length ? "_" : "") +
            toCamelCase(dataSupports.attribute)
        )
      ] = dataSupports;
    }
    if (ch.nodeName === "encoder") {
      let dataEncoders = xmlToEncoder(ch);
      ret.encoders = (ret.encoders || []).concat(dataEncoders);
    }
    if (ch.nodeName === "software") {
      let dataSoftwares = getString(ch, true);
      ret.softwares = (ret.softwares || []).concat(dataSoftwares);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export enum SeparatorType {
  None = 0,
  Horizontal = 1,
  Diagonal = 2,
  Vertical = 3,
  Adjacent = 4,
}

function getSeparatorType(node: Node, fallbackVal?: SeparatorType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The time-separator entity indicates how to display the
 * arrangement between the beats and beat-type values in a
 * time signature. The default value is none. The horizontal,
 * diagonal, and vertical values represent horizontal, diagonal
 * lower-left to upper-right, and vertical lines respectively.
 * For these values, the beats and beat-type values are arranged
 * on either side of the separator line. The none value represents
 * no separator with the beats and beat-type arranged vertically.
 * The adjacent value represents no separator with the beats and
 * beat-type arranged horizontally.
 */
export interface TimeSeparator {
  _snapshot?: TimeSeparator;
  separator?: SeparatorType;
}

function xmlToTimeSeparator(node: Element) {
  let ret: TimeSeparator = <any>{};
  let foundSeparator = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "separator") {
      let dataSeparator = getSeparatorType(ch2, SeparatorType.None);
      ret.separator = dataSeparator;
      foundSeparator = true;
    }
  }
  if (!foundSeparator) {
    ret.separator = SeparatorType.None;
  }
  return ret;
}

export enum TimeSymbolType {
  DottedNote = 4,
  Cut = 1,
  SingleNumber = 2,
  Note = 3,
  Common = 0,
  Normal = 5,
}

function getTimeSymbolType(node: Node, fallbackVal?: TimeSymbolType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The time-symbol entity indicates how to display a time
 * signature. The normal value is the usual fractional display,
 * and is the implied symbol type if none is specified. Other
 * options are the common and cut time symbols, as well as a
 * single number with an implied denominator. The note symbol
 * indicates that the beat-type should be represented with
 * the corresponding downstem note rather than a number. The
 * dotted-note symbol indicates that the beat-type should be
 * represented with a dotted downstem note that corresponds to
 * three times the beat-type value, and a numerator that is
 * one third the beats value.
 */
export interface TimeSymbol {
  _snapshot?: TimeSymbol;
  symbol?: TimeSymbolType;
}

function xmlToTimeSymbol(node: Element) {
  let ret: TimeSymbol = <any>{};
  let foundSymbol = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "symbol") {
      let dataSymbol = getTimeSymbolType(ch2, TimeSymbolType.Normal);
      ret.symbol = dataSymbol;
      foundSymbol = true;
    }
  }
  if (!foundSymbol) {
    ret.symbol = TimeSymbolType.Normal;
  }
  return ret;
}

export enum CancelLocation {
  Right = 1,
  BeforeBarline = 2,
  Left = 0,
}

function getCancelLocation(node: Node, fallbackVal?: CancelLocation) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Traditional key signatures are represented by the number
 * of flats and sharps, plus an optional mode for major/
 * minor/mode distinctions. Negative numbers are used for
 * flats and positive numbers for sharps, reflecting the
 * key's placement within the circle of fifths (hence the
 * element name). A cancel element indicates that the old
 * key signature should be cancelled before the new one
 * appears. This will always happen when changing to C major
 * or A minor and need not be specified then. The cancel
 * value matches the fifths value of the cancelled key
 * signature (e.g., a cancel of -2 will provide an explicit
 * cancellation for changing from B flat major to F major).
 * The optional location attribute indicates where a key
 * signature cancellation appears relative to a new key
 * signature: to the left, to the right, or before the barline
 * and to the left. It is left by default. For mid-measure key
 * elements, a cancel location of before-barline should be
 * treated like a cancel location of left.
 *
 * Non-traditional key signatures can be represented using
 * the Humdrum/Scot concept of a list of altered tones.
 * The key-step and key-alter elements are represented the
 * same way as the step and alter elements are in the pitch
 * element in the note.mod file. The optional key-accidental
 * element is represented the same way as the accidental
 * element in the note.mod file. It is used for disambiguating
 * microtonal accidentals. The different element names
 * indicate the different meaning of altering notes in a scale
 * versus altering a sounding pitch.
 *
 * Valid mode values include major, minor, dorian, phrygian,
 * lydian, mixolydian, aeolian, ionian, locrian, and none.
 *
 * The optional number attribute refers to staff numbers,
 * from top to bottom on the system. If absent, the key
 * signature applies to all staves in the part.
 * The optional list of key-octave elements is used to specify
 * in which octave each element of the key signature appears.
 * The content specifies the octave value using the same
 * values as the display-octave element. The number attribute
 * is a positive integer that refers to the key signature
 * element in left-to-right order. If the cancel attribute is
 * set to yes, then this number refers to an element specified
 * by the cancel element. It is no by default.
 *
 * Key signatures appear at the start of each system unless
 * the print-object attribute has been set to "no".
 */
export interface Cancel {
  _snapshot?: Cancel;
  fifths: number;
  location?: CancelLocation;
}

function xmlToCancel(node: Element) {
  let ret: Cancel = <any>{};
  let foundLocation = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "location") {
      let dataLocation = getCancelLocation(ch2, CancelLocation.Left);
      ret.location = dataLocation;
      foundLocation = true;
    }
  }
  let ch3 = node;
  let dataFifths = getNumber(ch3, true);
  ret.fifths = dataFifths;
  if (!foundLocation) {
    ret.location = CancelLocation.Left;
  }
  return ret;
}

/**
 * Traditional key signatures are represented by the number
 * of flats and sharps, plus an optional mode for major/
 * minor/mode distinctions. Negative numbers are used for
 * flats and positive numbers for sharps, reflecting the
 * key's placement within the circle of fifths (hence the
 * element name). A cancel element indicates that the old
 * key signature should be cancelled before the new one
 * appears. This will always happen when changing to C major
 * or A minor and need not be specified then. The cancel
 * value matches the fifths value of the cancelled key
 * signature (e.g., a cancel of -2 will provide an explicit
 * cancellation for changing from B flat major to F major).
 * The optional location attribute indicates where a key
 * signature cancellation appears relative to a new key
 * signature: to the left, to the right, or before the barline
 * and to the left. It is left by default. For mid-measure key
 * elements, a cancel location of before-barline should be
 * treated like a cancel location of left.
 *
 * Non-traditional key signatures can be represented using
 * the Humdrum/Scot concept of a list of altered tones.
 * The key-step and key-alter elements are represented the
 * same way as the step and alter elements are in the pitch
 * element in the note.mod file. The optional key-accidental
 * element is represented the same way as the accidental
 * element in the note.mod file. It is used for disambiguating
 * microtonal accidentals. The different element names
 * indicate the different meaning of altering notes in a scale
 * versus altering a sounding pitch.
 *
 * Valid mode values include major, minor, dorian, phrygian,
 * lydian, mixolydian, aeolian, ionian, locrian, and none.
 *
 * The optional number attribute refers to staff numbers,
 * from top to bottom on the system. If absent, the key
 * signature applies to all staves in the part.
 * The optional list of key-octave elements is used to specify
 * in which octave each element of the key signature appears.
 * The content specifies the octave value using the same
 * values as the display-octave element. The number attribute
 * is a positive integer that refers to the key signature
 * element in left-to-right order. If the cancel attribute is
 * set to yes, then this number refers to an element specified
 * by the cancel element. It is no by default.
 *
 * Key signatures appear at the start of each system unless
 * the print-object attribute has been set to "no".
 */
export interface KeyOctave {
  _snapshot?: KeyOctave;
  octave: number;
  number: number;
  cancel?: boolean;
}

function xmlToKeyOctave(node: Element) {
  let ret: KeyOctave = <any>{};
  let foundCancel = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "cancel") {
      let dataCancel = xmlToYesNo(ch2);
      ret.cancel = dataCancel;
      foundCancel = true;
    }
  }
  let ch3 = node;
  let dataOctave = getNumber(ch3, true);
  ret.octave = dataOctave;
  if (!foundCancel) {
    ret.cancel = false;
  }
  return ret;
}

/**
 * Traditional key signatures are represented by the number
 * of flats and sharps, plus an optional mode for major/
 * minor/mode distinctions. Negative numbers are used for
 * flats and positive numbers for sharps, reflecting the
 * key's placement within the circle of fifths (hence the
 * element name). A cancel element indicates that the old
 * key signature should be cancelled before the new one
 * appears. This will always happen when changing to C major
 * or A minor and need not be specified then. The cancel
 * value matches the fifths value of the cancelled key
 * signature (e.g., a cancel of -2 will provide an explicit
 * cancellation for changing from B flat major to F major).
 * The optional location attribute indicates where a key
 * signature cancellation appears relative to a new key
 * signature: to the left, to the right, or before the barline
 * and to the left. It is left by default. For mid-measure key
 * elements, a cancel location of before-barline should be
 * treated like a cancel location of left.
 *
 * Non-traditional key signatures can be represented using
 * the Humdrum/Scot concept of a list of altered tones.
 * The key-step and key-alter elements are represented the
 * same way as the step and alter elements are in the pitch
 * element in the note.mod file. The optional key-accidental
 * element is represented the same way as the accidental
 * element in the note.mod file. It is used for disambiguating
 * microtonal accidentals. The different element names
 * indicate the different meaning of altering notes in a scale
 * versus altering a sounding pitch.
 *
 * Valid mode values include major, minor, dorian, phrygian,
 * lydian, mixolydian, aeolian, ionian, locrian, and none.
 *
 * The optional number attribute refers to staff numbers,
 * from top to bottom on the system. If absent, the key
 * signature applies to all staves in the part.
 * The optional list of key-octave elements is used to specify
 * in which octave each element of the key signature appears.
 * The content specifies the octave value using the same
 * values as the display-octave element. The number attribute
 * is a positive integer that refers to the key signature
 * element in left-to-right order. If the cancel attribute is
 * set to yes, then this number refers to an element specified
 * by the cancel element. It is no by default.
 *
 * Key signatures appear at the start of each system unless
 * the print-object attribute has been set to "no".
 */
export interface Key extends PrintStyle, PrintObject {
  _snapshot?: Key;
  cancel?: Cancel;
  keySteps?: string[];
  keyOctaves?: KeyOctave[];
  number?: number;
  fifths?: number;
  keyAlters?: string[];
  keyAccidentals?: string[];
  mode?: string;
  _class?: string;
}

function xmlToKey(node: Element) {
  let ret: Key = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPrintObject = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "cancel") {
      let dataCancel = xmlToCancel(ch);
      ret.cancel = dataCancel;
    }
    if (ch.nodeName === "key-step") {
      let dataKeySteps = getString(ch, true);
      ret.keySteps = (ret.keySteps || []).concat(dataKeySteps);
    }
    if (ch.nodeName === "key-octave") {
      let dataKeyOctaves = xmlToKeyOctave(ch);
      ret.keyOctaves = (ret.keyOctaves || []).concat(dataKeyOctaves);
    }
    if (ch.nodeName === "fifths") {
      let dataFifths = getNumber(ch, true);
      ret.fifths = dataFifths;
    }
    if (ch.nodeName === "key-alter") {
      let dataKeyAlters = getString(ch, true);
      ret.keyAlters = (ret.keyAlters || []).concat(dataKeyAlters);
    }
    if (ch.nodeName === "key-accidental") {
      let dataKeyAccidentals = getString(ch, true);
      ret.keyAccidentals = ret.keyAccidentals || [];
      ret.keyAccidentals.length = Math.max(
        ret.keyAccidentals.length,
        ret.keySteps.length
      );
      ret.keyAccidentals[ret.keySteps.length - 1] = dataKeyAccidentals;
    }
    if (ch.nodeName === "mode") {
      let dataMode = getString(ch, true);
      ret.mode = dataMode;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
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

/**
 * Time signatures are represented by two elements. The
 * beats element indicates the number of beats, as found in
 * the numerator of a time signature. The beat-type element
 * indicates the beat unit, as found in the denominator of
 * a time signature.
 *
 * Multiple pairs of beats and beat-type elements are used for
 * composite time signatures with multiple denominators, such
 * as 2/4 + 3/8. A composite such as 3+2/8 requires only one
 * beats/beat-type pair.
 *
 * The interchangeable element is used to represent the second
 * in a pair of interchangeable dual time signatures, such as
 * the 6/8 in 3/4 (6/8). A separate symbol attribute value is
 * available compared to the time element's symbol attribute,
 * which applies to the first of the dual time signatures.
 * The time-relation element indicates the symbol used to
 * represent the interchangeable aspect of the time signature.
 * Valid values are parentheses, bracket, equals, slash, space,
 * and hyphen.
 *
 * A senza-misura element explicitly indicates that no time
 * signature is present. The optional element content
 * indicates the symbol to be used, if any, such as an X.
 * The time element's symbol attribute is not used when a
 * senza-misura element is present.
 *
 * The print-object attribute allows a time signature to be
 * specified but not printed, as is the case for excerpts
 * from the middle of a score. The value is "yes" if
 * not present. The optional number attribute refers to staff
 * numbers within the part, from top to bottom on the system.
 * If absent, the time signature applies to all staves in the
 * part.
 */
export interface Time
  extends TimeSymbol,
    TimeSeparator,
    PrintStyleAlign,
    PrintObject {
  _snapshot?: Time;
  interchangeable?: Interchangeable;
  beats: string[];
  beatTypes: number[];
  senzaMisura?: string;
  _class?: string;
  number?: number;
}

function xmlToTime(node: Element) {
  let ret: Time = <any>{};
  let foundSymbol = false;
  let foundSeparator = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundPrintObject = false;
  let foundNumber = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "interchangeable") {
      let dataInterchangeable = xmlToInterchangeable(ch);
      ret.interchangeable = dataInterchangeable;
    }
    if (ch.nodeName === "beats") {
      let dataBeats = getString(ch, true);
      ret.beats = (ret.beats || []).concat(dataBeats);
    }
    if (ch.nodeName === "beat-type") {
      let dataBeatTypes = getNumber(ch, true);
      ret.beatTypes = (ret.beatTypes || []).concat(dataBeatTypes);
    }
    if (ch.nodeName === "senza-misura") {
      let dataSenzaMisura = getString(ch, true);
      ret.senzaMisura = dataSenzaMisura;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "symbol") {
      let dataSymbol = getTimeSymbolType(ch2, TimeSymbolType.Normal);
      ret.symbol = dataSymbol;
      foundSymbol = true;
    }
    if (ch2.name === "separator") {
      let dataSeparator = getSeparatorType(ch2, SeparatorType.None);
      ret.separator = dataSeparator;
      foundSeparator = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber = true;
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  if (!foundPrintObject) {
    ret.printObject = true;
  }
  if (!foundNumber) {
    ret.number = 1;
  }
  ret._class = "Time";
  return ret;
}

/**
 * Time signatures are represented by two elements. The
 * beats element indicates the number of beats, as found in
 * the numerator of a time signature. The beat-type element
 * indicates the beat unit, as found in the denominator of
 * a time signature.
 *
 * Multiple pairs of beats and beat-type elements are used for
 * composite time signatures with multiple denominators, such
 * as 2/4 + 3/8. A composite such as 3+2/8 requires only one
 * beats/beat-type pair.
 *
 * The interchangeable element is used to represent the second
 * in a pair of interchangeable dual time signatures, such as
 * the 6/8 in 3/4 (6/8). A separate symbol attribute value is
 * available compared to the time element's symbol attribute,
 * which applies to the first of the dual time signatures.
 * The time-relation element indicates the symbol used to
 * represent the interchangeable aspect of the time signature.
 * Valid values are parentheses, bracket, equals, slash, space,
 * and hyphen.
 *
 * A senza-misura element explicitly indicates that no time
 * signature is present. The optional element content
 * indicates the symbol to be used, if any, such as an X.
 * The time element's symbol attribute is not used when a
 * senza-misura element is present.
 *
 * The print-object attribute allows a time signature to be
 * specified but not printed, as is the case for excerpts
 * from the middle of a score. The value is "yes" if
 * not present. The optional number attribute refers to staff
 * numbers within the part, from top to bottom on the system.
 * If absent, the time signature applies to all staves in the
 * part.
 */
export interface Interchangeable extends TimeSymbol, TimeSeparator {
  _snapshot?: Interchangeable;
  beats: string[];
  beatTypes: number[];
  timeRelation?: string;
}

function xmlToInterchangeable(node: Element) {
  let ret: Interchangeable = <any>{};
  let foundSymbol = false;
  let foundSeparator = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "beats") {
      let dataBeats = getString(ch, true);
      ret.beats = (ret.beats || []).concat(dataBeats);
    }
    if (ch.nodeName === "beat-type") {
      let dataBeatTypes = getNumber(ch, true);
      ret.beatTypes = (ret.beatTypes || []).concat(dataBeatTypes);
    }
    if (ch.nodeName === "time-relation") {
      let dataTimeRelation = getString(ch, true);
      ret.timeRelation = dataTimeRelation;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "symbol") {
      let dataSymbol = getTimeSymbolType(ch2, TimeSymbolType.Normal);
      ret.symbol = dataSymbol;
      foundSymbol = true;
    }
    if (ch2.name === "separator") {
      let dataSeparator = getSeparatorType(ch2, SeparatorType.None);
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

export enum PartSymbolType {
  None = 0,
  Line = 2,
  Bracket = 3,
  Square = 4,
  Brace = 1,
}

function getPartSymbolType(node: Node, fallbackVal?: PartSymbolType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The part-symbol element indicates how a symbol for a
 * multi-staff part is indicated in the score. Values include
 * none, brace, line, bracket, and square; brace is the default.
 * The top-staff and bottom-staff elements are used when the
 * brace does not extend across the entire part. For example, in
 * a 3-staff organ part, the top-staff will typically be 1 for
 * the right hand, while the bottom-staff will typically be 2
 * for the left hand. Staff 3 for the pedals is usually outside
 * the brace. By default, the presence of a part-symbol element
 * that does not extend across the entire part also indicates a
 * corresponding change in the common barlines within a part.
 */
export interface PartSymbol extends Position, Color {
  _snapshot?: PartSymbol;
  topStaff?: number;
  type: PartSymbolType;
  bottomStaff?: number;
  _class?: string;
}

function xmlToPartSymbol(node: Element) {
  let ret: PartSymbol = <any>{};
  let foundTopStaff = false;
  let foundColor = false;
  let foundBottomStaff = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "top-staff") {
      let dataTopStaff = getNumber(ch2, true);
      ret.topStaff = dataTopStaff;
      foundTopStaff = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "bottom-staff") {
      let dataBottomStaff = getNumber(ch2, true);
      ret.bottomStaff = dataBottomStaff;
      foundBottomStaff = true;
    }
  }
  let ch3 = node;
  let dataType = getPartSymbolType(ch3, null);
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

/**
 * Clefs are represented by the sign, line, and
 * clef-octave-change elements. Sign values include G, F, C,
 * percussion, TAB, jianpu, and none. Line numbers are
 * counted from the bottom of the staff. Standard values are
 * 2 for the G sign (treble clef), 4 for the F sign (bass clef),
 * 3 for the C sign (alto clef) and 5 for TAB (on a 6-line
 * staff). The clef-octave-change element is used for
 * transposing clefs (e.g., a treble clef for tenors would
 * have a clef-octave-change value of -1). The optional
 * number attribute refers to staff numbers within the part,
 * from top to bottom on the system. A value of 1 is
 * assumed if not present.
 *
 * The jianpu sign indicates that the music that follows
 * should be in jianpu numbered notation, just as the TAB
 * sign indicates that the music that follows should be in
 * tablature notation. Unlike TAB, a jianpu sign does not
 * correspond to a visual clef notation.
 *
 * Sometimes clefs are added to the staff in non-standard
 * line positions, either to indicate cue passages, or when
 * there are multiple clefs present simultaneously on one
 * staff. In this situation, the additional attribute is set to
 * "yes" and the line value is ignored. The size attribute
 * is used for clefs where the additional attribute is "yes".
 * It is typically used to indicate cue clefs.
 *
 * Sometimes clefs at the start of a measure need to appear
 * after the barline rather than before, as for cues or for
 * use after a repeated section. The after-barline attribute
 * is set to "yes" in this situation. The attribute is ignored
 * for mid-measure clefs.
 *
 * Clefs appear at the start of each system unless the
 * print-object attribute has been set to "no" or the
 * additional attribute has been set to "yes".
 */
export interface Clef extends PrintStyle, PrintObject {
  _snapshot?: Clef;
  clefOctaveChange?: string;
  sign: string;
  number?: number;
  size?: SymbolSize;
  line: number;
  afterBarline?: boolean;
  additional?: boolean;
}

function xmlToClef(node: Element) {
  let ret: Clef = <any>{};
  let foundNumber_ = false;
  let foundSize = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPrintObject = false;
  let foundAfterBarline = false;
  let foundAdditional = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "clef-octave-change") {
      let dataClefOctaveChange = getString(ch, true);
      ret.clefOctaveChange = dataClefOctaveChange;
    }
    if (ch.nodeName === "sign") {
      let dataSign = getString(ch, true);
      ret.sign = dataSign;
    }
    if (ch.nodeName === "line") {
      let dataLine = getNumber(ch, true);
      ret.line = dataLine;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "size") {
      let dataSize = getSymbolSize(ch2, SymbolSize.Full);
      ret.size = dataSize;
      foundSize = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "after-barline") {
      let dataAfterBarline = xmlToYesNo(ch2);
      ret.afterBarline = dataAfterBarline;
      foundAfterBarline = true;
    }
    if (ch2.name === "additional") {
      let dataAdditional = xmlToYesNo(ch2);
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

/**
 * The tuning-step, tuning-alter, and tuning-octave
 * elements are defined in the common.mod file. Staff
 * lines are numbered from bottom to top.
 */
export interface StaffTuning {
  _snapshot?: StaffTuning;
  tuningAlter?: string;
  line: string;
  tuningStep: string;
  tuningOctave: string;
}

function xmlToStaffTuning(node: Element) {
  let ret: StaffTuning = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "tuning-alter") {
      let dataTuningAlter = getString(ch, true);
      ret.tuningAlter = dataTuningAlter;
    }
    if (ch.nodeName === "tuning-step") {
      let dataTuningStep = getString(ch, true);
      ret.tuningStep = dataTuningStep;
    }
    if (ch.nodeName === "tuning-octave") {
      let dataTuningOctave = getString(ch, true);
      ret.tuningOctave = dataTuningOctave;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line") {
      let dataLine = getString(ch2, true);
      ret.line = dataLine;
    }
  }
  return ret;
}

export enum ShowFretsType {
  Letters = 1,
  Numbers = 0,
}

function getShowFretsType(node: Node, fallbackVal?: ShowFretsType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The staff-details element is used to indicate different
 * types of staves. The staff-type element can be ossia,
 * cue, editorial, regular, or alternate. An alternate staff
 * indicates one that shares the same musical data as the
 * prior staff, but displayed differently (e.g., treble and
 * bass clef, standard notation and tab). The staff-lines
 * element specifies the number of lines for a non 5-line
 * staff. The staff-tuning and capo elements are used to
 * specify tuning when using tablature notation. The optional
 * number attribute specifies the staff number from top to
 * bottom on the system, as with clef. The optional show-frets
 * attribute indicates whether to show tablature frets as
 * numbers (0, 1, 2) or letters (a, b, c). The default choice
 * is numbers. The print-object attribute is used to indicate
 * when a staff is not printed in a part, usually in large
 * scores where empty parts are omitted. It is yes by default.
 * If print-spacing is yes while print-object is no, the score
 * is printed in cutaway format where vertical space is left
 * for the empty part.
 */
export interface StaffDetails extends PrintObject, PrintSpacing {
  _snapshot?: StaffDetails;
  staffLines?: number;
  staffTunings?: StaffTuning[];
  staffSize?: number;
  showFrets?: ShowFretsType;
  capo?: string;
  number?: number;
  staffType?: string;
}

function xmlToStaffDetails(node: Element) {
  let ret: StaffDetails = <any>{};
  let foundShowFrets = false;
  let foundNumber_ = false;
  let foundPrintObject = false;
  let foundPrintSpacing = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "staff-lines") {
      let dataStaffLines = getNumber(ch, true);
      ret.staffLines = dataStaffLines;
    }
    if (ch.nodeName === "staff-tuning") {
      let dataStaffTunings = xmlToStaffTuning(ch);
      ret.staffTunings = (ret.staffTunings || []).concat(dataStaffTunings);
    }
    if (ch.nodeName === "staff-size") {
      let dataStaffSize = getNumber(ch, true);
      ret.staffSize = dataStaffSize;
    }
    if (ch.nodeName === "capo") {
      let dataCapo = getString(ch, true);
      ret.capo = dataCapo;
    }
    if (ch.nodeName === "staff-type") {
      let dataStaffType = getString(ch, true);
      ret.staffType = dataStaffType;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "show-frets") {
      let dataShowFrets = getShowFretsType(ch2, ShowFretsType.Numbers);
      ret.showFrets = dataShowFrets;
      foundShowFrets = true;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "print-spacing") {
      let dataPrintSpacing = xmlToYesNo(ch2);
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

/**
 * If the part is being encoded for a transposing instrument
 * in written vs. concert pitch, the transposition must be
 * encoded in the transpose element. The transpose element
 * represents what must be added to the written pitch to get
 * the correct sounding pitch.
 *
 * The transposition is represented by chromatic steps
 * (required) and three optional elements: diatonic pitch
 * steps, octave changes, and doubling an octave down. The
 * chromatic and octave-change elements are numeric values
 * added to the encoded pitch data to create the sounding
 * pitch. The diatonic element is also numeric and allows
 * for correct spelling of enharmonic transpositions.
 *
 * The optional number attribute refers to staff numbers,
 * from top to bottom on the system. If absent, the
 * transposition applies to all staves in the part. Per-staff
 * transposition is most often used in parts that represent
 * multiple instruments.
 */
export interface Double {
  _snapshot?: Double;
}

function xmlToDouble(node: Element) {
  let ret: Double = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * If the part is being encoded for a transposing instrument
 * in written vs. concert pitch, the transposition must be
 * encoded in the transpose element. The transpose element
 * represents what must be added to the written pitch to get
 * the correct sounding pitch.
 *
 * The transposition is represented by chromatic steps
 * (required) and three optional elements: diatonic pitch
 * steps, octave changes, and doubling an octave down. The
 * chromatic and octave-change elements are numeric values
 * added to the encoded pitch data to create the sounding
 * pitch. The diatonic element is also numeric and allows
 * for correct spelling of enharmonic transpositions.
 *
 * The optional number attribute refers to staff numbers,
 * from top to bottom on the system. If absent, the
 * transposition applies to all staves in the part. Per-staff
 * transposition is most often used in parts that represent
 * multiple instruments.
 */
export interface Transpose {
  _snapshot?: Transpose;
  number?: number;
  diatonic?: string;
  octaveChange?: string;
  double?: Double;
  chromatic: string;
}

function xmlToTranspose(node: Element) {
  let ret: Transpose = <any>{};
  let foundNumber_ = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "diatonic") {
      let dataDiatonic = getString(ch, true);
      ret.diatonic = dataDiatonic;
    }
    if (ch.nodeName === "octave-change") {
      let dataOctaveChange = getString(ch, true);
      ret.octaveChange = dataOctaveChange;
    }
    if (ch.nodeName === "double") {
      let dataDouble = xmlToDouble(ch);
      ret.double = dataDouble;
    }
    if (ch.nodeName === "chromatic") {
      let dataChromatic = getString(ch, true);
      ret.chromatic = dataChromatic;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
  }
  if (!foundNumber_) {
    ret.number = NaN;
  }
  return ret;
}

/**
 * Directives are like directions, but can be grouped together
 * with attributes for convenience. This is typically used for
 * tempo markings at the beginning of a piece of music. This
 * element has been deprecated in Version 2.0 in favor of
 * the directive attribute for direction elements. Language
 * names come from ISO 639, with optional country subcodes
 * from ISO 3166.
 */
export interface Directive extends PrintStyle {
  _snapshot?: Directive;
  data: string;
}

function xmlToDirective(node: Element) {
  let ret: Directive = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The slash-type and slash-dot elements are optional children
 * of the beat-repeat and slash elements. They have the same
 * values as the type and dot elements, and define what the
 * beat is for the display of repetition marks. If not present,
 * the beat is based on the current time signature.
 */
export interface SlashDot {
  _snapshot?: SlashDot;
}

function xmlToSlashDot(node: Element) {
  let ret: SlashDot = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The text of the multiple-rest element indicates the number
 * of measures in the multiple rest. Multiple rests may use
 * the 1-bar / 2-bar / 4-bar rest symbols, or a single shape.
 * The use-symbols attribute indicates which to use; it is no
 * if not specified.
 */
export interface MultipleRest {
  _snapshot?: MultipleRest;
  useSymbols?: boolean;
  count: number;
}

function xmlToMultipleRest(node: Element) {
  let ret: MultipleRest = <any>{};
  let foundUseSymbols = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "use-symbols") {
      let dataUseSymbols = xmlToYesNo(ch2);
      ret.useSymbols = dataUseSymbols;
      foundUseSymbols = true;
    }
  }
  let ch3 = node;
  let dataCount = getNumber(ch3, true);
  ret.count = dataCount;
  if (!foundUseSymbols) {
    ret.useSymbols = false;
  }
  return ret;
}

/**
 * The measure-repeat and beat-repeat element specify a
 * notation style for repetitions. The actual music being
 * repeated needs to be repeated within the MusicXML file.
 * These elements specify the notation that indicates the
 * repeat.
 *
 * The measure-repeat element is used for both single and
 * multiple measure repeats. The text of the element indicates
 * the number of measures to be repeated in a single pattern.
 * The slashes attribute specifies the number of slashes to
 * use in the repeat sign. It is 1 if not specified. Both the
 * start and the stop of the measure-repeat must be specified.
 */
export interface MeasureRepeat {
  _snapshot?: MeasureRepeat;
  data?: string;
  type: StartStop;
  slashes?: number;
}

function xmlToMeasureRepeat(node: Element) {
  let ret: MeasureRepeat = <any>{};
  let foundSlashes = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "slashes") {
      let dataSlashes = getNumber(ch2, true);
      ret.slashes = dataSlashes;
      foundSlashes = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
  ret.data = dataData;
  if (!foundSlashes) {
    ret.slashes = 1;
  }
  return ret;
}

/**
 * The measure-repeat and beat-repeat element specify a
 * notation style for repetitions. The actual music being
 * repeated needs to be repeated within the MusicXML file.
 * These elements specify the notation that indicates the
 * repeat.
 *
 * The beat-repeat element is used to indicate that a single
 * beat (but possibly many notes) is repeated. Both the start
 * and stop of the beat being repeated should be specified.
 * The slashes attribute specifies the number of slashes to
 * use in the symbol. The use-dots attribute indicates whether
 * or not to use dots as well (for instance, with mixed rhythm
 * patterns). By default, the value for slashes is 1 and the
 * value for use-dots is no.
 */
export interface BeatRepeat {
  _snapshot?: BeatRepeat;
  slashType?: string;
  useDots?: boolean;
  slashDots?: SlashDot[];
  slases?: number;
  type: StartStop;
}

function xmlToBeatRepeat(node: Element) {
  let ret: BeatRepeat = <any>{};
  let foundUseDots = false;
  let foundSlases = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "slash-type") {
      let dataSlashType = getString(ch, true);
      ret.slashType = dataSlashType;
    }
    if (ch.nodeName === "slash-dot") {
      let dataSlashDots = xmlToSlashDot(ch);
      ret.slashDots = (ret.slashDots || []).concat(dataSlashDots);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "use-dots") {
      let dataUseDots = xmlToYesNo(ch2);
      ret.useDots = dataUseDots;
      foundUseDots = true;
    }
    if (ch2.name === "slases") {
      let dataSlases = getNumber(ch2, true);
      ret.slases = dataSlases;
      foundSlases = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
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

/**
 * The slash element is used to indicate that slash notation
 * is to be used. If the slash is on every beat, use-stems is
 * no (the default). To indicate rhythms but not pitches,
 * use-stems is set to yes. The type attribute indicates
 * whether this is the start or stop of a slash notation
 * style. The use-dots attribute works as for the beat-repeat
 * element, and only has effect if use-stems is no.
 */
export interface Slash {
  _snapshot?: Slash;
  slashType?: string;
  useDots?: boolean;
  useStems?: boolean;
  slashDots?: SlashDot[];
  type: StartStop;
}

function xmlToSlash(node: Element) {
  let ret: Slash = <any>{};
  let foundUseDots = false;
  let foundUseStems = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "slash-type") {
      let dataSlashType = getString(ch, true);
      ret.slashType = dataSlashType;
    }
    if (ch.nodeName === "slash-dot") {
      let dataSlashDots = xmlToSlashDot(ch);
      ret.slashDots = (ret.slashDots || []).concat(dataSlashDots);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "use-dots") {
      let dataUseDots = xmlToYesNo(ch2);
      ret.useDots = dataUseDots;
      foundUseDots = true;
    }
    if (ch2.name === "use-stems") {
      let dataUseStems = xmlToYesNo(ch2);
      ret.useStems = dataUseStems;
      foundUseStems = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
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

/**
 * A measure-style indicates a special way to print partial
 * to multiple measures within a part. This includes multiple
 * rests over several measures, repeats of beats, single, or
 * multiple measures, and use of slash notation.
 *
 * The multiple-rest and measure-repeat symbols indicate the
 * number of measures covered in the element content. The
 * beat-repeat and slash elements can cover partial measures.
 * All but the multiple-rest element use a type attribute to
 * indicate starting and stopping the use of the style. The
 * optional number attribute specifies the staff number from
 * top to bottom on the system, as with clef.
 */
export interface MeasureStyle extends Font, Color {
  _snapshot?: MeasureStyle;
  measureRepeat?: MeasureRepeat;
  beatRepeat?: BeatRepeat;
  multipleRest?: MultipleRest;
  slash?: Slash;
  number?: number;
}

function xmlToMeasureStyle(node: Element) {
  let ret: MeasureStyle = <any>{};
  let foundNumber_ = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "measure-repeat") {
      let dataMeasureRepeat = xmlToMeasureRepeat(ch);
      ret.measureRepeat = dataMeasureRepeat;
    }
    if (ch.nodeName === "beat-repeat") {
      let dataBeatRepeat = xmlToBeatRepeat(ch);
      ret.beatRepeat = dataBeatRepeat;
    }
    if (ch.nodeName === "multiple-rest") {
      let dataMultipleRest = xmlToMultipleRest(ch);
      ret.multipleRest = dataMultipleRest;
    }
    if (ch.nodeName === "slash") {
      let dataSlash = xmlToSlash(ch);
      ret.slash = dataSlash;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
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

/**
 * The attributes element contains musical information that
 * typically changes on measure boundaries. This includes
 * key and time signatures, clefs, transpositions, and staving.
 * When attributes are changed mid-measure, it affects the
 * music in score order, not in MusicXML document order.
 */
export interface Attributes extends Editorial {
  _snapshot?: Attributes;
  divisions?: number;
  partSymbol?: PartSymbol;
  clefs?: Clef[];
  measureStyles?: MeasureStyle[];
  times?: Time[];
  staffDetails?: StaffDetails[];
  transposes?: Transpose[];
  staves?: number;
  instruments?: string;
  keySignatures?: Key[];
  directives?: Directive[];
}

function xmlToAttributes(node: Element) {
  let ret: Attributes = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "divisions") {
      let dataDivisions = getNumber(ch, true);
      ret.divisions = dataDivisions;
    }
    if (ch.nodeName === "part-symbol") {
      let dataPartSymbol = xmlToPartSymbol(ch);
      ret.partSymbol = dataPartSymbol;
    }
    if (ch.nodeName === "clef") {
      let dataClefs = xmlToClef(ch);
      ret.clefs = (ret.clefs || []).concat(dataClefs);
    }
    if (ch.nodeName === "measure-style") {
      let dataMeasureStyle = xmlToMeasureStyle(ch);
      ret.measureStyles = (ret.measureStyles || []).concat(dataMeasureStyle);
    }
    if (ch.nodeName === "time") {
      let dataTimes = xmlToTime(ch);
      ret.times = (ret.times || []).concat(dataTimes);
    }
    if (ch.nodeName === "staff-details") {
      let dataStaffDetails = xmlToStaffDetails(ch);
      ret.staffDetails = (ret.staffDetails || []).concat(dataStaffDetails);
    }
    if (ch.nodeName === "transpose") {
      let dataTransposes = xmlToTranspose(ch);
      ret.transposes = (ret.transposes || []).concat(dataTransposes);
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "staves") {
      let dataStaves = getNumber(ch, true);
      ret.staves = dataStaves;
    }
    if (ch.nodeName === "instruments") {
      let dataInstruments = getString(ch, true);
      ret.instruments = dataInstruments;
    }
    if (ch.nodeName === "key") {
      let dataKeySignatures = xmlToKey(ch);
      ret.keySignatures = (ret.keySignatures || []).concat(dataKeySignatures);
    }
    if (ch.nodeName === "directive") {
      let dataDirectives = xmlToDirective(ch);
      ret.directives = (ret.directives || []).concat(dataDirectives);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "Attributes";
  return ret;
}

/**
 * The cue and grace elements indicate the presence of cue and
 * grace notes. The slash attribute for a grace note is yes for
 * slashed eighth notes. The other grace note attributes come
 * from MuseData sound suggestions. The steal-time-previous
 * attribute indicates the percentage of time to steal from the
 * previous note for the grace note. The steal-time-following
 * attribute indicates the percentage of time to steal from the
 * following note for the grace note, as for appoggiaturas. The
 * make-time attribute indicates to make time, not steal time;
 * the units are in real-time divisions for the grace note.
 */
export interface Cue {
  _snapshot?: Cue;
}

function xmlToCue(node: Element) {
  let ret: Cue = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The cue and grace elements indicate the presence of cue and
 * grace notes. The slash attribute for a grace note is yes for
 * slashed eighth notes. The other grace note attributes come
 * from MuseData sound suggestions. The steal-time-previous
 * attribute indicates the percentage of time to steal from the
 * previous note for the grace note. The steal-time-following
 * attribute indicates the percentage of time to steal from the
 * following note for the grace note, as for appoggiaturas. The
 * make-time attribute indicates to make time, not steal time;
 * the units are in real-time divisions for the grace note.
 */
export interface Grace {
  _snapshot?: Grace;
  makeTime?: string;
  stealTimePrevious?: string;
  slash?: boolean;
  stealTimeFollowing?: string;
}

function xmlToGrace(node: Element) {
  let ret: Grace = <any>{};
  let foundSlash = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "make-time") {
      let dataMakeTime = getString(ch2, true);
      ret.makeTime = dataMakeTime;
    }
    if (ch2.name === "steal-time-previous") {
      let dataStealTimePrevious = getString(ch2, true);
      ret.stealTimePrevious = dataStealTimePrevious;
    }
    if (ch2.name === "slash") {
      let dataSlash = xmlToYesNo(ch2);
      ret.slash = dataSlash;
      foundSlash = true;
    }
    if (ch2.name === "steal-time-following") {
      let dataStealTimeFollowing = getString(ch2, true);
      ret.stealTimeFollowing = dataStealTimeFollowing;
    }
  }
  if (!foundSlash) {
    ret.slash = false;
  }
  return ret;
}

/**
 * The chord element indicates that this note is an additional
 * chord tone with the preceding note. The duration of this
 * note can be no longer than the preceding note. In MuseData,
 * a missing duration indicates the same length as the previous
 * note, but the MusicXML format requires a duration for chord
 * notes too.
 */
export interface Chord {
  _snapshot?: Chord;
}

function xmlToChord(node: Element) {
  let ret: Chord = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The unpitched element indicates musical elements that are
 * notated on the staff but lack definite pitch, such as
 * unpitched percussion and speaking voice. Like notes, it
 * uses step and octave elements to indicate placement on the
 * staff, following the current clef. If percussion clef is
 * used, the display-step and display-octave elements are
 * interpreted as if in treble clef, with a G in octave 4 on
 * line 2. If not present, the note is placed on the middle
 * line of the staff, generally used for a one-line staff.
 */
export interface Unpitched {
  _snapshot?: Unpitched;
  displayStep?: string;
  displayOctave?: number;
}

function xmlToUnpitched(node: Element) {
  let ret: Unpitched = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "display-step") {
      let dataDisplayStep = getString(ch, true);
      ret.displayStep = dataDisplayStep;
    }
    if (ch.nodeName === "display-octave") {
      let dataDisplayOctave = getNumber(ch, true);
      ret.displayOctave = dataDisplayOctave;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Pitch is represented as a combination of the step of the
 * diatonic scale, the chromatic alteration, and the octave.
 * The step element uses the English letters A through G.
 * The alter element represents chromatic alteration in
 * number of semitones (e.g., -1 for flat, 1 for sharp).
 * Decimal values like 0.5 (quarter tone sharp) are
 * used for microtones. The octave element is represented
 * by the numbers 0 to 9, where 4 indicates the octave
 * started by middle C.
 */
export interface Pitch {
  _snapshot?: Pitch;
  alter?: number;
  step?: string;
  octave: number;
}

function xmlToPitch(node: Element) {
  let ret: Pitch = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "alter") {
      let dataAlter = getNumber(ch, true);
      ret.alter = dataAlter;
    }
    if (ch.nodeName === "step") {
      let dataStep = getString(ch, true);
      ret.step = dataStep.toLowerCase();
    }
    if (ch.nodeName === "octave") {
      let dataOctave = getNumber(ch, true);
      ret.octave = dataOctave;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The common note elements between cue/grace notes and
 * regular (full) notes: pitch, chord, and rest information,
 * but not duration (cue and grace notes do not have
 * duration encoded here). Unpitched elements are used for
 * unpitched percussion, speaking voice, and other musical
 * elements lacking determinate pitch.
 */
export interface FullNote {
  _snapshot?: FullNote;
  unpitched?: Unpitched;
  chord?: Chord;
  pitch?: Pitch;
  rest?: Rest;
}

function xmlToFullNote(node: Element) {
  let ret: FullNote = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "unpitched") {
      let dataUnpitched = xmlToUnpitched(ch);
      ret.unpitched = dataUnpitched;
    }
    if (ch.nodeName === "chord") {
      let dataChord = xmlToChord(ch);
      ret.chord = dataChord;
    }
    if (ch.nodeName === "pitch") {
      let dataPitch = xmlToPitch(ch);
      ret.pitch = dataPitch;
    }
    if (ch.nodeName === "rest") {
      let dataRest = xmlToRest(ch);
      ret.rest = dataRest;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The rest element indicates notated rests or silences. Rest
 * elements are usually empty, but placement on the staff can
 * be specified using display-step and display-octave
 * elements. If the measure attribute is set to yes, it
 * indicates this is a complete measure rest.
 */
export interface Rest {
  _snapshot?: Rest;
  measure?: boolean;
  displayStep?: string;
  displayOctave?: number;
}

function xmlToRest(node: Element) {
  let ret: Rest = <any>{};
  let foundMeasure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "display-step") {
      let dataDisplayStep = getString(ch, true);
      ret.displayStep = dataDisplayStep;
    }
    if (ch.nodeName === "display-octave") {
      let dataDisplayOctave = getNumber(ch, true);
      ret.displayOctave = dataDisplayOctave;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "measure") {
      let dataMeasure = xmlToYesNo(ch2);
      ret.measure = dataMeasure;
      foundMeasure = true;
    }
  }
  if (!foundMeasure) {
    ret.measure = false;
  }
  return ret;
}

/**
 * Duration is a positive number specified in division units.
 * This is the intended duration vs. notated duration (for
 * instance, swing eighths vs. even eighths, or differences
 * in dotted notes in Baroque-era music). Differences in
 * duration specific to an interpretation or performance
 * should use the note element's attack and release
 * attributes.
 *
 * The tie element indicates that a tie begins or ends with
 * this note. If the tie element applies only particular times
 * through a repeat, the time-only attribute indicates which
 * times to apply it. The tie element indicates sound; the tied
 * element indicates notation.
 */
export interface Tie extends TimeOnly {
  _snapshot?: Tie;
  type?: StartStop;
}

function xmlToTie(node: Element) {
  let ret: Tie = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "time-only") {
      let dataTimeOnly = getString(ch2, true);
      ret.timeOnly = dataTimeOnly;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
  }
  return ret;
}

/**
 * If multiple score-instruments are specified on a
 * score-part, there should be an instrument element for
 * each note in the part. The id attribute is an IDREF back
 * to the score-instrument ID.
 */
export interface Instrument {
  _snapshot?: Instrument;
  id: string;
}

function xmlToInstrument(node: Element) {
  let ret: Instrument = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "id") {
      let dataId = getString(ch2, true);
      ret.id = dataId;
    }
  }
  return ret;
}

/**
 * Notes are the most common type of MusicXML data. The
 * MusicXML format keeps the MuseData distinction between
 * elements used for sound information and elements used for
 * notation information (e.g., tie is used for sound, tied for
 * notation). Thus grace notes do not have a duration element.
 * Cue notes have a duration element, as do forward elements,
 * but no tie elements. Having these two types of information
 * available can make interchange considerably easier, as
 * some programs handle one type of information much more
 * readily than the other.
 */
export interface Note
  extends EditorialVoice,
    PrintStyle,
    Printout,
    TimeOnly,
    FullNote {
  _snapshot?: Note;
  noteheadText?: NoteheadText;
  timeModification?: TimeModification;
  accidental?: Accidental;
  instrument?: Instrument;
  attack?: number;
  endDynamics?: number;
  lyrics?: Lyric[];
  dots?: Dot[];
  notations?: Notations[];
  stem?: Stem;
  noteType?: Type;
  pizzicato?: boolean;
  cue?: Cue;
  duration?: number;
  ties?: Tie[];
  dynamics?: number;
  play?: Play;
  staff?: number;
  grace?: Grace;
  notehead?: Notehead;
  release?: number;
  beams?: Beam[];
}

function xmlToNote(node: Element) {
  let ret: Note = <any>{};
  let foundAttack = false;
  let foundEndDynamics = false;
  let foundPizzicato = false;
  let foundDynamics = false;
  let foundRelease = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPrintObject = false;
  let foundPrintSpacing = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "notehead-text") {
      let dataNoteheadText = xmlToNoteheadText(ch);
      ret.noteheadText = dataNoteheadText;
    }
    if (ch.nodeName === "time-modification") {
      let dataTimeModification = xmlToTimeModification(ch);
      ret.timeModification = dataTimeModification;
    }
    if (ch.nodeName === "accidental") {
      let dataAccidental = xmlToAccidental(ch);
      ret.accidental = dataAccidental;
    }
    if (ch.nodeName === "instrument") {
      let dataInstrument = xmlToInstrument(ch);
      ret.instrument = dataInstrument;
    }
    if (ch.nodeName === "lyric") {
      let dataLyrics = xmlToLyric(ch);
      ret.lyrics = (ret.lyrics || []).concat(dataLyrics);
    }
    if (ch.nodeName === "dot") {
      let dataDots = xmlToDot(ch);
      ret.dots = (ret.dots || []).concat(dataDots);
    }
    if (ch.nodeName === "notations") {
      let dataNotations = xmlToNotations(ch);
      ret.notations = (ret.notations || []).concat(dataNotations);
    }
    if (ch.nodeName === "stem") {
      let dataStem = xmlToStem(ch);
      ret.stem = dataStem;
    }
    if (ch.nodeName === "type") {
      let dataNoteType = xmlToType(ch);
      ret.noteType = dataNoteType;
    }
    if (ch.nodeName === "cue") {
      let dataCue = xmlToCue(ch);
      ret.cue = dataCue;
    }
    if (ch.nodeName === "duration") {
      let dataDuration = getNumber(ch, true);
      ret.duration = dataDuration;
    }
    if (ch.nodeName === "tie") {
      let dataTies = xmlToTie(ch);
      ret.ties = (ret.ties || []).concat(dataTies);
    }
    if (ch.nodeName === "play") {
      let dataPlay = xmlToPlay(ch);
      ret.play = dataPlay;
    }
    if (ch.nodeName === "staff") {
      let dataStaff = getNumber(ch, true);
      ret.staff = dataStaff;
    }
    if (ch.nodeName === "grace") {
      let dataGrace = xmlToGrace(ch);
      ret.grace = dataGrace;
    }
    if (ch.nodeName === "notehead") {
      let dataNotehead = xmlToNotehead(ch);
      ret.notehead = dataNotehead;
    }
    if (ch.nodeName === "voice") {
      let dataVoice = getNumber(ch, true);
      ret.voice = dataVoice;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "unpitched") {
      let dataUnpitched = xmlToUnpitched(ch);
      ret.unpitched = dataUnpitched;
    }
    if (ch.nodeName === "chord") {
      let dataChord = xmlToChord(ch);
      ret.chord = dataChord;
    }
    if (ch.nodeName === "pitch") {
      let dataPitch = xmlToPitch(ch);
      ret.pitch = dataPitch;
    }
    if (ch.nodeName === "rest") {
      let dataRest = xmlToRest(ch);
      ret.rest = dataRest;
    }
    if (ch.nodeName === "beam") {
      let dataBeams = xmlToBeam(ch);
      ret.beams = (ret.beams || []).concat(dataBeams);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "attack") {
      let dataAttack = getNumber(ch2, true);
      ret.attack = dataAttack;
      foundAttack = true;
    }
    if (ch2.name === "end-dynamics") {
      let dataEndDynamics = getNumber(ch2, true);
      ret.endDynamics = dataEndDynamics;
      foundEndDynamics = true;
    }
    if (ch2.name === "pizzicato") {
      let dataPizzicato = xmlToYesNo(ch2);
      ret.pizzicato = dataPizzicato;
      foundPizzicato = true;
    }
    if (ch2.name === "dynamics") {
      let dataDynamics = getNumber(ch2, true);
      ret.dynamics = dataDynamics;
      foundDynamics = true;
    }
    if (ch2.name === "release") {
      let dataRelease = getNumber(ch2, true);
      ret.release = dataRelease;
      foundRelease = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-dot") {
      let dataPrintDot = xmlToYesNo(ch2);
      ret.printDot = dataPrintDot;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "print-spacing") {
      let dataPrintSpacing = xmlToYesNo(ch2);
      ret.printSpacing = dataPrintSpacing;
      foundPrintSpacing = true;
    }
    if (ch2.name === "print-lyric") {
      let dataPrintLyric = xmlToYesNo(ch2);
      ret.printLyric = dataPrintLyric;
    }
    if (ch2.name === "time-only") {
      let dataTimeOnly = getString(ch2, true);
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

export enum Count {
  Quarter = 4,
  Breve = 9990,
  Long = 9991,
  _1024th = 1024,
  _32nd = 32,
  _16th = 16,
  Eighth = 8,
  Maxima = 9992,
  _512th = 512,
  _64th = 64,
  _256th = 256,
  _128th = 128,
  Half = 2,
  Whole = 1,
}

function getCount(node: Node, fallbackVal?: Count) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Type indicates the graphic note type, Valid values (from
 * shortest to longest) are 1024th, 512th, 256th, 128th,
 * 64th, 32nd, 16th, eighth, quarter, half, whole, breve,
 * long, and maxima. The size attribute indicates full, cue,
 * or large size, with full the default for regular notes and
 * cue the default for cue and grace notes.
 */
export interface Type {
  _snapshot?: Type;
  duration: Count;
  size?: SymbolSize;
}

function xmlToType(node: Element) {
  let ret: Type = <any>{};
  let foundSize = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "size") {
      let dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
      ret.size = dataSize;
      foundSize = true;
    }
  }
  let ch3 = node;
  let dataDuration = getCount(ch3, null);
  ret.duration = dataDuration;
  if (!foundSize) {
    ret.size = SymbolSize.Unspecified;
  }
  return ret;
}

/**
 * One dot element is used for each dot of prolongation.
 * The placement element is used to specify whether the
 * dot should appear above or below the staff line. It is
 * ignored for notes that appear on a staff space.
 */
export interface Dot extends PrintStyle, Placement {
  _snapshot?: Dot;
}

function xmlToDot(node: Element) {
  let ret: Dot = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export enum MxmlAccidental {
  NaturalFlat = 7,
  SharpUp = 13,
  ThreeQuartersFlat = 10,
  ThreeQuartersSharp = 11,
  QuarterFlat = 8,
  Flat = 2,
  TripleSharp = 18,
  Flat1 = 27,
  Flat2 = 28,
  Flat3 = 29,
  Flat4 = 291,
  TripleFlat = 191,
  Flat5 = 30,
  Sharp = 0,
  QuarterSharp = 9,
  SlashFlat = 21,
  FlatDown = 16,
  NaturalDown = 14,
  SlashQuarterSharp = 19,
  SharpSharp = 4,
  Sharp1 = 23,
  FlatUp = 17,
  Sharp2 = 24,
  Sharp3 = 25,
  DoubleSharp = 3,
  Sharp4 = 251,
  Sharp5 = 26,
  Sori = 31,
  DoubleSlashFlat = 22,
  SharpDown = 12,
  Koron = 32,
  NaturalUp = 15,
  SlashSharp = 20,
  NaturalSharp = 6,
  FlatFlat = 5,
  Natural = 1,
  DoubleFlat = 33,
}

function getMxmlAccidental(node: Node, fallbackVal?: MxmlAccidental) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Actual notated accidentals. Valid values include: sharp,
 * natural, flat, double-sharp, sharp-sharp, flat-flat,
 * natural-sharp, natural-flat, quarter-flat, quarter-sharp,
 * three-quarters-flat, three-quarters-sharp, sharp-down,
 * sharp-up, natural-down, natural-up, flat-down, flat-up,
 * triple-sharp, triple-flat, slash-quarter-sharp,
 * slash-sharp, slash-flat, double-slash-flat, sharp-1,
 * sharp-2, sharp-3, sharp-5, flat-1, flat-2, flat-3,
 * flat-4, sori, and koron.
 *
 * The quarter- and three-quarters- accidentals are
 * Tartini-style quarter-tone accidentals. The -down and -up
 * accidentals are quarter-tone accidentals that include
 * arrows pointing down or up. The slash- accidentals
 * are used in Turkish classical music. The numbered
 * sharp and flat accidentals are superscripted versions
 * of the accidental signs, used in Turkish folk music.
 * The sori and koron accidentals are microtonal sharp and
 * flat accidentals used in Iranian and Persian music.
 *
 * Editorial and cautionary indications are indicated
 * by attributes. Values for these attributes are "no" if not
 * present. Specific graphic display such as parentheses,
 * brackets, and size are controlled by the level-display
 * entity defined in the common.mod file.
 */
export interface Accidental extends LevelDisplay, PrintStyle {
  _snapshot?: Accidental;
  cautionary?: boolean;
  accidental: MxmlAccidental;
  editorial?: boolean;
}

function xmlToAccidental(node: Element) {
  let ret: Accidental = <any>{};
  let foundCautionary = false;
  let foundBracket = false;
  let foundSize = false;
  let foundParentheses = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundEditorial = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "cautionary") {
      let dataCautionary = xmlToYesNo(ch2);
      ret.cautionary = dataCautionary;
      foundCautionary = true;
    }
    if (ch2.name === "bracket") {
      let dataBracket = xmlToYesNo(ch2);
      ret.bracket = dataBracket;
      foundBracket = true;
    }
    if (ch2.name === "size") {
      let dataSize = getSymbolSize(ch2, SymbolSize.Unspecified);
      ret.size = dataSize;
      foundSize = true;
    }
    if (ch2.name === "parentheses") {
      let dataParentheses = xmlToYesNo(ch2);
      ret.parentheses = dataParentheses;
      foundParentheses = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "editorial") {
      let dataEditorial = xmlToYesNo(ch2);
      ret.editorial = dataEditorial;
      foundEditorial = true;
    }
  }
  let ch3 = node;
  let dataAccidental = getMxmlAccidental(ch3, null);
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

/**
 * Time modification indicates tuplets, double-note tremolos,
 * and other durational changes. A time-modification element
 * shows how the cumulative, sounding effect of tuplets and
 * double-note tremolos compare to the written note type
 * represented by the type and dot elements. The child elements
 * are defined in the common.mod file. Nested tuplets and other
 * notations that use more detailed information need both the
 * time-modification and tuplet elements to be represented
 * accurately.
 */
export interface TimeModification {
  _snapshot?: TimeModification;
  actualNotes: number;
  normalType?: string;
  normalNotes: number;
  normalDots?: NormalDot[];
}

function xmlToTimeModification(node: Element) {
  let ret: TimeModification = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "actual-notes") {
      let dataActualNotes = getNumber(ch, true);
      ret.actualNotes = dataActualNotes;
    }
    if (ch.nodeName === "normal-type") {
      let dataNormalType = getString(ch, true);
      ret.normalType = dataNormalType;
    }
    if (ch.nodeName === "normal-notes") {
      let dataNormalNotes = getNumber(ch, true);
      ret.normalNotes = dataNormalNotes;
    }
    if (ch.nodeName === "normal-dot") {
      let dataNormalDots = xmlToNormalDot(ch);
      ret.normalDots = (ret.normalDots || []).concat(dataNormalDots);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export enum StemType {
  None = 2,
  Double = 3,
  Down = 0,
  Up = 1,
}

function getStemType(node: Node, fallbackVal?: StemType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Stems can be down, up, none, or double. For down and up
 * stems, the position attributes can be used to specify
 * stem length. The relative values specify the end of the
 * stem relative to the program default. Default values
 * specify an absolute end stem position. Negative values of
 * relative-y that would flip a stem instead of shortening
 * it are ignored. A stem element associated with a rest
 * refers to a stemlet.
 */
export interface Stem extends Position, Color {
  _snapshot?: Stem;
  type: StemType;
}

function xmlToStem(node: Element) {
  let ret: Stem = <any>{};
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataType = getStemType(ch3, null);
  ret.type = dataType;
  if (!foundColor) {
    ret.color = "#000000";
  }
  return ret;
}

export enum NoteheadType {
  InvertedTriangle = 7,
  CircleDot = 14,
  ArrowUp = 9,
  Do = 18,
  Mi = 20,
  Cross = 4,
  Slash = 0,
  Fa = 21,
  Triangle = 1,
  FaUp = 22,
  So = 23,
  LeftTriangle = 15,
  BackSlashed = 11,
  None = 17,
  La = 24,
  Slashed = 10,
  Normal = 12,
  Cluster = 13,
  Ti = 25,
  Re = 19,
  Rectangle = 16,
  Square = 3,
  ArrowDown = 8,
  X = 5,
  Diamond = 2,
  CircleX = 6,
}

function getNoteheadType(node: Node, fallbackVal?: NoteheadType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The notehead element indicates shapes other than the open
 * and closed ovals associated with note durations. The element
 * value can be slash, triangle, diamond, square, cross, x,
 * circle-x, inverted triangle, arrow down, arrow up, slashed,
 * back slashed, normal, cluster, circle dot, left triangle,
 * rectangle, or none. For shape note music, the element values
 * do, re, mi, fa, fa up, so, la, and ti are also used,
 * corresponding to Aikin's 7-shape system. The fa up shape is
 * typically used with upstems; the fa shape is typically used
 * with downstems or no stems.
 *
 * The arrow shapes differ from triangle and inverted triangle
 * by being centered on the stem. Slashed and back slashed
 * notes include both the normal notehead and a slash. The
 * triangle shape has the tip of the triangle pointing up;
 * the inverted triangle shape has the tip of the triangle
 * pointing down. The left triangle shape is a right triangle
 * with the hypotenuse facing up and to the left.
 *
 * For the enclosed shapes, the default is to be hollow for
 * half notes and longer, and filled otherwise. The filled
 * attribute can be set to change this if needed.
 *
 * If the parentheses attribute is set to yes, the notehead
 * is parenthesized. It is no by default.
 *
 * The notehead-text element indicates text that is displayed
 * inside a notehead, as is done in some educational music.
 * It is not needed for the numbers used in tablature or jianpu
 * notation. The presence of a TAB or jianpu clefs is sufficient
 * to indicate that numbers are used. The display-text and
 * accidental-text elements allow display of fully formatted
 * text and accidentals.
 */
export interface Notehead extends Font, Color {
  _snapshot?: Notehead;
  type: NoteheadType;
  filled?: boolean;
  parentheses?: boolean;
}

function xmlToNotehead(node: Element) {
  let ret: Notehead = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "filled") {
      let dataFilled = xmlToYesNo(ch2);
      ret.filled = dataFilled;
    }
    if (ch2.name === "parentheses") {
      let dataParentheses = xmlToYesNo(ch2);
      ret.parentheses = dataParentheses;
    }
  }
  let ch3 = node;
  let dataType = getNoteheadType(ch3, null);
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

/**
 * The notehead element indicates shapes other than the open
 * and closed ovals associated with note durations. The element
 * value can be slash, triangle, diamond, square, cross, x,
 * circle-x, inverted triangle, arrow down, arrow up, slashed,
 * back slashed, normal, cluster, circle dot, left triangle,
 * rectangle, or none. For shape note music, the element values
 * do, re, mi, fa, fa up, so, la, and ti are also used,
 * corresponding to Aikin's 7-shape system. The fa up shape is
 * typically used with upstems; the fa shape is typically used
 * with downstems or no stems.
 *
 * The arrow shapes differ from triangle and inverted triangle
 * by being centered on the stem. Slashed and back slashed
 * notes include both the normal notehead and a slash. The
 * triangle shape has the tip of the triangle pointing up;
 * the inverted triangle shape has the tip of the triangle
 * pointing down. The left triangle shape is a right triangle
 * with the hypotenuse facing up and to the left.
 *
 * For the enclosed shapes, the default is to be hollow for
 * half notes and longer, and filled otherwise. The filled
 * attribute can be set to change this if needed.
 *
 * If the parentheses attribute is set to yes, the notehead
 * is parenthesized. It is no by default.
 *
 * The notehead-text element indicates text that is displayed
 * inside a notehead, as is done in some educational music.
 * It is not needed for the numbers used in tablature or jianpu
 * notation. The presence of a TAB or jianpu clefs is sufficient
 * to indicate that numbers are used. The display-text and
 * accidental-text elements allow display of fully formatted
 * text and accidentals.
 */
export interface NoteheadText {
  _snapshot?: NoteheadText;
  text: TextSegment[];
}

export enum BeamType {
  BackwardHook = 4,
  Begin = 0,
  ForwardHook = 3,
  Continue = 1,
  End = 2,
}

function getBeamType(node: Node, fallbackVal?: BeamType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

export enum AccelRitNone {
  Accel = 0,
  None = 2,
  Rit = 1,
}

function getAccelRitNone(node: Node, fallbackVal?: AccelRitNone) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Beam types include begin, continue, end, forward hook, and
 * backward hook. Up to eight concurrent beams are available to
 * cover up to 1024th notes, using an enumerated type defined
 * in the common.mod file. Each beam in a note is represented
 * with a separate beam element, starting with the eighth note
 * beam using a number attribute of 1.
 *
 * Note that the beam number does not distinguish sets of
 * beams that overlap, as it does for slur and other elements.
 * Beaming groups are distinguished by being in different
 * voices and/or the presence or absence of grace and cue
 * elements.
 *
 * Beams that have a begin value can also have a fan attribute to
 * indicate accelerandos and ritardandos using fanned beams. The
 * fan attribute may also be used with a continue value if the
 * fanning direction changes on that note. The value is "none" if not specified.
 *
 * The repeater attribute has been deprecated in MusicXML 3.0.
 * Formerly used for tremolos, it needs to be specified with a
 * "yes" value for each beam using it.
 */
export interface Beam {
  _snapshot?: Beam;
  repeater?: boolean;
  number: number;
  type: BeamType;
  fan?: AccelRitNone;
}

function xmlToBeam(node: Element) {
  let ret: Beam = <any>{};
  let foundRepeater = false;
  let foundNumber_ = false;
  let foundFan = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "repeater") {
      let dataRepeater = xmlToYesNo(ch2);
      ret.repeater = dataRepeater;
      foundRepeater = true;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "fan") {
      let dataFan = getAccelRitNone(ch2, AccelRitNone.None);
      ret.fan = dataFan;
      foundFan = true;
    }
  }
  let ch3 = node;
  let dataType = getBeamType(ch3, null);
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

/**
 * Notations are musical notations, not XML notations. Multiple
 * notations are allowed in order to represent multiple editorial
 * levels. The print-object attribute, added in Version 3.0,
 * allows notations to represent details of performance technique,
 * such as fingerings, without having them appear in the score.
 */
export interface Notations extends Editorial, PrintObject {
  _snapshot?: Notations;
  slurs?: Slur[];
  articulations?: Articulations[];
  slides?: Slide[];
  technicals?: Technical[];
  tieds?: Tied[];
  tuplets?: Tuplet[];
  glissandos?: Glissando[];
  dynamics?: Dynamics[];
  fermatas?: Fermata[];
  accidentalMarks?: AccidentalMark[];
  ornaments?: Ornaments[];
  arpeggiates?: Arpeggiate[];
  nonArpeggiates?: NonArpeggiate[];
  otherNotations?: OtherNotation[];
}

function xmlToNotations(node: Element) {
  let ret: Notations = <any>{};
  let foundPrintObject = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "slur") {
      let dataSlurs = xmlToSlur(ch);
      ret.slurs = (ret.slurs || []).concat(dataSlurs);
    }
    if (ch.nodeName === "articulations") {
      let dataArticulations = xmlToArticulations(ch);
      ret.articulations = (ret.articulations || []).concat(dataArticulations);
    }
    if (ch.nodeName === "slide") {
      let dataSlides = xmlToSlide(ch);
      ret.slides = (ret.slides || []).concat(dataSlides);
    }
    if (ch.nodeName === "technical") {
      let dataTechnicals = xmlToTechnical(ch);
      ret.technicals = (ret.technicals || []).concat(dataTechnicals);
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "tied") {
      let dataTieds = xmlToTied(ch);
      ret.tieds = (ret.tieds || []).concat(dataTieds);
    }
    if (ch.nodeName === "tuplet") {
      let dataTuplets = xmlToTuplet(ch);
      ret.tuplets = (ret.tuplets || []).concat(dataTuplets);
    }
    if (ch.nodeName === "glissando") {
      let dataGlissandos = xmlToGlissando(ch);
      ret.glissandos = (ret.glissandos || []).concat(dataGlissandos);
    }
    if (ch.nodeName === "dynamics") {
      let dataDynamics = xmlToDynamics(ch);
      ret.dynamics = (ret.dynamics || []).concat(dataDynamics);
    }
    if (ch.nodeName === "fermata") {
      let dataFermatas = xmlToFermata(ch);
      ret.fermatas = (ret.fermatas || []).concat(dataFermatas);
    }
    if (ch.nodeName === "accidental-mark") {
      let dataAccidentalMarks = xmlToAccidentalMark(ch);
      ret.accidentalMarks = (ret.accidentalMarks || []).concat(
        dataAccidentalMarks
      );
    }
    if (ch.nodeName === "ornaments") {
      let dataOrnaments = xmlToOrnaments(ch);
      ret.ornaments = (ret.ornaments || []).concat(dataOrnaments);
    }
    if (ch.nodeName === "arpeggiate") {
      let dataArpeggiates = xmlToArpeggiate(ch);
      ret.arpeggiates = (ret.arpeggiates || []).concat(dataArpeggiates);
    }
    if (ch.nodeName === "non-arpeggiate") {
      let dataNonArpeggiates = xmlToNonArpeggiate(ch);
      ret.nonArpeggiates = (ret.nonArpeggiates || []).concat(
        dataNonArpeggiates
      );
    }
    if (ch.nodeName === "other-notation") {
      let dataOtherNotations = xmlToOtherNotation(ch);
      ret.otherNotations = (ret.otherNotations || []).concat(
        dataOtherNotations
      );
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
  }
  if (!foundPrintObject) {
    ret.printObject = true;
  }
  return ret;
}

/**
 * The tied element represents the notated tie. The tie element
 * represents the tie sound.
 *
 * The number attribute is rarely needed to disambiguate ties,
 * since note pitches will usually suffice. The attribute is
 * implied rather than defaulting to 1 as with most elements.
 * It is available for use in more complex tied notation
 * situations.
 */
export interface Tied
  extends LineType,
    DashedFormatting,
    Position,
    Placement,
    Orientation,
    Bezier,
    Color {
  _snapshot?: Tied;
  number?: number;
  type: StartStopContinue;
}

function xmlToTied(node: Element) {
  let ret: Tied = <any>{};
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundPlacement = false;
  let foundOrientation = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "orientation") {
      let dataOrientation = getOverUnder(ch2, OverUnder.Unspecified);
      ret.orientation = dataOrientation;
      foundOrientation = true;
    }
    if (ch2.name === "bezier-x2") {
      let dataBezierX2 = getNumber(ch2, true);
      ret.bezierX2 = dataBezierX2;
    }
    if (ch2.name === "bezier-offset") {
      let dataBezierOffset = getNumber(ch2, true);
      ret.bezierOffset = dataBezierOffset;
    }
    if (ch2.name === "bezier-offset2") {
      let dataBezierOffset2 = getNumber(ch2, true);
      ret.bezierOffset2 = dataBezierOffset2;
    }
    if (ch2.name === "bezier-x") {
      let dataBezierX = getNumber(ch2, true);
      ret.bezierX = dataBezierX;
    }
    if (ch2.name === "bezier-y") {
      let dataBezierY = getNumber(ch2, true);
      ret.bezierY = dataBezierY;
    }
    if (ch2.name === "bezier-y2") {
      let dataBezierY2 = getNumber(ch2, true);
      ret.bezierY2 = dataBezierY2;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopContinue(ch2, null);
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

/**
 * Slur elements are empty. Most slurs are represented with
 * two elements: one with a start type, and one with a stop
 * type. Slurs can add more elements using a continue type.
 * This is typically used to specify the formatting of cross-
 * system slurs, or to specify the shape of very complex slurs.
 */
export interface Slur
  extends LineType,
    DashedFormatting,
    Position,
    Placement,
    Orientation,
    Bezier,
    Color {
  _snapshot?: Slur;
  number?: number;
  type: StartStopContinue;
}

function xmlToSlur(node: Element) {
  let ret: Slur = <any>{};
  let foundNumber_ = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundPlacement = false;
  let foundOrientation = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "orientation") {
      let dataOrientation = getOverUnder(ch2, OverUnder.Unspecified);
      ret.orientation = dataOrientation;
      foundOrientation = true;
    }
    if (ch2.name === "bezier-x2") {
      let dataBezierX2 = getNumber(ch2, true);
      ret.bezierX2 = dataBezierX2;
    }
    if (ch2.name === "bezier-offset") {
      let dataBezierOffset = getNumber(ch2, true);
      ret.bezierOffset = dataBezierOffset;
    }
    if (ch2.name === "bezier-offset2") {
      let dataBezierOffset2 = getNumber(ch2, true);
      ret.bezierOffset2 = dataBezierOffset2;
    }
    if (ch2.name === "bezier-x") {
      let dataBezierX = getNumber(ch2, true);
      ret.bezierX = dataBezierX;
    }
    if (ch2.name === "bezier-y") {
      let dataBezierY = getNumber(ch2, true);
      ret.bezierY = dataBezierY;
    }
    if (ch2.name === "bezier-y2") {
      let dataBezierY2 = getNumber(ch2, true);
      ret.bezierY2 = dataBezierY2;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopContinue(ch2, null);
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

export enum ActualBothNone {
  None = 2,
  Both = 1,
  Actual = 0,
}

function getActualBothNone(node: Node, fallbackVal?: ActualBothNone) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * A tuplet element is present when a tuplet is to be displayed
 * graphically, in addition to the sound data provided by the
 * time-modification elements. The number attribute is used to
 * distinguish nested tuplets. The bracket attribute is used
 * to indicate the presence of a bracket. If unspecified, the
 * results are implementation-dependent. The line-shape
 * attribute is used to specify whether the bracket is straight
 * or in the older curved or slurred style. It is straight by
 * default.
 *
 * Whereas a time-modification element shows how the cumulative,
 * sounding effect of tuplets and double-note tremolos compare to
 * the written note type, the tuplet element describes how this
 * is displayed. The tuplet element also provides more detailed
 * representation information than the time-modification element,
 * and is needed to represent nested tuplets and other complex
 * tuplets accurately. The tuplet-actual and tuplet-normal
 * elements provide optional full control over tuplet
 * specifications. Each allows the number and note type
 * (including dots) describing a single tuplet. If any of
 * these elements are absent, their values are based on the
 * time-modification element.
 *
 * The show-number attribute is used to display either the
 * number of actual notes, the number of both actual and
 * normal notes, or neither. It is actual by default. The
 * show-type attribute is used to display either the actual
 * type, both the actual and normal types, or neither. It is
 * none by default.
 */
export interface Tuplet extends LineShape, Position, Placement {
  _snapshot?: Tuplet;
  bracket?: boolean;
  number: number;
  showNumber?: ActualBothNone;
  tupletNormal?: TupletNormal;
  type: StartStop;
  showType?: ActualBothNone;
  tupletActual?: TupletActual;
}

function xmlToTuplet(node: Element) {
  let ret: Tuplet = <any>{};
  let foundBracket = false;
  let foundShowNumber = false;
  let foundLineShape = false;
  let foundPlacement = false;
  let foundShowType = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "tuplet-normal") {
      let dataTupletNormal = xmlToTupletNormal(ch);
      ret.tupletNormal = dataTupletNormal;
    }
    if (ch.nodeName === "tuplet-actual") {
      let dataTupletActual = xmlToTupletActual(ch);
      ret.tupletActual = dataTupletActual;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "bracket") {
      let dataBracket = xmlToYesNo(ch2);
      ret.bracket = dataBracket;
      foundBracket = true;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "show-number") {
      let dataShowNumber = getActualBothNone(ch2, ActualBothNone.Actual);
      ret.showNumber = dataShowNumber;
      foundShowNumber = true;
    }
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "show-type") {
      let dataShowType = getActualBothNone(ch2, ActualBothNone.None);
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

/**
 * A tuplet element is present when a tuplet is to be displayed
 * graphically, in addition to the sound data provided by the
 * time-modification elements. The number attribute is used to
 * distinguish nested tuplets. The bracket attribute is used
 * to indicate the presence of a bracket. If unspecified, the
 * results are implementation-dependent. The line-shape
 * attribute is used to specify whether the bracket is straight
 * or in the older curved or slurred style. It is straight by
 * default.
 *
 * Whereas a time-modification element shows how the cumulative,
 * sounding effect of tuplets and double-note tremolos compare to
 * the written note type, the tuplet element describes how this
 * is displayed. The tuplet element also provides more detailed
 * representation information than the time-modification element,
 * and is needed to represent nested tuplets and other complex
 * tuplets accurately. The tuplet-actual and tuplet-normal
 * elements provide optional full control over tuplet
 * specifications. Each allows the number and note type
 * (including dots) describing a single tuplet. If any of
 * these elements are absent, their values are based on the
 * time-modification element.
 *
 * The show-number attribute is used to display either the
 * number of actual notes, the number of both actual and
 * normal notes, or neither. It is actual by default. The
 * show-type attribute is used to display either the actual
 * type, both the actual and normal types, or neither. It is
 * none by default.
 */
export interface TupletActual {
  _snapshot?: TupletActual;
  tupletNumber?: TupletNumber;
  tupletDots?: TupletDot[];
  tupletType?: TupletType;
}

function xmlToTupletActual(node: Element) {
  let ret: TupletActual = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "tuplet-number") {
      let dataTupletNumber = xmlToTupletNumber(ch);
      ret.tupletNumber = dataTupletNumber;
    }
    if (ch.nodeName === "tuplet-dot") {
      let dataTupletDots = xmlToTupletDot(ch);
      ret.tupletDots = (ret.tupletDots || []).concat(dataTupletDots);
    }
    if (ch.nodeName === "tuplet-type") {
      let dataTupletType = xmlToTupletType(ch);
      ret.tupletType = dataTupletType;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * A tuplet element is present when a tuplet is to be displayed
 * graphically, in addition to the sound data provided by the
 * time-modification elements. The number attribute is used to
 * distinguish nested tuplets. The bracket attribute is used
 * to indicate the presence of a bracket. If unspecified, the
 * results are implementation-dependent. The line-shape
 * attribute is used to specify whether the bracket is straight
 * or in the older curved or slurred style. It is straight by
 * default.
 *
 * Whereas a time-modification element shows how the cumulative,
 * sounding effect of tuplets and double-note tremolos compare to
 * the written note type, the tuplet element describes how this
 * is displayed. The tuplet element also provides more detailed
 * representation information than the time-modification element,
 * and is needed to represent nested tuplets and other complex
 * tuplets accurately. The tuplet-actual and tuplet-normal
 * elements provide optional full control over tuplet
 * specifications. Each allows the number and note type
 * (including dots) describing a single tuplet. If any of
 * these elements are absent, their values are based on the
 * time-modification element.
 *
 * The show-number attribute is used to display either the
 * number of actual notes, the number of both actual and
 * normal notes, or neither. It is actual by default. The
 * show-type attribute is used to display either the actual
 * type, both the actual and normal types, or neither. It is
 * none by default.
 */
export interface TupletNormal {
  _snapshot?: TupletNormal;
  tupletNumber?: TupletNumber;
  tupletDots?: TupletDot[];
  tupletType?: TupletType;
}

function xmlToTupletNormal(node: Element) {
  let ret: TupletNormal = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "tuplet-number") {
      let dataTupletNumber = xmlToTupletNumber(ch);
      ret.tupletNumber = dataTupletNumber;
    }
    if (ch.nodeName === "tuplet-dot") {
      let dataTupletDots = xmlToTupletDot(ch);
      ret.tupletDots = (ret.tupletDots || []).concat(dataTupletDots);
    }
    if (ch.nodeName === "tuplet-type") {
      let dataTupletType = xmlToTupletType(ch);
      ret.tupletType = dataTupletType;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * A tuplet element is present when a tuplet is to be displayed
 * graphically, in addition to the sound data provided by the
 * time-modification elements. The number attribute is used to
 * distinguish nested tuplets. The bracket attribute is used
 * to indicate the presence of a bracket. If unspecified, the
 * results are implementation-dependent. The line-shape
 * attribute is used to specify whether the bracket is straight
 * or in the older curved or slurred style. It is straight by
 * default.
 *
 * Whereas a time-modification element shows how the cumulative,
 * sounding effect of tuplets and double-note tremolos compare to
 * the written note type, the tuplet element describes how this
 * is displayed. The tuplet element also provides more detailed
 * representation information than the time-modification element,
 * and is needed to represent nested tuplets and other complex
 * tuplets accurately. The tuplet-actual and tuplet-normal
 * elements provide optional full control over tuplet
 * specifications. Each allows the number and note type
 * (including dots) describing a single tuplet. If any of
 * these elements are absent, their values are based on the
 * time-modification element.
 *
 * The show-number attribute is used to display either the
 * number of actual notes, the number of both actual and
 * normal notes, or neither. It is actual by default. The
 * show-type attribute is used to display either the actual
 * type, both the actual and normal types, or neither. It is
 * none by default.
 */
export interface TupletNumber extends Font, Color {
  _snapshot?: TupletNumber;
  text: string;
}

function xmlToTupletNumber(node: Element) {
  let ret: TupletNumber = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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

/**
 * A tuplet element is present when a tuplet is to be displayed
 * graphically, in addition to the sound data provided by the
 * time-modification elements. The number attribute is used to
 * distinguish nested tuplets. The bracket attribute is used
 * to indicate the presence of a bracket. If unspecified, the
 * results are implementation-dependent. The line-shape
 * attribute is used to specify whether the bracket is straight
 * or in the older curved or slurred style. It is straight by
 * default.
 *
 * Whereas a time-modification element shows how the cumulative,
 * sounding effect of tuplets and double-note tremolos compare to
 * the written note type, the tuplet element describes how this
 * is displayed. The tuplet element also provides more detailed
 * representation information than the time-modification element,
 * and is needed to represent nested tuplets and other complex
 * tuplets accurately. The tuplet-actual and tuplet-normal
 * elements provide optional full control over tuplet
 * specifications. Each allows the number and note type
 * (including dots) describing a single tuplet. If any of
 * these elements are absent, their values are based on the
 * time-modification element.
 *
 * The show-number attribute is used to display either the
 * number of actual notes, the number of both actual and
 * normal notes, or neither. It is actual by default. The
 * show-type attribute is used to display either the actual
 * type, both the actual and normal types, or neither. It is
 * none by default.
 */
export interface TupletType extends Font, Color {
  _snapshot?: TupletType;
  text: string;
}

function xmlToTupletType(node: Element) {
  let ret: TupletType = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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

/**
 * A tuplet element is present when a tuplet is to be displayed
 * graphically, in addition to the sound data provided by the
 * time-modification elements. The number attribute is used to
 * distinguish nested tuplets. The bracket attribute is used
 * to indicate the presence of a bracket. If unspecified, the
 * results are implementation-dependent. The line-shape
 * attribute is used to specify whether the bracket is straight
 * or in the older curved or slurred style. It is straight by
 * default.
 *
 * Whereas a time-modification element shows how the cumulative,
 * sounding effect of tuplets and double-note tremolos compare to
 * the written note type, the tuplet element describes how this
 * is displayed. The tuplet element also provides more detailed
 * representation information than the time-modification element,
 * and is needed to represent nested tuplets and other complex
 * tuplets accurately. The tuplet-actual and tuplet-normal
 * elements provide optional full control over tuplet
 * specifications. Each allows the number and note type
 * (including dots) describing a single tuplet. If any of
 * these elements are absent, their values are based on the
 * time-modification element.
 *
 * The show-number attribute is used to display either the
 * number of actual notes, the number of both actual and
 * normal notes, or neither. It is actual by default. The
 * show-type attribute is used to display either the actual
 * type, both the actual and normal types, or neither. It is
 * none by default.
 */
export interface TupletDot extends Font, Color {
  _snapshot?: TupletDot;
}

function xmlToTupletDot(node: Element) {
  let ret: TupletDot = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
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

/**
 * Glissando and slide elements both indicate rapidly moving
 * from one pitch to the other so that individual notes are not
 * discerned. The distinction is similar to that between NIFF's
 * glissando and portamento elements. A glissando sounds the
 * half notes in between the slide and defaults to a wavy line.
 * A slide is continuous between two notes and defaults to a
 * solid line. The optional text for a glissando or slide is
 * printed alongside the line.
 */
export interface Glissando extends LineType, DashedFormatting, PrintStyle {
  _snapshot?: Glissando;
  text?: string;
  type: StartStop;
  number?: number;
}

function xmlToGlissando(node: Element) {
  let ret: Glissando = <any>{};
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundNumber = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, false);
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
  if (!foundNumber) {
    ret.number = 1;
  }
  return ret;
}

/**
 * Glissando and slide elements both indicate rapidly moving
 * from one pitch to the other so that individual notes are not
 * discerned. The distinction is similar to that between NIFF's
 * glissando and portamento elements. A glissando sounds the
 * half notes in between the slide and defaults to a wavy line.
 * A slide is continuous between two notes and defaults to a
 * solid line. The optional text for a glissando or slide is
 * printed alongside the line.
 */
export interface Slide
  extends LineType,
    DashedFormatting,
    PrintStyle,
    BendSound {
  _snapshot?: Slide;
  text?: string;
  type: StartStop;
  number?: number;
}

function xmlToSlide(node: Element) {
  let ret: Slide = <any>{};
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundFirstBeat = false;
  let foundNumber = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "first-beat") {
      let dataFirstBeat = getNumber(ch2, true);
      ret.firstBeat = dataFirstBeat;
      foundFirstBeat = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, false);
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
  if (!foundNumber) {
    ret.number = 1;
  }
  return ret;
}

/**
 * The other-notation element is used to define any notations
 * not yet in the MusicXML format. This allows extended
 * representation, though without application interoperability.
 * It handles notations where more specific extension elements
 * such as other-dynamics and other-technical are not
 * appropriate.
 */
export interface OtherNotation extends PrintObject, PrintStyle, Placement {
  _snapshot?: OtherNotation;
  type: StartStopSingle;
  data?: string;
  number?: number;
}

function xmlToOtherNotation(node: Element) {
  let ret: OtherNotation = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundNumber = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopSingle(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, null);
      foundNumber = true;
      ret.type = dataNumber;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
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
  if (!foundNumber) {
    ret.number = 1;
  }
  return ret;
}

/**
 * The other-direction element is used to define any direction
 * symbols not yet in the current version of the MusicXML
 * format. This allows extended representation, though without
 * application interoperability.
 */
export interface OtherDirection extends PrintObject, PrintStyleAlign {
  _snapshot?: OtherDirection;
  data: string;
}

function xmlToOtherDirection(node: Element) {
  let ret: OtherDirection = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * Ornaments can be any of several types, followed optionally
 * by accidentals. The accidental-mark element's content is
 * represented the same as an accidental element, but with a
 * different name to reflect the different musical meaning.
 */
export interface Ornaments extends PrintStyle, Placement, TrillSound {
  _snapshot?: Ornaments;
  delayedInvertedTurn?: DelayedInvertedTurn;
  shake?: Shake;
  turn?: Turn;
  invertedTurn?: InvertedTurn;
  otherOrnament?: OtherOrnament;
  delayedTurn?: DelayedTurn;
  verticalTurn?: VerticalTurn;
  wavyLine?: WavyLine;
  tremolo?: Tremolo;
  accidentalMarks?: AccidentalMark[];
  trillMark?: TrillMark;
  mordent?: Mordent;
  invertedMordent?: InvertedMordent;
  schleifer?: Schleifer;
}

function xmlToOrnaments(node: Element) {
  let ret: Ornaments = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "delayed-inverted-turn") {
      let dataDelayedInvertedTurn = xmlToDelayedInvertedTurn(ch);
      ret.delayedInvertedTurn = dataDelayedInvertedTurn;
    }
    if (ch.nodeName === "shake") {
      let dataShake = xmlToShake(ch);
      ret.shake = dataShake;
    }
    if (ch.nodeName === "turn") {
      let dataTurn = xmlToTurn(ch);
      ret.turn = dataTurn;
    }
    if (ch.nodeName === "inverted-turn") {
      let dataInvertedTurn = xmlToInvertedTurn(ch);
      ret.invertedTurn = dataInvertedTurn;
    }
    if (ch.nodeName === "other-ornament") {
      let dataOtherOrnament = xmlToOtherOrnament(ch);
      ret.otherOrnament = dataOtherOrnament;
    }
    if (ch.nodeName === "delayed-turn") {
      let dataDelayedTurn = xmlToDelayedTurn(ch);
      ret.delayedTurn = dataDelayedTurn;
    }
    if (ch.nodeName === "vertical-turn") {
      let dataVerticalTurn = xmlToVerticalTurn(ch);
      ret.verticalTurn = dataVerticalTurn;
    }
    if (ch.nodeName === "wavy-line") {
      let dataWavyLine = xmlToWavyLine(ch);
      ret.wavyLine = dataWavyLine;
    }
    if (ch.nodeName === "tremolo") {
      let dataTremolo = xmlToTremolo(ch);
      ret.tremolo = dataTremolo;
    }
    if (ch.nodeName === "accidental-mark") {
      let dataAccidentalMarks = xmlToAccidentalMark(ch);
      ret.accidentalMarks = (ret.accidentalMarks || []).concat(
        dataAccidentalMarks
      );
    }
    if (ch.nodeName === "trill-mark") {
      let dataTrillMark = xmlToTrillMark(ch);
      ret.trillMark = dataTrillMark;
    }
    if (ch.nodeName === "mordent") {
      let dataMordent = xmlToMordent(ch);
      ret.mordent = dataMordent;
    }
    if (ch.nodeName === "inverted-mordent") {
      let dataInvertedMordent = xmlToInvertedMordent(ch);
      ret.invertedMordent = dataInvertedMordent;
    }
    if (ch.nodeName === "schleifer") {
      let dataSchleifer = xmlToSchleifer(ch);
      ret.schleifer = dataSchleifer;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

export interface TrillMark extends PrintStyle, Placement, TrillSound {
  _snapshot?: TrillMark;
}

function xmlToTrillMark(node: Element) {
  let ret: TrillMark = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * the turn and delayed-turn elements are the normal turn
 * shape which goes up then down. the inverted-turn and
 * delayed-inverted-turn elements have the shape which goes
 * down and then up. the delayed-turn and delayed-inverted-turn
 * elements indicate turns that are delayed until the end of the
 * current note. the vertical-turn element has the shape
 * arranged vertically going from upper left to lower right.
 * if the slash attribute is yes, then a vertical line is used
 * to slash the turn; it is no by default.
 */
export interface Turn extends PrintStyle, Placement, TrillSound {
  _snapshot?: Turn;
  slash?: boolean;
}

function xmlToTurn(node: Element) {
  let ret: Turn = <any>{};
  let foundSlash = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "slash") {
      let dataSlash = xmlToYesNo(ch2);
      ret.slash = dataSlash;
      foundSlash = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The turn and delayed-turn elements are the normal turn
 * shape which goes up then down. The inverted-turn and
 * delayed-inverted-turn elements have the shape which goes
 * down and then up. The delayed-turn and delayed-inverted-turn
 * elements indicate turns that are delayed until the end of the
 * current note. The vertical-turn element has the shape
 * arranged vertically going from upper left to lower right.
 * If the slash attribute is yes, then a vertical line is used
 * to slash the turn; it is no by default.
 */
export interface DelayedTurn extends PrintStyle, Placement, TrillSound {
  _snapshot?: DelayedTurn;
  slash?: boolean;
}

function xmlToDelayedTurn(node: Element) {
  let ret: DelayedTurn = <any>{};
  let foundSlash = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "slash") {
      let dataSlash = xmlToYesNo(ch2);
      ret.slash = dataSlash;
      foundSlash = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The turn and delayed-turn elements are the normal turn
 * shape which goes up then down. The inverted-turn and
 * delayed-inverted-turn elements have the shape which goes
 * down and then up. The delayed-turn and delayed-inverted-turn
 * elements indicate turns that are delayed until the end of the
 * current note. The vertical-turn element has the shape
 * arranged vertically going from upper left to lower right.
 * If the slash attribute is yes, then a vertical line is used
 * to slash the turn; it is no by default.
 */
export interface InvertedTurn extends PrintStyle, Placement, TrillSound {
  _snapshot?: InvertedTurn;
  slash?: boolean;
}

function xmlToInvertedTurn(node: Element) {
  let ret: InvertedTurn = <any>{};
  let foundSlash = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "slash") {
      let dataSlash = xmlToYesNo(ch2);
      ret.slash = dataSlash;
      foundSlash = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The turn and delayed-turn elements are the normal turn
 * shape which goes up then down. The inverted-turn and
 * delayed-inverted-turn elements have the shape which goes
 * down and then up. The delayed-turn and delayed-inverted-turn
 * elements indicate turns that are delayed until the end of the
 * current note. The vertical-turn element has the shape
 * arranged vertically going from upper left to lower right.
 * If the slash attribute is yes, then a vertical line is used
 * to slash the turn; it is no by default.
 */
export interface DelayedInvertedTurn extends PrintStyle, Placement, TrillSound {
  _snapshot?: DelayedInvertedTurn;
  slash?: boolean;
}

function xmlToDelayedInvertedTurn(node: Element) {
  let ret: DelayedInvertedTurn = <any>{};
  let foundSlash = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "slash") {
      let dataSlash = xmlToYesNo(ch2);
      ret.slash = dataSlash;
      foundSlash = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The turn and delayed-turn elements are the normal turn
 * shape which goes up then down. The inverted-turn and
 * delayed-inverted-turn elements have the shape which goes
 * down and then up. The delayed-turn and delayed-inverted-turn
 * elements indicate turns that are delayed until the end of the
 * current note. The vertical-turn element has the shape
 * arranged vertically going from upper left to lower right.
 * If the slash attribute is yes, then a vertical line is used
 * to slash the turn; it is no by default.
 */
export interface VerticalTurn extends PrintStyle, Placement, TrillSound {
  _snapshot?: VerticalTurn;
}

function xmlToVerticalTurn(node: Element) {
  let ret: VerticalTurn = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The turn and delayed-turn elements are the normal turn
 * shape which goes up then down. The inverted-turn and
 * delayed-inverted-turn elements have the shape which goes
 * down and then up. The delayed-turn and delayed-inverted-turn
 * elements indicate turns that are delayed until the end of the
 * current note. The vertical-turn element has the shape
 * arranged vertically going from upper left to lower right.
 * If the slash attribute is yes, then a vertical line is used
 * to slash the turn; it is no by default.
 */
export interface Shake extends PrintStyle, Placement, TrillSound {
  _snapshot?: Shake;
}

function xmlToShake(node: Element) {
  let ret: Shake = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The long attribute for the mordent and inverted-mordent
 * elements is "no" by default. The mordent element represents
 * the sign with the vertical line; the inverted-mordent
 * element represents the sign without the vertical line.
 * The approach and departure attributes are used for compound
 * ornaments, indicating how the beginning and ending of the
 * ornament look relative to the main part of the mordent.
 */
export interface Mordent extends PrintStyle, Placement, TrillSound {
  _snapshot?: Mordent;
  long?: boolean;
  approach?: AboveBelow;
  departure?: AboveBelow;
}

function xmlToMordent(node: Element) {
  let ret: Mordent = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "long") {
      let dataLong = xmlToYesNo(ch2);
      ret.long = dataLong;
    }
    if (ch2.name === "approach") {
      let dataApproach = getAboveBelow(ch2, null);
      ret.approach = dataApproach;
    }
    if (ch2.name === "departure") {
      let dataDeparture = getAboveBelow(ch2, null);
      ret.departure = dataDeparture;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The long attribute for the mordent and inverted-mordent
 * elements is "no" by default. The mordent element represents
 * the sign with the vertical line; the inverted-mordent
 * element represents the sign without the vertical line.
 * The approach and departure attributes are used for compound
 * ornaments, indicating how the beginning and ending of the
 * ornament look relative to the main part of the mordent.
 */
export interface InvertedMordent extends PrintStyle, Placement, TrillSound {
  _snapshot?: InvertedMordent;
  long?: boolean;
  approach?: AboveBelow;
  departure?: AboveBelow;
}

function xmlToInvertedMordent(node: Element) {
  let ret: InvertedMordent = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundStartNote = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundTrillStep = false;
  let foundTwoNoteTurn = false;
  let foundSecondBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "long") {
      let dataLong = xmlToYesNo(ch2);
      ret.long = dataLong;
    }
    if (ch2.name === "approach") {
      let dataApproach = getAboveBelow(ch2, null);
      ret.approach = dataApproach;
    }
    if (ch2.name === "departure") {
      let dataDeparture = getAboveBelow(ch2, null);
      ret.departure = dataDeparture;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "start-note") {
      let dataStartNote = getUpperMainBelow(ch2, UpperMainBelow.Upper);
      ret.startNote = dataStartNote;
      foundStartNote = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "trill-step") {
      let dataTrillStep = getWholeHalfUnison(ch2, WholeHalfUnison.Whole);
      ret.trillStep = dataTrillStep;
      foundTrillStep = true;
    }
    if (ch2.name === "two-note-turn") {
      let dataTwoNoteTurn = getWholeHalfNone(ch2, WholeHalfNone.None);
      ret.twoNoteTurn = dataTwoNoteTurn;
      foundTwoNoteTurn = true;
    }
    if (ch2.name === "second-beat") {
      let dataSecondBeat = getNumber(ch2, true);
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

/**
 * The name for this ornament is based on the German,
 * to avoid confusion with the more common slide element
 * defined earlier.
 */
export interface Schleifer extends PrintStyle, Placement {
  _snapshot?: Schleifer;
}

function xmlToSchleifer(node: Element) {
  let ret: Schleifer = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The tremolo ornament can be used to indicate either
 * single-note or double-note tremolos. Single-note tremolos
 * use the single type, while double-note tremolos use the
 * start and stop types. The default is "single" for
 * compatibility with Version 1.1. The text of the element
 * indicates the number of tremolo marks and is an integer
 * from 0 to 8. Note that the number of attached beams is
 * not included in this value, but is represented separately
 * using the beam element.
 *
 * When using double-note tremolos, the duration of each note
 * in the tremolo should correspond to half of the notated type
 * value. A time-modification element should also be added with
 * an actual-notes value of 2 and a normal-notes value of 1. If
 * used within a tuplet, this 2/1 ratio should be multiplied by
 * the existing tuplet ratio.
 *
 * Using repeater beams for indicating tremolos is deprecated as
 * of MusicXML 3.0.
 */
export interface Tremolo extends PrintStyle, Placement {
  _snapshot?: Tremolo;
  data?: string;
  type: StartStopSingle;
}

function xmlToTremolo(node: Element) {
  let ret: Tremolo = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundType = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopSingle(ch2, StartStopSingle.Single);
      ret.type = dataType;
      foundType = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
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

/**
 * The other-ornament element is used to define any ornaments
 * not yet in the MusicXML format. This allows extended
 * representation, though without application interoperability.
 */
export interface OtherOrnament extends PrintStyle, Placement {
  _snapshot?: OtherOrnament;
  type: StartStopSingle;
  data?: string;
}

function xmlToOtherOrnament(node: Element) {
  let ret: OtherOrnament = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopSingle(ch2, null);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
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

/**
 * An accidental-mark can be used as a separate notation or
 * as part of an ornament. When used in an ornament, position
 * and placement are relative to the ornament, not relative to
 * the note.
 */
export interface AccidentalMark extends PrintStyle, Placement {
  _snapshot?: AccidentalMark;
  mark: string;
}

function xmlToAccidentalMark(node: Element) {
  let ret: AccidentalMark = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataMark = getString(ch3, true);
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

/**
 * Technical indications give performance information for
 * individual instruments.
 */
export interface Technical {
  _snapshot?: Technical;
  tripleTongue?: TripleTongue;
  toe?: Toe;
  hole?: Hole;
  hammerOn?: HammerOn;
  upBow?: UpBow;
  downBow?: DownBow;
  fret?: Fret;
  tap?: Tap;
  pullOff?: PullOff;
  handbell?: Handbell;
  bend?: Bend;
  thumbPosition?: ThumbPosition;
  stopped?: Stopped;
  pluck?: Pluck;
  doubleTongue?: DoubleTongue;
  string?: String;
  openString?: OpenString;
  fingernails?: Fingernails;
  arrow?: Arrow;
  harmonic?: Harmonic;
  heel?: Heel;
  otherTechnical?: OtherTechnical;
  snapPizzicato?: SnapPizzicato;
  fingering?: Fingering;
}

function xmlToTechnical(node: Element) {
  let ret: Technical = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "triple-tongue") {
      let dataTripleTongue = xmlToTripleTongue(ch);
      ret.tripleTongue = dataTripleTongue;
    }
    if (ch.nodeName === "toe") {
      let dataToe = xmlToToe(ch);
      ret.toe = dataToe;
    }
    if (ch.nodeName === "hole") {
      let dataHole = xmlToHole(ch);
      ret.hole = dataHole;
    }
    if (ch.nodeName === "hammer-on") {
      let dataHammerOn = xmlToHammerOn(ch);
      ret.hammerOn = dataHammerOn;
    }
    if (ch.nodeName === "up-bow") {
      let dataUpBow = xmlToUpBow(ch);
      ret.upBow = dataUpBow;
    }
    if (ch.nodeName === "down-bow") {
      let dataDownBow = xmlToDownBow(ch);
      ret.downBow = dataDownBow;
    }
    if (ch.nodeName === "fret") {
      let dataFret = xmlToFret(ch);
      ret.fret = dataFret;
    }
    if (ch.nodeName === "tap") {
      let dataTap = xmlToTap(ch);
      ret.tap = dataTap;
    }
    if (ch.nodeName === "pull-off") {
      let dataPullOff = xmlToPullOff(ch);
      ret.pullOff = dataPullOff;
    }
    if (ch.nodeName === "handbell") {
      let dataHandbell = xmlToHandbell(ch);
      ret.handbell = dataHandbell;
    }
    if (ch.nodeName === "bend") {
      let dataBend = xmlToBend(ch);
      ret.bend = dataBend;
    }
    if (ch.nodeName === "thumb-position") {
      let dataThumbPosition = xmlToThumbPosition(ch);
      ret.thumbPosition = dataThumbPosition;
    }
    if (ch.nodeName === "stopped") {
      let dataStopped = xmlToStopped(ch);
      ret.stopped = dataStopped;
    }
    if (ch.nodeName === "pluck") {
      let dataPluck = xmlToPluck(ch);
      ret.pluck = dataPluck;
    }
    if (ch.nodeName === "double-tongue") {
      let dataDoubleTongue = xmlToDoubleTongue(ch);
      ret.doubleTongue = dataDoubleTongue;
    }
    if (ch.nodeName === "string") {
      let dataString = xmlToString(ch);
      ret.string = dataString;
    }
    if (ch.nodeName === "open-string") {
      let dataOpenString = xmlToOpenString(ch);
      ret.openString = dataOpenString;
    }
    if (ch.nodeName === "fingernails") {
      let dataFingernails = xmlToFingernails(ch);
      ret.fingernails = dataFingernails;
    }
    if (ch.nodeName === "arrow") {
      let dataArrow = xmlToArrow(ch);
      ret.arrow = dataArrow;
    }
    if (ch.nodeName === "harmonic") {
      let dataHarmonic = xmlToHarmonic(ch);
      ret.harmonic = dataHarmonic;
    }
    if (ch.nodeName === "heel") {
      let dataHeel = xmlToHeel(ch);
      ret.heel = dataHeel;
    }
    if (ch.nodeName === "other-technical") {
      let dataOtherTechnical = xmlToOtherTechnical(ch);
      ret.otherTechnical = dataOtherTechnical;
    }
    if (ch.nodeName === "snap-pizzicato") {
      let dataSnapPizzicato = xmlToSnapPizzicato(ch);
      ret.snapPizzicato = dataSnapPizzicato;
    }
    if (ch.nodeName === "fingering") {
      let dataFingering = xmlToFingering(ch);
      ret.fingering = dataFingering;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The up-bow element represents the symbol that is used both
 * for up-bowing on bowed instruments, and up-stroke on plucked
 * instruments.
 */
export interface UpBow extends PrintStyle, Placement {
  _snapshot?: UpBow;
}

function xmlToUpBow(node: Element) {
  let ret: UpBow = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The down-bow element represents the symbol that is used both
 * for down-bowing on bowed instruments, and down-stroke on
 * plucked instruments.
 */
export interface DownBow extends PrintStyle, Placement {
  _snapshot?: DownBow;
}

function xmlToDownBow(node: Element) {
  let ret: DownBow = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The harmonic element indicates natural and artificial
 * harmonics. Natural harmonics usually notate the base
 * pitch rather than the sounding pitch. Allowing the type
 * of pitch to be specified, combined with controls for
 * appearance/playback differences, allows both the notation
 * and the sound to be represented. Artificial harmonics can
 * add a notated touching-pitch; the pitch or fret at which
 * the string is touched lightly to produce the harmonic.
 * Artificial pinch harmonics will usually not notate a
 * touching pitch. The attributes for the harmonic element
 * refer to the use of the circular harmonic symbol, typically
 * but not always used with natural harmonics.
 */
export interface Harmonic extends PrintObject, PrintStyle, Placement {
  _snapshot?: Harmonic;
  artificial: boolean;
  touchingPitch: boolean;
  soundingPitch: boolean;
  natural: boolean;
  basePitch: boolean;
}

function xmlToHarmonic(node: Element) {
  let ret: Harmonic = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "artificial") {
      let dataArtificial = true;
      ret.artificial = dataArtificial;
    }
    if (ch.nodeName === "touching-pitch") {
      let dataTouchingPitch = true;
      ret.touchingPitch = dataTouchingPitch;
    }
    if (ch.nodeName === "sounding-pitch") {
      let dataSoundingPitch = true;
      ret.soundingPitch = dataSoundingPitch;
    }
    if (ch.nodeName === "natural") {
      let dataNatural = true;
      ret.natural = dataNatural;
    }
    if (ch.nodeName === "base-pitch") {
      let dataBasePitch = true;
      ret.basePitch = dataBasePitch;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The open-string element represents the zero-shaped
 * open string symbol.
 */
export interface OpenString extends PrintStyle, Placement {
  _snapshot?: OpenString;
}

function xmlToOpenString(node: Element) {
  let ret: OpenString = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The thumb-position element represents the thumb position
 * symbol. This is a circle with a line, where the line does
 * not come within the circle. It is distinct from the snap
 * pizzicato symbol, where the line comes inside the circle.
 */
export interface ThumbPosition extends PrintStyle, Placement {
  _snapshot?: ThumbPosition;
}

function xmlToThumbPosition(node: Element) {
  let ret: ThumbPosition = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The pluck element is used to specify the plucking fingering
 * on a fretted instrument, where the fingering element refers
 * to the fretting fingering. Typical values are p, i, m, a for
 * pulgar/thumb, indicio/index, medio/middle, and anular/ring
 * fingers.
 */
export interface Pluck extends PrintStyle, Placement {
  _snapshot?: Pluck;
  data: string;
}

function xmlToPluck(node: Element) {
  let ret: Pluck = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The double-tongue element represents the double tongue symbol
 * (two dots arranged horizontally).
 */
export interface DoubleTongue extends PrintStyle, Placement {
  _snapshot?: DoubleTongue;
}

function xmlToDoubleTongue(node: Element) {
  let ret: DoubleTongue = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The triple-tongue element represents the triple tongue symbol
 * (three dots arranged horizontally).
 */
export interface TripleTongue extends PrintStyle, Placement {
  _snapshot?: TripleTongue;
}

function xmlToTripleTongue(node: Element) {
  let ret: TripleTongue = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The stopped element represents the stopped symbol, which looks
 * like a plus sign.
 */
export interface Stopped extends PrintStyle, Placement {
  _snapshot?: Stopped;
}

function xmlToStopped(node: Element) {
  let ret: Stopped = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The snap-pizzicato element represents the snap pizzicato
 * symbol. This is a circle with a line, where the line comes
 * inside the circle. It is distinct from the thumb-position
 * symbol, where the line does not come inside the circle.
 */
export interface SnapPizzicato extends PrintStyle, Placement {
  _snapshot?: SnapPizzicato;
}

function xmlToSnapPizzicato(node: Element) {
  let ret: SnapPizzicato = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The hammer-on and pull-off elements are used in guitar
 * and fretted instrument notation. Since a single slur
 * can be marked over many notes, the hammer-on and pull-off
 * elements are separate so the individual pair of notes can
 * be specified. The element content can be used to specify
 * how the hammer-on or pull-off should be notated. An empty
 * element leaves this choice up to the application.
 */
export interface HammerOn extends PrintStyle, Placement {
  _snapshot?: HammerOn;
  number?: number;
  type: StartStop;
  data?: string;
}

function xmlToHammerOn(node: Element) {
  let ret: HammerOn = <any>{};
  let foundNumber_ = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
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

/**
 * The hammer-on and pull-off elements are used in guitar
 * and fretted instrument notation. Since a single slur
 * can be marked over many notes, the hammer-on and pull-off
 * elements are separate so the individual pair of notes can
 * be specified. The element content can be used to specify
 * how the hammer-on or pull-off should be notated. An empty
 * element leaves this choice up to the application.
 */
export interface PullOff extends PrintStyle, Placement {
  _snapshot?: PullOff;
  number?: number;
  type: StartStop;
  data?: string;
}

function xmlToPullOff(node: Element) {
  let ret: PullOff = <any>{};
  let foundNumber_ = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
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

/**
 * The bend element is used in guitar and tablature. The
 * bend-alter element indicates the number of steps in the
 * bend, similar to the alter element. As with the alter
 * element, numbers like 0.5 can be used to indicate
 * microtones. Negative numbers indicate pre-bends or
 * releases; the pre-bend and release elements are used
 * to distinguish what is intended. A with-bar element
 * indicates that the bend is to be done at the bridge
 * with a whammy or vibrato bar. The content of the
 * element indicates how this should be notated.
 */
export interface Bend extends PrintStyle, BendSound {
  _snapshot?: Bend;
  bendAlter: string;
  withBar?: WithBar;
  preBend: boolean;
  release: boolean;
}

function xmlToBend(node: Element) {
  let ret: Bend = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundAccelerate = false;
  let foundBeats = false;
  let foundLastBeat = false;
  let foundFirstBeat = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "bend-alter") {
      let dataBendAlter = getString(ch, true);
      ret.bendAlter = dataBendAlter;
    }
    if (ch.nodeName === "with-bar") {
      let dataWithBar = xmlToWithBar(ch);
      ret.withBar = dataWithBar;
    }
    if (ch.nodeName === "pre-bend") {
      let dataPreBend = true;
      ret.preBend = dataPreBend;
    }
    if (ch.nodeName === "release") {
      let dataRelease = true;
      ret.release = dataRelease;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "accelerate") {
      let dataAccelerate = xmlToYesNo(ch2);
      ret.accelerate = dataAccelerate;
      foundAccelerate = true;
    }
    if (ch2.name === "beats") {
      let dataBeats = getNumber(ch2, true);
      ret.beats = dataBeats;
      foundBeats = true;
    }
    if (ch2.name === "last-beat") {
      let dataLastBeat = getNumber(ch2, true);
      ret.lastBeat = dataLastBeat;
      foundLastBeat = true;
    }
    if (ch2.name === "first-beat") {
      let dataFirstBeat = getNumber(ch2, true);
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

/**
 * The bend element is used in guitar and tablature. The
 * bend-alter element indicates the number of steps in the
 * bend, similar to the alter element. As with the alter
 * element, numbers like 0.5 can be used to indicate
 * microtones. Negative numbers indicate pre-bends or
 * releases; the pre-bend and release elements are used
 * to distinguish what is intended. A with-bar element
 * indicates that the bend is to be done at the bridge
 * with a whammy or vibrato bar. The content of the
 * element indicates how this should be notated.
 */
export interface WithBar extends PrintStyle, Placement {
  _snapshot?: WithBar;
  data: string;
}

function xmlToWithBar(node: Element) {
  let ret: WithBar = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The tap element indicates a tap on the fretboard. The
 * element content allows specification of the notation;
 * + and T are common choices. If empty, the display is
 * application-specific.
 */
export interface Tap extends PrintStyle, Placement {
  _snapshot?: Tap;
  data: string;
}

function xmlToTap(node: Element) {
  let ret: Tap = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The heel and toe element are used with organ pedals. The
 * substitution value is "no" if the attribute is not present.
 */
export interface Heel extends PrintStyle, Placement {
  _snapshot?: Heel;
  substitution?: boolean;
}

function xmlToHeel(node: Element) {
  let ret: Heel = <any>{};
  let foundSubstitution = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "substitution") {
      let dataSubstitution = xmlToYesNo(ch2);
      ret.substitution = dataSubstitution;
      foundSubstitution = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The heel and toe element are used with organ pedals. The
 * substitution value is "no" if the attribute is not present.
 */
export interface Toe extends PrintStyle, Placement {
  _snapshot?: Toe;
  substitution?: boolean;
}

function xmlToToe(node: Element) {
  let ret: Toe = <any>{};
  let foundSubstitution = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "substitution") {
      let dataSubstitution = xmlToYesNo(ch2);
      ret.substitution = dataSubstitution;
      foundSubstitution = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The fingernails element is used in notation for harp and
 * other plucked string instruments.
 */
export interface Fingernails extends PrintStyle, Placement {
  _snapshot?: Fingernails;
}

function xmlToFingernails(node: Element) {
  let ret: Fingernails = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The hole element represents the symbols used for woodwind
 * and brass fingerings as well as other notations. The content
 * of the optional hole-type element indicates what the hole
 * symbol represents in terms of instrument fingering or other
 * techniques. The hole-closed element represents whether the
 * hole is closed, open, or half-open. Valid element values are
 * yes, no, and half. The optional location attribute indicates
 * which portion of the hole is filled in when the element value
 * is half. The optional hole-shape element indicates the shape
 * of the hole symbol; the default is a circle.
 */
export interface Hole extends PrintStyle, Placement {
  _snapshot?: Hole;
  holeClosed: HoleClosed;
  holeShape: string;
  holeType?: string;
}

function xmlToHole(node: Element) {
  let ret: Hole = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "hole-closed") {
      let dataHoleClosed = xmlToHoleClosed(ch);
      ret.holeClosed = dataHoleClosed;
    }
    if (ch.nodeName === "hole-shape") {
      let dataHoleShape = getString(ch, true);
      ret.holeShape = dataHoleShape;
    }
    if (ch.nodeName === "hole-type") {
      let dataHoleType = getString(ch, true);
      ret.holeType = dataHoleType;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export enum HoleLocation {
  Right = 0,
  Top = 3,
  Bottom = 1,
  Left = 2,
}

function getHoleLocation(node: Node, fallbackVal?: HoleLocation) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

export enum HoleClosedType {
  No = 1,
  Yes = 0,
  Half = 2,
}

function getHoleClosedType(node: Node, fallbackVal?: HoleClosedType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The hole element represents the symbols used for woodwind
 * and brass fingerings as well as other notations. The content
 * of the optional hole-type element indicates what the hole
 * symbol represents in terms of instrument fingering or other
 * techniques. The hole-closed element represents whether the
 * hole is closed, open, or half-open. Valid element values are
 * yes, no, and half. The optional location attribute indicates
 * which portion of the hole is filled in when the element value
 * is half. The optional hole-shape element indicates the shape
 * of the hole symbol; the default is a circle.
 */
export interface HoleClosed {
  _snapshot?: HoleClosed;
  location?: HoleLocation;
  data: HoleClosedType;
}

function xmlToHoleClosed(node: Element) {
  let ret: HoleClosed = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "location") {
      let dataLocation = getHoleLocation(ch2, null);
      ret.location = dataLocation;
    }
  }
  let ch3 = node;
  let dataData = getHoleClosedType(ch3, null);
  ret.data = dataData;
  return ret;
}

/**
 * The arrow element represents an arrow used for a musical
 * technical indication. Straight arrows are represented with
 * an arrow-direction element and an optional arrow-style
 * element. Circular arrows are represented with a
 * circular-arrow element. Descriptive values use Unicode
 * arrow terminology.
 *
 * Values for the arrow-direction element are left, up, right,
 * down, northwest, northeast, southeast, southwest, left right,
 * up down, northwest southeast, northeast southwest, and other.
 *
 * Values for the arrow-style element are single, double,
 * filled, hollow, paired, combined, and other. Filled and
 * hollow arrows indicate polygonal single arrows. Paired
 * arrows are duplicate single arrows in the same direction.
 * Combined arrows apply to double direction arrows like
 * left right, indicating that an arrow in one direction
 * should be combined with an arrow in the other direction.
 *
 * Values for the circular-arrow element are clockwise and
 * anticlockwise.
 */
export interface Arrow extends PrintStyle, Placement {
  _snapshot?: Arrow;
  arrowStyle?: string;
  arrowDirection?: string;
  circularArrow?: string;
}

function xmlToArrow(node: Element) {
  let ret: Arrow = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "arrow-style") {
      let dataArrowStyle = getString(ch, true);
      ret.arrowStyle = dataArrowStyle;
    }
    if (ch.nodeName === "arrow-direction") {
      let dataArrowDirection = getString(ch, true);
      ret.arrowDirection = dataArrowDirection;
    }
    if (ch.nodeName === "circular-arrow") {
      let dataCircularArrow = getString(ch, true);
      ret.circularArrow = dataCircularArrow;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The handbell element represents notation for letious
 * techniques used in handbell and handchime music. Valid
 * values are damp, echo, gyro, hand martellato, mallet lift,
 * mallet table, martellato, martellato lift,
 * muted martellato, pluck lift, and swing.
 */
export interface Handbell extends PrintStyle, Placement {
  _snapshot?: Handbell;
  data: string;
}

function xmlToHandbell(node: Element) {
  let ret: Handbell = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The other-technical element is used to define any technical
 * indications not yet in the MusicXML format. This allows
 * extended representation, though without application
 * interoperability.
 */
export interface OtherTechnical extends PrintStyle, Placement {
  _snapshot?: OtherTechnical;
  data: string;
}

function xmlToOtherTechnical(node: Element) {
  let ret: OtherTechnical = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * Articulations and accents are grouped together here.
 */
export interface Articulations {
  _snapshot?: Articulations;
  accent?: Accent;
  doit?: Doit;
  breathMark?: BreathMark;
  otherArticulations?: OtherArticulation[];
  detachedLegato?: DetachedLegato;
  staccatissimo?: Staccatissimo;
  plop?: Plop;
  unstress?: Unstress;
  strongAccent?: StrongAccent;
  staccato?: Staccato;
  spiccato?: Spiccato;
  scoop?: Scoop;
  falloff?: Falloff;
  caesura?: Caesura;
  stress?: Stress;
  tenuto?: Tenuto;
}

function xmlToArticulations(node: Element) {
  let ret: Articulations = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "accent") {
      let dataAccent = xmlToAccent(ch);
      ret.accent = dataAccent;
    }
    if (ch.nodeName === "doit") {
      let dataDoit = xmlToDoit(ch);
      ret.doit = dataDoit;
    }
    if (ch.nodeName === "breath-mark") {
      let dataBreathMark = xmlToBreathMark(ch);
      ret.breathMark = dataBreathMark;
    }
    if (ch.nodeName === "other-articulation") {
      let dataOtherArticulations = xmlToOtherArticulation(ch);
      ret.otherArticulations = (ret.otherArticulations || []).concat(
        dataOtherArticulations
      );
    }
    if (ch.nodeName === "detached-legato") {
      let dataDetachedLegato = xmlToDetachedLegato(ch);
      ret.detachedLegato = dataDetachedLegato;
    }
    if (ch.nodeName === "staccatissimo") {
      let dataStaccatissimo = xmlToStaccatissimo(ch);
      ret.staccatissimo = dataStaccatissimo;
    }
    if (ch.nodeName === "plop") {
      let dataPlop = xmlToPlop(ch);
      ret.plop = dataPlop;
    }
    if (ch.nodeName === "unstress") {
      let dataUnstress = xmlToUnstress(ch);
      ret.unstress = dataUnstress;
    }
    if (ch.nodeName === "strong-accent") {
      let dataStrongAccent = xmlToStrongAccent(ch);
      ret.strongAccent = dataStrongAccent;
    }
    if (ch.nodeName === "staccato") {
      let dataStaccato = xmlToStaccato(ch);
      ret.staccato = dataStaccato;
    }
    if (ch.nodeName === "spiccato") {
      let dataSpiccato = xmlToSpiccato(ch);
      ret.spiccato = dataSpiccato;
    }
    if (ch.nodeName === "scoop") {
      let dataScoop = xmlToScoop(ch);
      ret.scoop = dataScoop;
    }
    if (ch.nodeName === "falloff") {
      let dataFalloff = xmlToFalloff(ch);
      ret.falloff = dataFalloff;
    }
    if (ch.nodeName === "caesura") {
      let dataCaesura = xmlToCaesura(ch);
      ret.caesura = dataCaesura;
    }
    if (ch.nodeName === "stress") {
      let dataStress = xmlToStress(ch);
      ret.stress = dataStress;
    }
    if (ch.nodeName === "tenuto") {
      let dataTenuto = xmlToTenuto(ch);
      ret.tenuto = dataTenuto;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface Accent extends PrintStyle, Placement {
  _snapshot?: Accent;
}

function xmlToAccent(node: Element) {
  let ret: Accent = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export interface StrongAccent extends PrintStyle, Placement {
  _snapshot?: StrongAccent;
  type?: UpDown;
}

function xmlToStrongAccent(node: Element) {
  let ret: StrongAccent = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  let foundType = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataType = getUpDown(ch2, UpDown.Up);
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

/**
 * The staccato element is used for a dot articulation, as
 * opposed to a stroke or a wedge.
 */
export interface Staccato extends PrintStyle, Placement {
  _snapshot?: Staccato;
}

function xmlToStaccato(node: Element) {
  let ret: Staccato = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export interface Tenuto extends PrintStyle, Placement {
  _snapshot?: Tenuto;
}

function xmlToTenuto(node: Element) {
  let ret: Tenuto = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export interface DetachedLegato extends PrintStyle, Placement {
  _snapshot?: DetachedLegato;
}

function xmlToDetachedLegato(node: Element) {
  let ret: DetachedLegato = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The staccatissimo element is used for a wedge articulation,
 * as opposed to a dot or a stroke.
 */
export interface Staccatissimo extends PrintStyle, Placement {
  _snapshot?: Staccatissimo;
}

function xmlToStaccatissimo(node: Element) {
  let ret: Staccatissimo = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The spiccato element is used for a stroke articulation, as
 * opposed to a dot or a wedge.
 */
export interface Spiccato extends PrintStyle, Placement {
  _snapshot?: Spiccato;
}

function xmlToSpiccato(node: Element) {
  let ret: Spiccato = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The scoop, plop, doit, and falloff elements are
 * indeterminate slides attached to a single note.
 * Scoops and plops come before the main note, coming
 * from below and above the pitch, respectively. Doits
 * and falloffs come after the main note, going above
 * and below the pitch, respectively.
 */
export interface Scoop
  extends LineShape,
    LineType,
    DashedFormatting,
    PrintStyle,
    Placement {
  _snapshot?: Scoop;
}

function xmlToScoop(node: Element) {
  let ret: Scoop = <any>{};
  let foundLineShape = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The scoop, plop, doit, and falloff elements are
 * indeterminate slides attached to a single note.
 * Scoops and plops come before the main note, coming
 * from below and above the pitch, respectively. Doits
 * and falloffs come after the main note, going above
 * and below the pitch, respectively.
 */
export interface Plop
  extends LineShape,
    LineType,
    DashedFormatting,
    PrintStyle,
    Placement {
  _snapshot?: Plop;
}

function xmlToPlop(node: Element) {
  let ret: Plop = <any>{};
  let foundLineShape = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The scoop, plop, doit, and falloff elements are
 * indeterminate slides attached to a single note.
 * Scoops and plops come before the main note, coming
 * from below and above the pitch, respectively. Doits
 * and falloffs come after the main note, going above
 * and below the pitch, respectively.
 */
export interface Doit
  extends LineShape,
    LineType,
    DashedFormatting,
    PrintStyle,
    Placement {
  _snapshot?: Doit;
}

function xmlToDoit(node: Element) {
  let ret: Doit = <any>{};
  let foundLineShape = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The scoop, plop, doit, and falloff elements are
 * indeterminate slides attached to a single note.
 * Scoops and plops come before the main note, coming
 * from below and above the pitch, respectively. Doits
 * and falloffs come after the main note, going above
 * and below the pitch, respectively.
 */
export interface Falloff
  extends LineShape,
    LineType,
    DashedFormatting,
    PrintStyle,
    Placement {
  _snapshot?: Falloff;
}

function xmlToFalloff(node: Element) {
  let ret: Falloff = <any>{};
  let foundLineShape = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export enum BreathMarkType {
  Empty = 2,
  Comma = 0,
  Tick = 1,
}

function getBreathMarkType(node: Node, fallbackVal?: BreathMarkType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The breath-mark element may have a text value to
 * indicate the symbol used for the mark. Valid values are
 * comma, tick, and an empty string.
 */
export interface BreathMark
  extends LineShape,
    LineType,
    DashedFormatting,
    PrintStyle,
    Placement {
  _snapshot?: BreathMark;
  type: BreathMarkType;
}

function xmlToBreathMark(node: Element) {
  let ret: BreathMark = <any>{};
  let foundLineShape = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line-shape") {
      let dataLineShape = getStraightCurved(ch2, StraightCurved.Straight);
      ret.lineShape = dataLineShape;
      foundLineShape = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataType = getBreathMarkType(ch3, null);
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

export interface Caesura extends PrintStyle, Placement {
  _snapshot?: Caesura;
}

function xmlToCaesura(node: Element) {
  let ret: Caesura = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export interface Stress extends PrintStyle, Placement {
  _snapshot?: Stress;
}

function xmlToStress(node: Element) {
  let ret: Stress = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

export interface Unstress extends PrintStyle, Placement {
  _snapshot?: Unstress;
}

function xmlToUnstress(node: Element) {
  let ret: Unstress = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
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

/**
 * The other-articulation element is used to define any
 * articulations not yet in the MusicXML format. This allows
 * extended representation, though without application
 * interoperability.
 */
export interface OtherArticulation extends PrintStyle, Placement {
  _snapshot?: OtherArticulation;
  data: string;
}

function xmlToOtherArticulation(node: Element) {
  let ret: OtherArticulation = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The arpeggiate element indicates that this note is part of
 * an arpeggiated chord. The number attribute can be used to
 * distinguish between two simultaneous chords arpeggiated
 * separately (different numbers) or together (same number).
 * The up-down attribute is used if there is an arrow on the
 * arpeggio sign. By default, arpeggios go from the lowest to
 * highest note.
 */
export interface Arpeggiate extends Position, Placement, Color {
  _snapshot?: Arpeggiate;
  number?: number;
  direction?: UpDown;
}

function xmlToArpeggiate(node: Element) {
  let ret: Arpeggiate = <any>{};
  let foundNumber_ = false;
  let foundPlacement = false;
  let foundColor = false;
  let foundDirection = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "direction") {
      let dataDirection = getUpDown(ch2, UpDown.Up);
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

/**
 * The non-arpeggiate element indicates that this note is at
 * the top or bottom of a bracket indicating to not arpeggiate
 * these notes. Since this does not involve playback, it is
 * only used on the top or bottom notes, not on each note
 * as for the arpeggiate element.
 */
export interface NonArpeggiate extends Position, Placement, Color {
  _snapshot?: NonArpeggiate;
  number?: number;
  type: TopBottom;
}

function xmlToNonArpeggiate(node: Element) {
  let ret: NonArpeggiate = <any>{};
  let foundNumber_ = false;
  let foundPlacement = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getTopBottom(ch2, null);
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

/**
 * Humming and laughing representations are taken from
 * Humdrum.
 */
export interface Laughing {
  _snapshot?: Laughing;
  _class?: string;
}

function xmlToLaughing(node: Element) {
  let ret: Laughing = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "Laughing";
  return ret;
}

/**
 * Humming and laughing representations are taken from
 * Humdrum.
 */
export interface Humming {
  _snapshot?: Humming;
  _class?: string;
}

function xmlToHumming(node: Element) {
  let ret: Humming = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "Humming";
  return ret;
}

/**
 * The end-line and end-paragraph elements come
 * from RP-017 for Standard MIDI File Lyric meta-events;
 * they help facilitate lyric display for Karaoke and
 * similar applications.
 */
export interface EndLine {
  _snapshot?: EndLine;
  _class?: string;
}

function xmlToEndLine(node: Element) {
  let ret: EndLine = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "EndLine";
  return ret;
}

/**
 * The end-line and end-paragraph elements come
 * from RP-017 for Standard MIDI File Lyric meta-events;
 * they help facilitate lyric display for Karaoke and
 * similar applications.
 */
export interface EndParagraph {
  _snapshot?: EndParagraph;
  _class?: string;
}

function xmlToEndParagraph(node: Element) {
  let ret: EndParagraph = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "EndParagraph";
  return ret;
}

/**
 * Fake element containing ordered content. Children of lyric-parts are actually children of lyric. See lyric.
 */
export interface LyricParts {
  _snapshot?: LyricParts;
}

function xmlToLyricParts(node: Element) {
  let rarr: any[] = [];
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "extend") {
      let data: any = xmlToExtend(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "end-line") {
      let data: any = xmlToEndLine(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "syllabic") {
      let data: any = xmlToSyllabic(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "text") {
      let data: any = xmlToText(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "laughing") {
      let data: any = xmlToLaughing(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "humming") {
      let data: any = xmlToHumming(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "end-paragraph") {
      let data: any = xmlToEndParagraph(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "elision") {
      let data: any = xmlToElision(ch);
      rarr = (rarr || []).concat(data);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return rarr;
}

/**
 * Text underlays for lyrics, based on Humdrum with support
 * for other formats.
 *
 * IMPORTANT: <lyric-parts> is fake. All children of lyric-parts
 * are actually children of lyric. This is a construct invented by
 * musicxml-interfaces for separating ordered and unordered
 * content.
 *
 * Language names for text elements come from ISO 639,
 * with optional country subcodes from ISO 3166. muiscxml-interfaces
 * currently ignores this field.
 *
 * Justification is center by default; placement is
 * below by default. The print-object attribute can override
 * a note's print-lyric attribute in cases where only some
 * lyrics on a note are printed, as when lyrics for later verses
 * are printed in a block of text rather than with each note.
 *
 */
export interface Lyric
  extends Justify,
    Position,
    Placement,
    Color,
    PrintObject,
    Editorial {
  _snapshot?: Lyric;
  lyricParts: any[];
  number?: number;
  name?: string;
}

export interface Text
  extends Font,
    Color,
    TextDecoration,
    TextRotation,
    LetterSpacing,
    TextDirection {
  _snapshot?: Text;
  data: string;
  _class?: string;
}

function xmlToText(node: Element) {
  let ret: Text = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundDir = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export enum SyllabicType {
  Single = 0,
  Begin = 1,
  Middle = 3,
  End = 2,
}

function getSyllabicType(node: Node, fallbackVal?: SyllabicType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Hyphenation is indicated by the syllabic element, which can be single,
 * begin, end, or middle. These represent single-syllable
 * words, word-beginning syllables, word-ending syllables,
 * and mid-word syllables.
 */
export interface Syllabic extends Font, Color {
  _snapshot?: Syllabic;
  data: SyllabicType;
  _class?: string;
}

function xmlToSyllabic(node: Element) {
  let ret: Syllabic = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getSyllabicType(ch3, null);
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

/**
 * Multiple syllables on a single note are separated by elision
 * elements. A hyphen in the text element should only be used
 * for an actual hyphenated word. Two text elements that are
 * not separated by an elision element are part of the same
 * syllable, but may have different text formatting.
 *
 * The elision element text specifies the symbol used to
 * display the elision. Common values are a no-break space
 * (Unicode 00A0), an underscore (Unicode 005F), or an undertie
 * (Unicode 203F).
 */
export interface Elision extends Font, Color {
  _snapshot?: Elision;
  data: string;
  _class?: string;
}

function xmlToElision(node: Element) {
  let ret: Elision = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * Word extensions are represented using the extend element.
 *
 * The extend element represents lyric word extension /
 * melisma lines as well as figured bass extensions. The
 * optional type and position attributes are added in
 * Version 3.0 to provide better formatting control.
 */
export interface Extend extends PrintStyle {
  _snapshot?: Extend;
  type?: StartStopContinue;
  _class?: string;
}

function xmlToExtend(node: Element) {
  let ret: Extend = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundType = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopContinue(ch2, StartStopContinue.Start);
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

/**
 * Figured bass elements take their position from the first
 * regular note (not a grace note or chord note) that follows
 * in score order. The optional duration element is used to
 * indicate changes of figures under a note.
 *
 * Figures are ordered from top to bottom. A figure-number is a
 * number. Values for prefix and suffix include the accidental
 * values sharp, flat, natural, double-sharp, flat-flat, and
 * sharp-sharp. Suffixes include both symbols that come after
 * the figure number and those that overstrike the figure number.
 * The suffix value slash is used for slashed numbers indicating
 * chromatic alteration. The orientation and display of the slash
 * usually depends on the figure number. The prefix and suffix
 * elements may contain additional values for symbols specific
 * to particular figured bass styles. The value of parentheses
 * is "no" if not present.
 */
export interface FiguredBass extends Editorial, PrintStyle, Printout {
  _snapshot?: FiguredBass;
  figures: Figure[];
  duration?: number;
  parentheses?: boolean;
}

function xmlToFiguredBass(node: Element) {
  let ret: FiguredBass = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPrintObject = false;
  let foundPrintSpacing = false;
  let foundParentheses = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "figure") {
      let dataFigures = xmlToFigure(ch);
      ret.figures = (ret.figures || []).concat(dataFigures);
    }
    if (ch.nodeName === "duration") {
      let dataDuration = getNumber(ch, true);
      ret.duration = dataDuration;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-dot") {
      let dataPrintDot = xmlToYesNo(ch2);
      ret.printDot = dataPrintDot;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "print-spacing") {
      let dataPrintSpacing = xmlToYesNo(ch2);
      ret.printSpacing = dataPrintSpacing;
      foundPrintSpacing = true;
    }
    if (ch2.name === "print-lyric") {
      let dataPrintLyric = xmlToYesNo(ch2);
      ret.printLyric = dataPrintLyric;
    }
    if (ch2.name === "parentheses") {
      let dataParentheses = xmlToYesNo(ch2);
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

export interface Figure extends PrintStyle {
  _snapshot?: Figure;
  prefix?: Prefix;
  figureNumber?: FigureNumber;
  extend?: Extend;
  suffix?: Suffix;
}

function xmlToFigure(node: Element) {
  let ret: Figure = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "prefix") {
      let dataPrefix = xmlToPrefix(ch);
      ret.prefix = dataPrefix;
    }
    if (ch.nodeName === "figure-number") {
      let dataFigureNumber = xmlToFigureNumber(ch);
      ret.figureNumber = dataFigureNumber;
    }
    if (ch.nodeName === "extend") {
      let dataExtend = xmlToExtend(ch);
      ret.extend = dataExtend;
    }
    if (ch.nodeName === "suffix") {
      let dataSuffix = xmlToSuffix(ch);
      ret.suffix = dataSuffix;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
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

export interface Prefix extends PrintStyle {
  _snapshot?: Prefix;
  data: string;
}

function xmlToPrefix(node: Element) {
  let ret: Prefix = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface FigureNumber extends PrintStyle {
  _snapshot?: FigureNumber;
  data: string;
}

function xmlToFigureNumber(node: Element) {
  let ret: FigureNumber = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface Suffix extends PrintStyle {
  _snapshot?: Suffix;
  data: string;
}

function xmlToSuffix(node: Element) {
  let ret: Suffix = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The backup and forward elements are required to coordinate
 * multiple voices in one part, including music on multiple
 * staves.
 *
 * The backup element is generally used to
 * move between voices and staves. Thus the backup element
 * does not include voice or staff elements. Duration values
 * should always be positive, and should not cross measure
 * boundaries or mid-measure changes in the divisions value.
 */
export interface Backup extends Editorial {
  _snapshot?: Backup;
  duration: number;
}

function xmlToBackup(node: Element) {
  let ret: Backup = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "duration") {
      let dataDuration = getNumber(ch, true);
      ret.duration = dataDuration;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "Backup";
  return ret;
}

/**
 * The backup and forward elements are required to coordinate
 * multiple voices in one part, including music on multiple
 * staves.
 *
 * The forward element is generally used within voices
 * and staves. Duration values should always be positive, and
 * should not cross measure boundaries or mid-measure changes
 * in the divisions value.
 */
export interface Forward extends EditorialVoice {
  _snapshot?: Forward;
  duration: number;
  staff?: number;
}

function xmlToForward(node: Element) {
  let ret: Forward = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "voice") {
      let dataVoice = getNumber(ch, true);
      ret.voice = dataVoice;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "duration") {
      let dataDuration = getNumber(ch, true);
      ret.duration = dataDuration;
    }
    if (ch.nodeName === "staff") {
      let dataStaff = getNumber(ch, true);
      ret.staff = dataStaff;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  ret._class = "Forward";
  return ret;
}

export enum BarlineLocation {
  Right = 1,
  Middle = 2,
  Left = 0,
}

function getBarlineLocation(node: Node, fallbackVal?: BarlineLocation) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * If a barline is other than a normal single barline, it
 * should be represented by a barline element that describes
 * it. This includes information about repeats and multiple
 * endings, as well as line style. Barline data is on the same
 * level as the other musical data in a score - a child of a
 * measure in a partwise score, or a part in a timewise score.
 * This allows for barlines within measures, as in dotted
 * barlines that subdivide measures in complex meters. The two
 * fermata elements allow for fermatas on both sides of the
 * barline (the lower one inverted).
 *
 * Barlines have a location attribute to make it easier to
 * process barlines independently of the other musical data
 * in a score. It is often easier to set up measures
 * separately from entering notes. The location attribute
 * must match where the barline element occurs within the
 * rest of the musical data in the score. If location is left,
 * it should be the first element in the measure, aside from
 * the print, bookmark, and link elements. If location is
 * right, it should be the last element, again with the
 * possible exception of the print, bookmark, and link
 * elements. If no location is specified, the right barline
 * is the default. The segno, coda, and divisions attributes
 * work the same way as in the sound element defined in the
 * direction.mod file. They are used for playback when barline
 * elements contain segno or coda child elements.
 */
export interface Barline extends Editorial {
  _snapshot?: Barline;
  segno?: Segno;
  coda?: Coda;
  location?: BarlineLocation;
  codaAttrib?: string;
  wavyLine?: WavyLine;
  fermatas?: Fermata[];
  segnoAttrib?: string;
  divisions?: number;
  barStyle?: BarStyle;
  ending?: Ending;
  repeat?: Repeat;
}

function xmlToBarline(node: Element) {
  let ret: Barline = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "segno") {
      let dataSegno = xmlToSegno(ch);
      ret.segno = dataSegno;
    }
    if (ch.nodeName === "coda") {
      let dataCoda = xmlToCoda(ch);
      ret.coda = dataCoda;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "wavy-line") {
      let dataWavyLine = xmlToWavyLine(ch);
      ret.wavyLine = dataWavyLine;
    }
    if (ch.nodeName === "fermata") {
      let dataFermatas = xmlToFermata(ch);
      ret.fermatas = (ret.fermatas || []).concat(dataFermatas);
    }
    if (ch.nodeName === "bar-style") {
      let dataBarStyle = xmlToBarStyle(ch);
      ret.barStyle = dataBarStyle;
    }
    if (ch.nodeName === "ending") {
      let dataEnding = xmlToEnding(ch);
      ret.ending = dataEnding;
    }
    if (ch.nodeName === "repeat") {
      let dataRepeat = xmlToRepeat(ch);
      ret.repeat = dataRepeat;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "location") {
      let dataLocation = getBarlineLocation(ch2, null);
      ret.location = dataLocation;
    }
    if (ch2.name === "coda") {
      let dataCodaAttrib = getString(ch2, true);
      ret.codaAttrib = dataCodaAttrib;
    }
    if (ch2.name === "segno") {
      let dataSegnoAttrib = getString(ch2, true);
      ret.segnoAttrib = dataSegnoAttrib;
    }
    if (ch2.name === "divisions") {
      let dataDivisions = getNumber(ch2, true);
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
export enum BarStyleType {
  Regular = 0,
  LightHeavy = 5,
  HeavyLight = 6,
  Short = 9,
  None = 10,
  Dashed = 2,
  HeavyHeavy = 7,
  Tick = 8,
  Dotted = 1,
  Heavy = 3,
  LightLight = 4,
}

function getBarStyleType(node: Node, fallbackVal?: BarStyleType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Bar-style contains style information. Choices are
 * regular, dotted, dashed, heavy, light-light,
 * light-heavy, heavy-light, heavy-heavy, tick (a
 * short stroke through the top line), short (a partial
 * barline between the 2nd and 4th lines), and none.
 */
export interface BarStyle extends Color {
  _snapshot?: BarStyle;
  data: BarStyleType;
}

function xmlToBarStyle(node: Element) {
  let ret: BarStyle = <any>{};
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getBarStyleType(ch3, null);
  ret.data = dataData;
  if (!foundColor) {
    ret.color = "#000000";
  }
  return ret;
}

export enum StartStopDiscontinue {
  Discontinue = 2,
  Start = 0,
  Stop = 1,
}

function getStartStopDiscontinue(
  node: Node,
  fallbackVal?: StartStopDiscontinue
) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Endings refers to multiple (e.g. first and second) endings.
 * Typically, the start type is associated with the left
 * barline of the first measure in an ending. The stop and
 * discontinue types are associated with the right barline of
 * the last measure in an ending. Stop is used when the ending
 * mark concludes with a downward jog, as is typical for first
 * endings. Discontinue is used when there is no downward jog,
 * as is typical for second endings that do not conclude a
 * piece. The length of the jog can be specified using the
 * end-length attribute. The text-x and text-y attributes
 * are offsets that specify where the baseline of the start
 * of the ending text appears, relative to the start of the
 * ending line.
 *
 * The number attribute reflects the numeric values of what
 * is under the ending line. Single endings such as "1" or
 * comma-separated multiple endings such as "1, 2" may be
 * used. The ending element text is used when the text
 * displayed in the ending is different than what appears in
 * the number attribute. The print-object element is used to
 * indicate when an ending is present but not printed, as is
 * often the case for many parts in a full score.
 */
export interface Ending extends PrintObject, PrintStyle {
  _snapshot?: Ending;
  endLength: number;
  textX: number;
  number: number;
  textY: number;
  type: StartStopDiscontinue;
  ending?: string;
}

function xmlToEnding(node: Element) {
  let ret: Ending = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "end-length") {
      let dataEndLength = getNumber(ch2, true);
      ret.endLength = dataEndLength;
    }
    if (ch2.name === "text-x") {
      let dataTextX = getNumber(ch2, true);
      ret.textX = dataTextX;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "text-y") {
      let dataTextY = getNumber(ch2, true);
      ret.textY = dataTextY;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopDiscontinue(ch2, null);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataEnding = getString(ch3, false);
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

export enum WingedType {
  None = 0,
  Curved = 2,
  DoubleCurved = 4,
  Straight = 1,
  DoubleStraight = 3,
}

function getWingedType(node: Node, fallbackVal?: WingedType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

export enum DirectionTypeBg {
  Forward = 1,
  Backward = 0,
}

function getDirectionTypeBg(node: Node, fallbackVal?: DirectionTypeBg) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Repeat marks. The start of the repeat has a forward direction
 * while the end of the repeat has a backward direction. Backward
 * repeats that are not part of an ending can use the times
 * attribute to indicate the number of times the repeated section
 * is played. The winged attribute indicates whether the repeat
 * has winged extensions that appear above and below the barline.
 * The straight and curved values represent single wings, while
 * the double-straight and double-curved values represent double
 * wings. The none value indicates no wings and is the default.
 */
export interface Repeat {
  _snapshot?: Repeat;
  times: string;
  winged: WingedType;
  direction: DirectionTypeBg;
}

function xmlToRepeat(node: Element) {
  let ret: Repeat = <any>{};
  let foundWinged = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "times") {
      let dataTimes = getString(ch2, true);
      ret.times = dataTimes;
    }
    if (ch2.name === "winged") {
      let dataWinged = getWingedType(ch2, WingedType.None);
      ret.winged = dataWinged;
      foundWinged = true;
    }
    if (ch2.name === "direction") {
      let dataDirection = getDirectionTypeBg(ch2, null);
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
export enum TipDirection {
  Right = 3,
  Northwest = 4,
  Southwest = 7,
  Down = 1,
  Northeast = 5,
  Southeast = 6,
  Up = 0,
  Left = 2,
}

function getTipDirection(node: Node, fallbackVal?: TipDirection) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * A direction is a musical indication that is not attached
 * to a specific note. Two or more may be combined to
 * indicate starts and stops of wedges, dashes, etc.
 *
 * By default, a series of direction-type elements and a
 * series of child elements of a direction-type within a
 * single direction element follow one another in sequence
 * visually. For a series of direction-type children, non-
 * positional formatting attributes are carried over from
 * the previous element by default.
 */
export interface Direction extends EditorialVoice, Placement, DirectiveEntity {
  _snapshot?: Direction;
  directionTypes: DirectionType[];
  staff?: number;
  offset?: Offset;
  sound?: Sound;
}

function xmlToDirection(node: Element) {
  let ret: Direction = <any>{};
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "voice") {
      let dataVoice = getNumber(ch, true);
      ret.voice = dataVoice;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "direction-type") {
      let dataDirectionTypes = xmlToDirectionType(ch);
      ret.directionTypes = (ret.directionTypes || []).concat(
        dataDirectionTypes
      );
    }
    if (ch.nodeName === "staff") {
      let dataStaff = getNumber(ch, true);
      ret.staff = dataStaff;
    }
    if (ch.nodeName === "offset") {
      let dataOffset = xmlToOffset(ch);
      ret.offset = dataOffset;
    }
    if (ch.nodeName === "sound") {
      let dataSound = xmlToSound(ch);
      ret.sound = dataSound;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "directive") {
      let dataDirective = xmlToYesNo(ch2);
      ret.directive = dataDirective;
    }
  }
  if (!foundPlacement) {
    ret.placement = AboveBelow.Unspecified;
  }
  ret._class = "Direction";
  return ret;
}

/**
 * Textual direction types may have more than 1 component
 * due to multiple fonts. The dynamics element may also be
 * used in the notations element, and is defined in the
 * common.mod file.
 */
export interface DirectionType {
  _snapshot?: DirectionType;
  percussions?: Percussion[];
  rehearsals?: Rehearsal[];
  pedal?: Pedal;
  principalVoice?: PrincipalVoice;
  accordionRegistration?: AccordionRegistration;
  eyeglasses?: Eyeglasses;
  image?: Image;
  harpPedals?: HarpPedals;
  metronome?: Metronome;
  otherDirection?: OtherDirection;
  segnos?: Segno[];
  scordatura?: Scordatura;
  stringMute?: StringMute;
  wedge?: Wedge;
  dashes?: Dashes;
  damp?: Damp;
  bracket?: Bracket;
  dynamics?: Dynamics;
  octaveShift?: OctaveShift;
  words?: Words[];
  dampAll?: DampAll;
  codas?: Coda[];
}

function xmlToDirectionType(node: Element) {
  let ret: DirectionType = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "percussion") {
      let dataPercussions = xmlToPercussion(ch);
      ret.percussions = (ret.percussions || []).concat(dataPercussions);
    }
    if (ch.nodeName === "rehearsal") {
      let dataRehearsals = xmlToRehearsal(ch);
      ret.rehearsals = (ret.rehearsals || []).concat(dataRehearsals);
    }
    if (ch.nodeName === "pedal") {
      let dataPedal = xmlToPedal(ch);
      ret.pedal = dataPedal;
    }
    if (ch.nodeName === "principal-voice") {
      let dataPrincipalVoice = xmlToPrincipalVoice(ch);
      ret.principalVoice = dataPrincipalVoice;
    }
    if (ch.nodeName === "accordion-registration") {
      let dataAccordionRegistration = xmlToAccordionRegistration(ch);
      ret.accordionRegistration = dataAccordionRegistration;
    }
    if (ch.nodeName === "eyeglasses") {
      let dataEyeglasses = xmlToEyeglasses(ch);
      ret.eyeglasses = dataEyeglasses;
    }
    if (ch.nodeName === "image") {
      let dataImage = xmlToImage(ch);
      ret.image = dataImage;
    }
    if (ch.nodeName === "harp-pedals") {
      let dataHarpPedals = xmlToHarpPedals(ch);
      ret.harpPedals = dataHarpPedals;
    }
    if (ch.nodeName === "metronome") {
      let dataMetronome = xmlToMetronome(ch);
      ret.metronome = dataMetronome;
    }
    if (ch.nodeName === "other-direction") {
      let dataOtherDirection = xmlToOtherDirection(ch);
      ret.otherDirection = dataOtherDirection;
    }
    if (ch.nodeName === "segno") {
      let dataSegnos = xmlToSegno(ch);
      ret.segnos = (ret.segnos || []).concat(dataSegnos);
    }
    if (ch.nodeName === "scordatura") {
      let dataScordatura = xmlToScordatura(ch);
      ret.scordatura = dataScordatura;
    }
    if (ch.nodeName === "string-mute") {
      let dataStringMute = xmlToStringMute(ch);
      ret.stringMute = dataStringMute;
    }
    if (ch.nodeName === "wedge") {
      let dataWedge = xmlToWedge(ch);
      ret.wedge = dataWedge;
    }
    if (ch.nodeName === "dashes") {
      let dataDashes = xmlToDashes(ch);
      ret.dashes = dataDashes;
    }
    if (ch.nodeName === "damp") {
      let dataDamp = xmlToDamp(ch);
      ret.damp = dataDamp;
    }
    if (ch.nodeName === "bracket") {
      let dataBracket = xmlToBracket(ch);
      ret.bracket = dataBracket;
    }
    if (ch.nodeName === "dynamics") {
      let dataDynamics = xmlToDynamics(ch);
      ret.dynamics = dataDynamics;
    }
    if (ch.nodeName === "octave-shift") {
      let dataOctaveShift = xmlToOctaveShift(ch);
      ret.octaveShift = dataOctaveShift;
    }
    if (ch.nodeName === "words") {
      let dataWords = xmlToWords(ch);
      ret.words = (ret.words || []).concat(dataWords);
    }
    if (ch.nodeName === "damp-all") {
      let dataDampAll = xmlToDampAll(ch);
      ret.dampAll = dataDampAll;
    }
    if (ch.nodeName === "coda") {
      let dataCodas = xmlToCoda(ch);
      ret.codas = (ret.codas || []).concat(dataCodas);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Language is Italian ("it") by default. Enclosure is
 * square by default. Left justification is assumed if
 * not specified.
 */
export interface Rehearsal extends TextFormatting {
  _snapshot?: Rehearsal;
  data: string;
}

function xmlToRehearsal(node: Element) {
  let ret: Rehearsal = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

/**
 * Left justification is assumed if not specified.
 * Language is Italian ("it") by default. Enclosure
 * is none by default.
 */
export interface Words extends TextFormatting {
  _snapshot?: Words;
  data: string;
}

function xmlToWords(node: Element) {
  let ret: Words = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

export enum WedgeType {
  Diminuendo = 1,
  Crescendo = 0,
  Stop = 2,
  Continue = 3,
}

function getWedgeType(node: Node, fallbackVal?: WedgeType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Wedge spread is measured in tenths of staff line space.
 * The type is crescendo for the start of a wedge that is
 * closed at the left side, and diminuendo for the start
 * of a wedge that is closed on the right side. Spread
 * values at the start of a crescendo wedge or end of a
 * diminuendo wedge are ignored. The niente attribute is yes
 * if a circle appears at the point of the wedge, indicating
 * a crescendo from nothing or diminuendo to nothing. It is
 * no by default, and used only when the type is crescendo,
 * or the type is stop for a wedge that began with a diminuendo
 * type. The line-type is solid by default. The continue type
 * is used for formatting wedges over a system break, or for
 * other situations where a single wedge is divided into
 * multiple segments.
 */
export interface Wedge extends LineType, DashedFormatting, Position, Color {
  _snapshot?: Wedge;
  number?: number;
  niente?: boolean;
  type: WedgeType;
  spread?: number;
}

function xmlToWedge(node: Element) {
  let ret: Wedge = <any>{};
  let foundNumber_ = false;
  let foundNiente = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "niente") {
      let dataNiente = xmlToYesNo(ch2);
      ret.niente = dataNiente;
      foundNiente = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getWedgeType(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "spread") {
      let dataSpread = getNumber(ch2, true);
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

/**
 * Dashes, used for instance with cresc. and dim. marks.
 *
 */
export interface Dashes extends DashedFormatting, Position, Color {
  _snapshot?: Dashes;
  number: number;
  type: StartStopContinue;
}

function xmlToDashes(node: Element) {
  let ret: Dashes = <any>{};
  let foundNumber_ = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopContinue(ch2, null);
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

export enum LineEndType {
  None = 4,
  Both = 2,
  Arrow = 3,
  Down = 1,
  Up = 0,
}

function getLineEndType(node: Node, fallbackVal?: LineEndType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Brackets are combined with words in a letiety of
 * modern directions. The line-end attribute specifies
 * if there is a jog up or down (or both), an arrow,
 * or nothing at the start or end of the bracket. If
 * the line-end is up or down, the length of the jog
 * can be specified using the end-length attribute.
 * The line-type is solid by default.
 */
export interface Bracket extends LineType, DashedFormatting, Position, Color {
  _snapshot?: Bracket;
  endLength: number;
  number: number;
  type: StartStopContinue;
  lineEnd: LineEndType;
}

function xmlToBracket(node: Element) {
  let ret: Bracket = <any>{};
  let foundNumber_ = false;
  let foundLineType = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "end-length") {
      let dataEndLength = getNumber(ch2, true);
      ret.endLength = dataEndLength;
    }
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "line-type") {
      let dataLineType = getSolidDashedDottedWavy(
        ch2,
        SolidDashedDottedWavy.Solid
      );
      ret.lineType = dataLineType;
      foundLineType = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStopContinue(ch2, null);
      ret.type = dataType;
    }
    if (ch2.name === "line-end") {
      let dataLineEnd = getLineEndType(ch2, null);
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

export enum PedalType {
  Change = 3,
  Start = 0,
  Stop = 1,
  Continue = 2,
}

function getPedalType(node: Node, fallbackVal?: PedalType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Piano pedal marks. The line attribute is yes if pedal
 * lines are used. The sign attribute is yes if Ped and *
 * signs are used. For MusicXML 2.0 compatibility, the sign
 * attribute is yes by default if the line attribute is no,
 * and is no by default if the line attribute is yes. The
 * change and continue types are used when the line attribute
 * is yes. The change type indicates a pedal lift and retake
 * indicated with an inverted V marking. The continue type
 * allows more precise formatting across system breaks and for
 * more complex pedaling lines. The alignment attributes are
 * ignored if the line attribute is yes.
 */
export interface Pedal extends PrintStyleAlign {
  _snapshot?: Pedal;
  line: boolean;
  sign: boolean;
  type: PedalType;
}

function xmlToPedal(node: Element) {
  let ret: Pedal = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "line") {
      let dataLine = xmlToYesNo(ch2);
      ret.line = dataLine;
    }
    if (ch2.name === "sign") {
      let dataSign = xmlToYesNo(ch2);
      ret.sign = dataSign;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "type") {
      let dataType = getPedalType(ch2, null);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * Metronome marks and other metric relationships.
 *
 * The beat-unit values are the same as for a type element,
 * and the beat-unit-dot works like the dot element. The
 * per-minute element can be a number, or a text description
 * including numbers. The parentheses attribute indicates
 * whether or not to put the metronome mark in parentheses;
 * its value is no if not specified. If a font is specified for
 * the per-minute element, it overrides the font specified for
 * the overall metronome element. This allows separate
 * specification of a music font for beat-unit and a text
 * font for the numeric value in cases where a single
 * metronome font is not used.
 *
 * The metronome-note and metronome-relation elements
 * allow for the specification of more complicated metric
 * relationships, such as swing tempo marks where
 * two eighths are equated to a quarter note / eighth note
 * triplet. The metronome-type, metronome-beam, and
 * metronome-dot elements work like the type, beam, and
 * dot elements. The metronome-tuplet element uses the
 * same element structure as the time-modification element
 * along with some attributes from the tuplet element. The
 * metronome-relation element describes the relationship
 * symbol that goes between the two sets of metronome-note
 * elements. The currently allowed value is equals, but this
 * may expand in future versions. If the element is empty,
 * the equals value is used. The metronome-relation and
 * the following set of metronome-note elements are optional
 * to allow display of an isolated Grundschlagnote.
 */
export interface Metronome extends PrintStyleAlign, Justify {
  _snapshot?: Metronome;
  metronomeNotes: MetronomeNote[];
  perMinute: PerMinute;
  parentheses: boolean;
  beatUnit: string;
  beatUnitDots: BeatUnitDot[];
  beatUnitChange: string;
  beatUnitDotsChange: BeatUnitDot[];
  metronomeRelation: string;
}

function xmlToMetronome(node: Element) {
  let ret: Metronome = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundJustify = false;
  let gotFirstPair = false;
  let gotSecondPair = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "metronome-note") {
      let dataMetronomeNotes = xmlToMetronomeNote(ch);
      ret.metronomeNotes = (ret.metronomeNotes || []).concat(
        dataMetronomeNotes
      );
    }
    if (ch.nodeName === "per-minute") {
      let dataPerMinute = xmlToPerMinute(ch);
      ret.perMinute = dataPerMinute;
    }
    if (ch.nodeName === "beat-unit") {
      let dataBeatUnit = getString(ch, true);
      if (!gotFirstPair) {
        ret.beatUnit = dataBeatUnit;
        gotFirstPair = true;
      } else if (!gotSecondPair) {
        ret.beatUnitChange = dataBeatUnit;
        gotSecondPair = true;
      } else {
        throw "Too many beat-units in metronome";
      }
    }
    if (ch.nodeName === "beat-unit-dot") {
      let dataBeatUnitDots = xmlToBeatUnitDot(ch);
      if (!gotSecondPair) {
        ret.beatUnitDots = (ret.beatUnitDots || []).concat(dataBeatUnitDots);
      } else {
        ret.beatUnitDotsChange = (ret.beatUnitDotsChange || []).concat(
          dataBeatUnitDots
        );
      }
    }
    if (ch.nodeName === "metronome-relation") {
      let dataMetronomeRelation = getString(ch, true);
      ret.metronomeRelation = dataMetronomeRelation;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "parentheses") {
      let dataParentheses = xmlToYesNo(ch2);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  if (!foundJustify) {
    ret.justify = LeftCenterRight.Left;
  }
  return ret;
}

export interface BeatUnitDot {
  _snapshot?: BeatUnitDot;
}

function xmlToBeatUnitDot(node: Element) {
  let ret: BeatUnitDot = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface PerMinute extends Font {
  _snapshot?: PerMinute;
  data: string;
}

function xmlToPerMinute(node: Element) {
  let ret: PerMinute = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  if (!foundFontWeight) {
    ret.fontWeight = NormalBold.Normal;
  }
  if (!foundFontStyle) {
    ret.fontStyle = NormalItalic.Normal;
  }
  return ret;
}

export interface MetronomeNote {
  _snapshot?: MetronomeNote;
  metronomeDots: MetronomeDot[];
  metronomeBeams: MetronomeBeam[];
  metronomeType: string;
  metronomeTuplet: MetronomeTuplet;
}

function xmlToMetronomeNote(node: Element) {
  let ret: MetronomeNote = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "metronome-dot") {
      let dataMetronomeDots = xmlToMetronomeDot(ch);
      ret.metronomeDots = (ret.metronomeDots || []).concat(dataMetronomeDots);
    }
    if (ch.nodeName === "metronome-beam") {
      let dataMetronomeBeams = xmlToMetronomeBeam(ch);
      ret.metronomeBeams = (ret.metronomeBeams || []).concat(
        dataMetronomeBeams
      );
    }
    if (ch.nodeName === "metronome-type") {
      let dataMetronomeType = getString(ch, true);
      ret.metronomeType = dataMetronomeType;
    }
    if (ch.nodeName === "metronome-tuplet") {
      let dataMetronomeTuplet = xmlToMetronomeTuplet(ch);
      ret.metronomeTuplet = dataMetronomeTuplet;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface MetronomeDot {
  _snapshot?: MetronomeDot;
}

function xmlToMetronomeDot(node: Element) {
  let ret: MetronomeDot = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface MetronomeBeam {
  _snapshot?: MetronomeBeam;
  number: number;
  data: string;
}

function xmlToMetronomeBeam(node: Element) {
  let ret: MetronomeBeam = <any>{};
  let foundNumber_ = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  if (!foundNumber_) {
    ret.number = 1;
  }
  return ret;
}

export interface MetronomeTuplet {
  _snapshot?: MetronomeTuplet;
  actualNotes: number;
  bracket: boolean;
  showNumber: ActualBothNone;
  normalType: string;
  type: StartStop;
  normalNotes: number;
  normalDots: NormalDot[];
}

function xmlToMetronomeTuplet(node: Element) {
  let ret: MetronomeTuplet = <any>{};
  let foundBracket = false;
  let foundShowNumber = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "actual-notes") {
      let dataActualNotes = getNumber(ch, true);
      ret.actualNotes = dataActualNotes;
    }
    if (ch.nodeName === "normal-type") {
      let dataNormalType = getString(ch, true);
      ret.normalType = dataNormalType;
    }
    if (ch.nodeName === "normal-notes") {
      let dataNormalNotes = getNumber(ch, true);
      ret.normalNotes = dataNormalNotes;
    }
    if (ch.nodeName === "normal-dot") {
      let dataNormalDots = xmlToNormalDot(ch);
      ret.normalDots = (ret.normalDots || []).concat(dataNormalDots);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "bracket") {
      let dataBracket = xmlToYesNo(ch2);
      ret.bracket = dataBracket;
      foundBracket = true;
    }
    if (ch2.name === "show-number") {
      let dataShowNumber = getActualBothNone(ch2, ActualBothNone.Both);
      ret.showNumber = dataShowNumber;
      foundShowNumber = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
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

export enum OctaveShiftType {
  Down = 2,
  Stop = 3,
  Up = 1,
  Continue = 4,
}

function getOctaveShiftType(node: Node, fallbackVal?: OctaveShiftType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * Octave shifts indicate where notes are shifted up or down
 * from their true pitched values because of printing
 * difficulty. Thus a treble clef line noted with 8va will
 * be indicated with an octave-shift down from the pitch
 * data indicated in the notes. A size of 8 indicates one
 * octave; a size of 15 indicates two octaves.
 */
export interface OctaveShift extends DashedFormatting, PrintStyle {
  _snapshot?: OctaveShift;
  number: number;
  size: number;
  type: OctaveShiftType;
}

function xmlToOctaveShift(node: Element) {
  let ret: OctaveShift = <any>{};
  let foundSize = false;
  let foundDashLength = false;
  let foundSpaceLength = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "size") {
      let dataSize = getNumber(ch2, true);
      ret.size = dataSize;
      foundSize = true;
    }
    if (ch2.name === "dash-length") {
      let dataDashLength = getNumber(ch2, true);
      ret.dashLength = dataDashLength;
      foundDashLength = true;
    }
    if (ch2.name === "space-length") {
      let dataSpaceLength = getNumber(ch2, true);
      ret.spaceLength = dataSpaceLength;
      foundSpaceLength = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getOctaveShiftType(ch2, null);
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

/**
 * The harp-pedals element is used to create harp pedal
 * diagrams. The pedal-step and pedal-alter elements use
 * the same values as the step and alter elements. For
 * easiest reading, the pedal-tuning elements should follow
 * standard harp pedal order, with pedal-step values of
 * D, C, B, E, F, G, and A.
 */
export interface HarpPedals extends PrintStyleAlign {
  _snapshot?: HarpPedals;
  pedalTunings: PedalTuning[];
}

function xmlToHarpPedals(node: Element) {
  let ret: HarpPedals = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "pedal-tuning") {
      let dataPedalTunings = xmlToPedalTuning(ch);
      ret.pedalTunings = (ret.pedalTunings || []).concat(dataPedalTunings);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

export interface PedalTuning {
  _snapshot?: PedalTuning;
  pedalStep: string;
  pedalAlter: string;
}

function xmlToPedalTuning(node: Element) {
  let ret: PedalTuning = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "pedal-step") {
      let dataPedalStep = getString(ch, true);
      ret.pedalStep = dataPedalStep;
    }
    if (ch.nodeName === "pedal-alter") {
      let dataPedalAlter = getString(ch, true);
      ret.pedalAlter = dataPedalAlter;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Harp damping marks
 */
export interface Damp extends PrintStyleAlign {
  _snapshot?: Damp;
}

function xmlToDamp(node: Element) {
  let ret: Damp = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

export interface DampAll extends PrintStyleAlign {
  _snapshot?: DampAll;
}

function xmlToDampAll(node: Element) {
  let ret: DampAll = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

export interface Eyeglasses extends PrintStyleAlign {
  _snapshot?: Eyeglasses;
}

function xmlToEyeglasses(node: Element) {
  let ret: Eyeglasses = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

export interface StringMute extends PrintStyleAlign {
  _snapshot?: StringMute;
  type: string;
}

function xmlToStringMute(node: Element) {
  let ret: StringMute = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * Scordatura string tunings are represented by a series
 * of accord elements. The tuning-step, tuning-alter,
 * and tuning-octave elements are also used with the
 * staff-tuning element, and are defined in the common.mod
 * file. Strings are numbered from high to low.
 */
export interface Scordatura {
  _snapshot?: Scordatura;
  accords: Accord[];
}

function xmlToScordatura(node: Element) {
  let ret: Scordatura = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "accord") {
      let dataAccords = xmlToAccord(ch);
      ret.accords = (ret.accords || []).concat(dataAccords);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Scordatura string tunings are represented by a series
 * of accord elements. The tuning-step, tuning-alter,
 * and tuning-octave elements are also used with the
 * staff-tuning element, and are defined in the common.mod
 * file. Strings are numbered from high to low.
 */
export interface Accord {
  _snapshot?: Accord;
  tuningAlter: string;
  string: string;
  tuningStep: string;
  tuningOctave: string;
}

function xmlToAccord(node: Element) {
  let ret: Accord = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "tuning-alter") {
      let dataTuningAlter = getString(ch, true);
      ret.tuningAlter = dataTuningAlter;
    }
    if (ch.nodeName === "tuning-step") {
      let dataTuningStep = getString(ch, true);
      ret.tuningStep = dataTuningStep;
    }
    if (ch.nodeName === "tuning-octave") {
      let dataTuningOctave = getString(ch, true);
      ret.tuningOctave = dataTuningOctave;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "string") {
      let dataString = getString(ch2, true);
      ret.string = dataString;
    }
  }
  return ret;
}

/**
 * The image element is used to include graphical images
 * in a score. The required source attribute is the URL
 * for the image file. The required type attribute is the
 * MIME type for the image file format. Typical choices
 * include application/postscript, image/gif, image/jpeg,
 * image/png, and image/tiff.
 */
export interface Image extends Position, Halign, ValignImage {
  _snapshot?: Image;
  type: string;
  source: string;
}

function xmlToImage(node: Element) {
  let ret: Image = <any>{};
  let foundHalign = false;
  let foundValignImage = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValignImage = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valignImage = dataValignImage;
      foundValignImage = true;
    }
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
    if (ch2.name === "source") {
      let dataSource = getString(ch2, true);
      ret.source = dataSource;
    }
  }
  if (!foundHalign) {
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValignImage) {
    ret.valignImage = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

export enum VoiceSymbol {
  None = 4,
  Hauptstimme = 1,
  Nebenstimme = 2,
  Plain = 3,
}

function getVoiceSymbol(node: Node, fallbackVal?: VoiceSymbol) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

/**
 * The principal-voice element represents principal and
 * secondary voices in a score, either for analysis or
 * for square bracket symbols that appear in a score.
 * The symbol attribute indicates the type of symbol used at
 * the start of the principal-voice. Valid values are
 * Hauptstimme, Nebenstimme, plain (for a plain square
 * bracket), and none. The content of the principal-voice
 * element is used for analysis and may be any text value.
 * When used for analysis separate from any printed score
 * markings, the symbol attribute should be set to "none".
 */
export interface PrincipalVoice extends PrintStyleAlign {
  _snapshot?: PrincipalVoice;
  symbol: VoiceSymbol;
  data?: string;
  type: StartStop;
}

function xmlToPrincipalVoice(node: Element) {
  let ret: PrincipalVoice = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "symbol") {
      let dataSymbol = getVoiceSymbol(ch2, null);
      ret.symbol = dataSymbol;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, false);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The accordion-registration element is use for accordion
 * registration symbols. These are circular symbols divided
 * horizontally into high, middle, and low sections that
 * correspond to 4', 8', and 16' pipes. Each accordion-high,
 * accordion-middle, and accordion-low element represents
 * the presence of one or more dots in the registration
 * diagram. The accordion-middle element may have text
 * values of 1, 2, or 3, corresponding to have 1 to 3 dots
 * in the middle section. An accordion-registration element
 * needs to have at least one of the child elements present.
 */
export interface AccordionRegistration extends PrintStyleAlign {
  _snapshot?: AccordionRegistration;
  accordionMiddle: string;
  accordionHigh: boolean;
  accordionLow: boolean;
}

function xmlToAccordionRegistration(node: Element) {
  let ret: AccordionRegistration = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "accordion-middle") {
      let dataAccordionMiddle = getString(ch, true);
      ret.accordionMiddle = dataAccordionMiddle;
    }
    if (ch.nodeName === "accordion-high") {
      let dataAccordionHigh = true;
      ret.accordionHigh = dataAccordionHigh;
    }
    if (ch.nodeName === "accordion-low") {
      let dataAccordionLow = true;
      ret.accordionLow = dataAccordionLow;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The percussion element is used to define percussion
 * pictogram symbols. Definitions for these symbols can be
 * found in Kurt Stone's "Music Notation in the Twentieth
 * Century" on pages 206-212 and 223. Some values are
 * added to these based on how usage has evolved in
 * the 30 years since Stone's book was published.
 */
export interface Percussion extends PrintStyleAlign, Enclosure {
  _snapshot?: Percussion;
  stickLocation: string;
  otherPercussion: string;
  wood: string;
  effect: string;
  glass: string;
  timpani: Timpani;
  stick: Stick;
  metal: string;
  pitched: string;
  membrane: string;
  beater: Beater;
}

function xmlToPercussion(node: Element) {
  let ret: Percussion = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundEnclosure = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "stick-location") {
      let dataStickLocation = getString(ch, true);
      ret.stickLocation = dataStickLocation;
    }
    if (ch.nodeName === "other-percussion") {
      let dataOtherPercussion = getString(ch, true);
      ret.otherPercussion = dataOtherPercussion;
    }
    if (ch.nodeName === "wood") {
      let dataWood = getString(ch, true);
      ret.wood = dataWood;
    }
    if (ch.nodeName === "effect") {
      let dataEffect = getString(ch, true);
      ret.effect = dataEffect;
    }
    if (ch.nodeName === "glass") {
      let dataGlass = getString(ch, true);
      ret.glass = dataGlass;
    }
    if (ch.nodeName === "timpani") {
      let dataTimpani = xmlToTimpani(ch);
      ret.timpani = dataTimpani;
    }
    if (ch.nodeName === "stick") {
      let dataStick = xmlToStick(ch);
      ret.stick = dataStick;
    }
    if (ch.nodeName === "metal") {
      let dataMetal = getString(ch, true);
      ret.metal = dataMetal;
    }
    if (ch.nodeName === "pitched") {
      let dataPitched = getString(ch, true);
      ret.pitched = dataPitched;
    }
    if (ch.nodeName === "membrane") {
      let dataMembrane = getString(ch, true);
      ret.membrane = dataMembrane;
    }
    if (ch.nodeName === "beater") {
      let dataBeater = xmlToBeater(ch);
      ret.beater = dataBeater;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  if (!foundEnclosure) {
    ret.enclosure = EnclosureShape.None;
  }
  return ret;
}

/**
 * The timpani element represents the timpani pictogram.
 *
 */
export interface Timpani {
  _snapshot?: Timpani;
}

function xmlToTimpani(node: Element) {
  let ret: Timpani = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The beater element represents pictograms for beaters,
 * mallets, and sticks that do not have different materials
 * represented in the pictogram. Valid values are bow,
 * chime hammer, coin, finger, fingernail, fist,
 * guiro scraper, hammer, hand, jazz stick, knitting needle,
 * metal hammer, snare stick, spoon mallet, triangle beater,
 * triangle beater plain, and wire brush. The jazz stick value
 * refers to Stone's plastic tip snare stick. The triangle
 * beater plain value refers to the plain line version of the
 * pictogram. The finger and hammer values are in addition
 * to Stone's list. The tip attribute represents the direction
 * in which the tip of a beater points.
 */
export interface Beater {
  _snapshot?: Beater;
  data: string;
  tip: TipDirection;
}

function xmlToBeater(node: Element) {
  let ret: Beater = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "tip") {
      let dataTip = getTipDirection(ch2, null);
      ret.tip = dataTip;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  return ret;
}

/**
 * The stick element represents pictograms where the material
 * in the stick, mallet, or beater is included. Valid values
 * for stick-type are bass drum, double bass drum, timpani,
 * xylophone, and yarn. Valid values for stick-material are
 * soft, medium, hard, shaded, and x. The shaded and x values
 * reflect different uses for brass, wood, and steel core
 * beaters of different types. The tip attribute represents
 * the direction in which the tip of a stick points.
 */
export interface Stick {
  _snapshot?: Stick;
  stickMaterial: string;
  stickType: string;
  tip: TipDirection;
}

function xmlToStick(node: Element) {
  let ret: Stick = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "stick-material") {
      let dataStickMaterial = getString(ch, true);
      ret.stickMaterial = dataStickMaterial;
    }
    if (ch.nodeName === "stick-type") {
      let dataStickType = getString(ch, true);
      ret.stickType = dataStickType;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "tip") {
      let dataTip = getTipDirection(ch2, null);
      ret.tip = dataTip;
    }
  }
  return ret;
}

/**
 * An offset is represented in terms of divisions, and
 * indicates where the direction will appear relative to
 * the current musical location. This affects the visual
 * appearance of the direction. If the sound attribute is
 * "yes", then the offset affects playback too. If the sound
 * attribute is "no", then any sound associated with the
 * direction takes effect at the current location. The sound
 * attribute is "no" by default for compatibility with earlier
 * versions of the MusicXML format. If an element within a
 * direction includes a default-x attribute, the offset value
 * will be ignored when determining the appearance of that
 * element.
 */
export interface Offset {
  _snapshot?: Offset;
  data: string;
  sound: boolean;
}

function xmlToOffset(node: Element) {
  let ret: Offset = <any>{};
  let foundSound = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "sound") {
      let dataSound = xmlToYesNo(ch2);
      ret.sound = dataSound;
      foundSound = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  if (!foundSound) {
    ret.sound = false;
  }
  return ret;
}

/**
 * The harmony elements are based on Humdrum's **harm
 * encoding, extended to support chord symbols in popular
 * music as well as functional harmony analysis in classical
 * music.
 *
 * If there are alternate harmonies possible, this can be
 * specified using multiple harmony elements differentiated
 * by type. Explicit harmonies have all note present in the
 * music; implied have some notes missing but implied;
 * alternate represents alternate analyses.
 *
 * The harmony object may be used for analysis or for
 * chord symbols. The print-object attribute controls
 * whether or not anything is printed due to the harmony
 * element. The print-frame attribute controls printing
 * of a frame or fretboard diagram. The print-style entity
 * sets the default for the harmony, but individual elements
 * can override this with their own print-style values.
 *
 * A harmony element can contain many stacked chords (e.g.
 * V of II). A sequence of harmony-chord entities is used
 * for this type of secondary function, where V of II would
 * be represented by a harmony-chord with a V function
 * followed by a harmony-chord with a II function.
 */
export interface HarmonyChord {
  _snapshot?: HarmonyChord;
  root: Root;
  function: Function;
  kind: Kind;
  degrees: Degree[];
  inversion: Inversion;
  bass: Bass;
}

function xmlToHarmonyChord(node: Element) {
  let ret: HarmonyChord = {
    root: null,
    function: null,
    kind: null,
    degrees: [],
    inversion: null,
    bass: null,
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "root") {
      let dataRoot = xmlToRoot(ch);
      ret.root = dataRoot;
    }
    if (ch.nodeName === "function") {
      let dataFunction = xmlToFunction(ch);
      ret.function = dataFunction;
    }
    if (ch.nodeName === "kind") {
      let dataKind = xmlToKind(ch);
      ret.kind = dataKind;
    }
    if (ch.nodeName === "degree") {
      let dataDegree = xmlToDegree(ch);
      ret.degrees.push(dataDegree);
    }
    if (ch.nodeName === "inversion") {
      let dataInversion = xmlToInversion(ch);
      ret.inversion = dataInversion;
    }
    if (ch.nodeName === "bass") {
      let dataBass = xmlToBass(ch);
      ret.bass = dataBass;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export enum ExplicitImpliedAlternate {
  Explicit = 1,
  Implied = 2,
  Alternate = 3,
}

function getExplicitImpliedAlternate(
  node: Node,
  fallbackVal?: ExplicitImpliedAlternate
) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

export interface Harmony
  extends HarmonyChord,
    Editorial,
    PrintObject,
    PrintStyle,
    Placement {
  _snapshot?: Harmony;
  frame: Frame;
  printFrame: boolean;
  staff: number;
  type: ExplicitImpliedAlternate;
  offset: Offset;
}

function xmlToHarmony(node: Element) {
  let ret: Harmony = {
    frame: null,
    printFrame: null,
    staff: null,
    type: null,
    offset: null,
    root: null,
    function: null,
    kind: null,
    degrees: [],
    inversion: null,
    bass: null,
  };
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPlacement = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "frame") {
      let dataFrame = xmlToFrame(ch);
      ret.frame = dataFrame;
    }
    if (ch.nodeName === "root") {
      let dataRoot = xmlToRoot(ch);
      ret.root = dataRoot;
    }
    if (ch.nodeName === "function") {
      let dataFunction = xmlToFunction(ch);
      ret.function = dataFunction;
    }
    if (ch.nodeName === "kind") {
      let dataKind = xmlToKind(ch);
      ret.kind = dataKind;
    }
    if (ch.nodeName === "degree") {
      let dataDegree = xmlToDegree(ch);
      ret.degrees.push(dataDegree);
    }
    if (ch.nodeName === "inversion") {
      let dataInversion = xmlToInversion(ch);
      ret.inversion = dataInversion;
    }
    if (ch.nodeName === "bass") {
      let dataBass = xmlToBass(ch);
      ret.bass = dataBass;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "staff") {
      let dataStaff = getNumber(ch, true);
      ret.staff = dataStaff;
    }
    if (ch.nodeName === "offset") {
      let dataOffset = xmlToOffset(ch);
      ret.offset = dataOffset;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-frame") {
      let dataPrintFrame = xmlToYesNo(ch2);
      ret.printFrame = dataPrintFrame;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "placement") {
      let dataPlacement = getAboveBelow(ch2, AboveBelow.Unspecified);
      ret.placement = dataPlacement;
      foundPlacement = true;
    }
    if (ch2.name === "type") {
      let dataHarmonyType = getExplicitImpliedAlternate(ch2, null);
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

/**
 * A root is a pitch name like C, D, E, where a function
 * is an indication like I, II, III. Root is generally
 * used with pop chord symbols, function with classical
 * functional harmony. It is an either/or choice to avoid
 * data inconsistency. Function requires that the key be
 * specified in the encoding.
 *
 * The root element has a root-step and optional root-alter
 * similar to the step and alter elements in a pitch, but
 * renamed to distinguish the different musical meanings.
 * The root-step text element indicates how the root should
 * appear in a score if not using the element contents.
 * In some chord styles, this will include the root-alter
 * information as well. In that case, the print-object
 * attribute of the root-alter element can be set to no.
 * The root-alter location attribute indicates whether
 * the alteration should appear to the left or the right
 * of the root-step; it is right by default.
 */
export interface Root {
  _snapshot?: Root;
  rootStep: RootStep;
  rootAlter: RootAlter;
}

function xmlToRoot(node: Element) {
  let ret: Root = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "root-step") {
      let dataRootStep = xmlToRootStep(ch);
      ret.rootStep = dataRootStep;
    }
    if (ch.nodeName === "root-alter") {
      let dataRootAlter = xmlToRootAlter(ch);
      ret.rootAlter = dataRootAlter;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface RootStep extends PrintStyle {
  _snapshot?: RootStep;
  text: string;
  data: string;
}

function xmlToRootStep(node: Element) {
  let ret: RootStep = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "text") {
      let dataText = getString(ch2, true);
      ret.text = dataText;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface RootAlter extends PrintObject, PrintStyle {
  _snapshot?: RootAlter;
  location: LeftRight;
  data: string;
}

function xmlToRootAlter(node: Element) {
  let ret: RootAlter = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "location") {
      let dataLocation = getLeftRight(ch2, null);
      ret.location = dataLocation;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface Function extends PrintStyle {
  _snapshot?: Function;
  data: string;
}

function xmlToFunction(node: Element) {
  let ret: Function = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * Kind indicates the type of chord. Degree elements
 * can then add, subtract, or alter from these
 * starting points. Values include:
 *
 * Triads:
 * major (major third, perfect fifth)
 * minor (minor third, perfect fifth)
 * augmented (major third, augmented fifth)
 * diminished (minor third, diminished fifth)
 * Sevenths:
 * dominant (major triad, minor seventh)
 * major-seventh (major triad, major seventh)
 * minor-seventh (minor triad, minor seventh)
 * diminished-seventh
 *     (diminished triad, diminished seventh)
 * augmented-seventh
 *     (augmented triad, minor seventh)
 * half-diminished
 *     (diminished triad, minor seventh)
 * major-minor
 *     (minor triad, major seventh)
 * Sixths:
 * major-sixth (major triad, added sixth)
 * minor-sixth (minor triad, added sixth)
 * Ninths:
 * dominant-ninth (dominant-seventh, major ninth)
 * major-ninth (major-seventh, major ninth)
 * minor-ninth (minor-seventh, major ninth)
 * 11ths (usually as the basis for alteration):
 * dominant-11th (dominant-ninth, perfect 11th)
 * major-11th (major-ninth, perfect 11th)
 * minor-11th (minor-ninth, perfect 11th)
 * 13ths (usually as the basis for alteration):
 * dominant-13th (dominant-11th, major 13th)
 * major-13th (major-11th, major 13th)
 * minor-13th (minor-11th, major 13th)
 * Suspended:
 * suspended-second (major second, perfect fifth)
 * suspended-fourth (perfect fourth, perfect fifth)
 * Functional sixths:
 * Neapolitan
 * Italian
 * French
 * German
 * Other:
 * pedal (pedal-point bass)
 * power (perfect fifth)
 * Tristan
 *
 * The "other" kind is used when the harmony is entirely
 * composed of add elements. The "none" kind is used to
 * explicitly encode absence of chords or functional
 * harmony.
 *
 * The attributes are used to indicate the formatting
 * of the symbol. Since the kind element is the constant
 * in all the harmony-chord entities that can make up
 * a polychord, many formatting attributes are here.
 *
 * The use-symbols attribute is yes if the kind should be
 * represented when possible with harmony symbols rather
 * than letters and numbers. These symbols include:
 *
 * major: a triangle, like Unicode 25B3
 * minor: -, like Unicode 002D
 * augmented: +, like Unicode 002B
 * diminished: °, like Unicode 00B0
 * half-diminished: ø, like Unicode 00F8
 *
 * For the major-minor kind, only the minor symbol is used when
 * use-symbols is yes. The major symbol is set using the symbol
 * attribute in the degree-value element. The corresponding
 * degree-alter value will usually be 0 in this case.
 *
 * The text attribute describes how the kind should be spelled
 * in a score. If use-symbols is yes, the value of the text
 * attribute follows the symbol. The stack-degrees attribute
 * is yes if the degree elements should be stacked above each
 * other. The parentheses-degrees attribute is yes if all the
 * degrees should be in parentheses. The bracket-degrees
 * attribute is yes if all the degrees should be in a bracket.
 * If not specified, these values are implementation-specific.
 * The alignment attributes are for the entire harmony-chord
 * entity of which this kind element is a part.
 */
export interface Kind extends PrintStyle, Halign, Valign {
  _snapshot?: Kind;
  parenthesesDegrees: boolean;
  useSymbols: boolean;
  text: string;
  data: string;
  stackDegrees: boolean;
  bracketDegrees: boolean;
}

function xmlToKind(node: Element) {
  let ret: Kind = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "parentheses-degrees") {
      let dataParenthesesDegrees = xmlToYesNo(ch2);
      ret.parenthesesDegrees = dataParenthesesDegrees;
    }
    if (ch2.name === "use-symbols") {
      let dataUseSymbols = xmlToYesNo(ch2);
      ret.useSymbols = dataUseSymbols;
    }
    if (ch2.name === "text") {
      let dataText = getString(ch2, true);
      ret.text = dataText;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "stack-degrees") {
      let dataStackDegrees = xmlToYesNo(ch2);
      ret.stackDegrees = dataStackDegrees;
    }
    if (ch2.name === "bracket-degrees") {
      let dataBracketDegrees = xmlToYesNo(ch2);
      ret.bracketDegrees = dataBracketDegrees;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * Inversion is a number indicating which inversion is used:
 * 0 for root position, 1 for first inversion, etc.
 */
export interface Inversion extends PrintStyle {
  _snapshot?: Inversion;
  data: string;
}

function xmlToInversion(node: Element) {
  let ret: Inversion = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * Bass is used to indicate a bass note in popular music
 * chord symbols, e.g. G/C. It is generally not used in
 * functional harmony, as inversion is generally not used
 * in pop chord symbols. As with root, it is divided into
 * step and alter elements, similar to pitches. The attributes
 * for bass-step and bass-alter work the same way as
 * the corresponding attributes for root-step and root-alter.
 */
export interface Bass {
  _snapshot?: Bass;
  bassStep: BassStep;
  bassAlter: BassAlter;
}

function xmlToBass(node: Element) {
  let ret: Bass = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "bass-step") {
      let dataBassStep = xmlToBassStep(ch);
      ret.bassStep = dataBassStep;
    }
    if (ch.nodeName === "bass-alter") {
      let dataBassAlter = xmlToBassAlter(ch);
      ret.bassAlter = dataBassAlter;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Bass is used to indicate a bass note in popular music
 * chord symbols, e.g. G/C. It is generally not used in
 * functional harmony, as inversion is generally not used
 * in pop chord symbols. As with root, it is divided into
 * step and alter elements, similar to pitches. The attributes
 * for bass-step and bass-alter work the same way as
 * the corresponding attributes for root-step and root-alter.
 */
export interface BassStep extends PrintStyle {
  _snapshot?: BassStep;
  text: string;
  data: string;
}

function xmlToBassStep(node: Element) {
  let ret: BassStep = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "text") {
      let dataText = getString(ch2, true);
      ret.text = dataText;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface BassAlter extends PrintObject, PrintStyle {
  _snapshot?: BassAlter;
  location: LeftRight;
  data: string;
}

function xmlToBassAlter(node: Element) {
  let ret: BassAlter = <any>{};
  let foundPrintObject = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "location") {
      let dataLocation = getLeftRight(ch2, null);
      ret.location = dataLocation;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The degree element is used to add, alter, or subtract
 * individual notes in the chord. The degree-value element
 * is a number indicating the degree of the chord (1 for
 * the root, 3 for third, etc). The degree-alter element
 * is like the alter element in notes: 1 for sharp, -1 for
 * flat, etc. The degree-type element can be add, alter, or
 * subtract. If the degree-type is alter or subtract, the
 * degree-alter is relative to the degree already in the
 * chord based on its kind element. If the degree-type is
 * add, the degree-alter is relative to a dominant chord
 * (major and perfect intervals except for a minor
 * seventh). The print-object attribute can be used to
 * keep the degree from printing separately when it has
 * already taken into account in the text attribute of
 * the kind element. The plus-minus attribute is used to
 * indicate if plus and minus symbols should be used
 * instead of sharp and flat symbols to display the degree
 * alteration; it is no by default.
 *
 * The degree-value and degree-type text attributes specify
 * how the value and type of the degree should be displayed
 * in a score. The degree-value symbol attribute indicates
 * that a symbol should be used in specifying the degree.
 * If the symbol attribute is present, the value of the text
 * attribute follows the symbol.
 *
 * A harmony of kind "other" can be spelled explicitly by
 * using a series of degree elements together with a root.
 */
export interface Degree extends PrintObject {
  _snapshot?: Degree;
  degreeAlter: DegreeAlter;
  degreeValue: DegreeValue;
  degreeType: DegreeType;
}

function xmlToDegree(node: Element) {
  let ret: Degree = <any>{};
  let foundPrintObject = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "degree-alter") {
      let dataDegreeAlter = xmlToDegreeAlter(ch);
      ret.degreeAlter = dataDegreeAlter;
    }
    if (ch.nodeName === "degree-value") {
      let dataDegreeValue = xmlToDegreeValue(ch);
      ret.degreeValue = dataDegreeValue;
    }
    if (ch.nodeName === "degree-type") {
      let dataDegreeType = xmlToDegreeType(ch);
      ret.degreeType = dataDegreeType;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
  }
  if (!foundPrintObject) {
    ret.printObject = true;
  }
  return ret;
}

export enum ChordType {
  Augmented = 3,
  Diminished = 4,
  Major = 1,
  Minor = 2,
  HalfDiminished = 5,
}

function getChordType(node: Node, fallbackVal?: ChordType) {
  "use strict";
  let s = (
    node.nodeType === node.ATTRIBUTE_NODE
      ? (<Attr>node).value
      : node.textContent
  ).trim();
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

export interface DegreeValue extends PrintStyle {
  _snapshot?: DegreeValue;
  symbol: ChordType;
  text: string;
  data: string;
}

function xmlToDegreeValue(node: Element) {
  let ret: DegreeValue = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "symbol") {
      let dataSymbol = getChordType(ch2, null);
      ret.symbol = dataSymbol;
    }
    if (ch2.name === "text") {
      let dataText = getString(ch2, true);
      ret.text = dataText;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface DegreeAlter extends PrintStyle {
  _snapshot?: DegreeAlter;
  plusMinus: boolean;
  data: string;
}

function xmlToDegreeAlter(node: Element) {
  let ret: DegreeAlter = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "plus-minus") {
      let dataPlusMinus = xmlToYesNo(ch2);
      ret.plusMinus = dataPlusMinus;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

export interface DegreeType extends PrintStyle {
  _snapshot?: DegreeType;
  text: string;
  data: string;
}

function xmlToDegreeType(node: Element) {
  let ret: DegreeType = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "text") {
      let dataText = getString(ch2, true);
      ret.text = dataText;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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

/**
 * The frame element represents a frame or fretboard diagram
 * used together with a chord symbol. The representation is
 * based on the NIFF guitar grid with additional information.
 * The frame-strings and frame-frets elements give the
 * overall size of the frame in vertical lines (strings) and
 * horizontal spaces (frets).
 *
 * The frame element's unplayed attribute indicates what to
 * display above a string that has no associated frame-note
 * element. Typical values are x and the empty string. If the
 * attribute is not present, the display of the unplayed
 * string is application-defined.
 */
export interface Frame extends Position, Color, Halign, ValignImage {
  _snapshot?: Frame;
  frameStrings: string;
  frameNotes: FrameNote[];
  unplayed: string;
  frameFrets: string;
  firstFret: FirstFret;
  width: number;
  height: number;
}

function xmlToFrame(node: Element) {
  let ret: Frame = <any>{};
  let foundColor = false;
  let foundHalign = false;
  let foundValignImage = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "frame-strings") {
      let dataFrameStrings = getString(ch, true);
      ret.frameStrings = dataFrameStrings;
    }
    if (ch.nodeName === "frame-note") {
      let dataFrameNotes = xmlToFrameNote(ch);
      ret.frameNotes = (ret.frameNotes || []).concat(dataFrameNotes);
    }
    if (ch.nodeName === "frame-frets") {
      let dataFrameFrets = getString(ch, true);
      ret.frameFrets = dataFrameFrets;
    }
    if (ch.nodeName === "first-fret") {
      let dataFirstFret = xmlToFirstFret(ch);
      ret.firstFret = dataFirstFret;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "unplayed") {
      let dataUnplayed = getString(ch2, true);
      ret.unplayed = dataUnplayed;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValignImage = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valignImage = dataValignImage;
      foundValignImage = true;
    }
    if (ch2.name === "width") {
      let dataWidth = getNumber(ch2, true);
      ret.width = dataWidth;
    }
    if (ch2.name === "height") {
      let dataHeight = getNumber(ch2, true);
      ret.height = dataHeight;
    }
  }
  if (!foundColor) {
    ret.color = "#000000";
  }
  if (!foundHalign) {
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValignImage) {
    ret.valignImage = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The first-fret indicates which fret is shown in the top
 * space of the frame; it is fret 1 if the element is not
 * present. The optional text attribute indicates how this
 * is represented in the fret diagram, while the location
 * attribute indicates whether the text appears to the left
 * or right of the frame.
 */
export interface FirstFret {
  _snapshot?: FirstFret;
  text: string;
  location: LeftRight;
  data: string;
}

function xmlToFirstFret(node: Element) {
  let ret: FirstFret = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "text") {
      let dataText = getString(ch2, true);
      ret.text = dataText;
    }
    if (ch2.name === "location") {
      let dataLocation = getLeftRight(ch2, null);
      ret.location = dataLocation;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  return ret;
}

/**
 * The frame-note element represents each note included in
 * the frame. The definitions for string, fret, and fingering
 * are found in the common.mod file. An open string will
 * have a fret value of 0, while a muted string will not be
 * associated with a frame-note element.
 */
export interface FrameNote {
  _snapshot?: FrameNote;
  barre: Barre;
  string: String;
  fingering: Fingering;
  fret: Fret;
}

function xmlToFrameNote(node: Element) {
  let ret: FrameNote = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "barre") {
      let dataBarre = xmlToBarre(ch);
      ret.barre = dataBarre;
    }
    if (ch.nodeName === "string") {
      let dataString = xmlToString(ch);
      ret.string = dataString;
    }
    if (ch.nodeName === "fingering") {
      let dataFingering = xmlToFingering(ch);
      ret.fingering = dataFingering;
    }
    if (ch.nodeName === "fret") {
      let dataFret = xmlToFret(ch);
      ret.fret = dataFret;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The barre element indicates placing a finger over
 * multiple strings on a single fret. The type is "start"
 * for the lowest pitched string (e.g., the string with
 * the highest MusicXML number) and is "stop" for the
 * highest pitched string.
 */
export interface Barre extends Color {
  _snapshot?: Barre;
  type: StartStop;
}

function xmlToBarre(node: Element) {
  let ret: Barre = <any>{};
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
  }
  if (!foundColor) {
    ret.color = "#000000";
  }
  return ret;
}

/**
 * The grouping element is used for musical analysis. When
 * the element type is "start" or "single", it usually contains
 * one or more feature elements. The number attribute is used
 * for distinguishing between overlapping and hierarchical
 * groupings. The member-of attribute allows for easy
 * distinguishing of what grouping elements are in what
 * hierarchy. Feature elements contained within a "stop"
 * type of grouping may be ignored.
 *
 * This element is flexible to allow for non-standard analyses.
 * Future versions of the MusicXML format may add elements
 * that can represent more standardized categories of analysis
 * data, allowing for easier data sharing.
 */
export interface Grouping {
  _snapshot?: Grouping;
  features: Feature[];
  number: number;
  type: StartStopSingle;
  memberOf: string;
  _class?: string;
}

function xmlToGrouping(node: Element) {
  let ret: Grouping = <any>{};
  let foundNumber_ = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "feature") {
      let dataFeatures = xmlToFeature(ch);
      ret.features = (ret.features || []).concat(dataFeatures);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "type") {
      let dataGroupingType = getStartStopSingle(ch2, null);
      ret.type = dataGroupingType;
    }
    if (ch2.name === "member-of") {
      let dataMemberOf = getString(ch2, true);
      ret.memberOf = dataMemberOf;
    }
  }
  if (!foundNumber_) {
    ret.number = 1;
  }
  ret._class = "Grouping";
  return ret;
}

export interface Feature {
  _snapshot?: Feature;
  data: string;
  type: string;
}

function xmlToFeature(node: Element) {
  let ret: Feature = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  return ret;
}

/**
 * The print element contains general printing parameters,
 * including the layout elements defined in the layout.mod
 * file. The part-name-display and part-abbreviation-display
 * elements used in the score.mod file may also be used here
 * to change how a part name or abbreviation is displayed over
 * the course of a piece. They take effect when the current
 * measure or a succeeding measure starts a new system.
 *
 * The new-system and new-page attributes indicate whether
 * to force a system or page break, or to force the current
 * music onto the same system or page as the preceding music.
 * Normally this is the first music data within a measure.
 * If used in multi-part music, they should be placed in the
 * same positions within each part, or the results are
 * undefined. The page-number attribute sets the number of a
 * new page; it is ignored if new-page is not "yes". Version
 * 2.0 adds a blank-page attribute. This is a positive integer
 * value that specifies the number of blank pages to insert
 * before the current measure. It is ignored if new-page is
 * not "yes". These blank pages have no music, but may have
 * text or images specified by the credit element. This is
 * used to allow a combination of pages that are all text,
 * or all text and images, together with pages of music.
 *
 * Staff spacing between multiple staves is measured in
 * tenths of staff lines (e.g. 100 = 10 staff lines). This is
 * deprecated as of Version 1.1; the staff-layout element
 * should be used instead. If both are present, the
 * staff-layout values take priority.
 *
 * Layout elements in a print statement only apply to the
 * current page, system, staff, or measure. Music that
 * follows continues to take the default values from the
 * layout included in the defaults element.
 */
export interface Print {
  _snapshot?: Print;
  measureNumbering: MeasureNumbering;
  partNameDisplay: PartNameDisplay;
  newSystem: boolean;
  newPage: boolean;
  blankPage: string;
  measureLayout: MeasureLayout;
  partAbbreviationDisplay: PartAbbreviationDisplay;
  pageLayout: PageLayout;
  systemLayout: SystemLayout;
  staffSpacing: number;
  staffLayouts: StaffLayout[];
  pageNumber: string;
  _class?: string;
}

function xmlToPrint(node: Element) {
  let ret: Print = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "measure-numbering") {
      let dataMeasureNumbering = xmlToMeasureNumbering(ch);
      ret.measureNumbering = dataMeasureNumbering;
    }
    if (ch.nodeName === "part-name-display") {
      let dataPartNameDisplay = xmlToPartNameDisplay(ch);
      ret.partNameDisplay = dataPartNameDisplay;
    }
    if (ch.nodeName === "measure-layout") {
      let dataMeasureLayout = xmlToMeasureLayout(ch);
      ret.measureLayout = dataMeasureLayout;
    }
    if (ch.nodeName === "part-abbreviation-display") {
      let dataPartAbbreviationDisplay = xmlToPartAbbreviationDisplay(ch);
      ret.partAbbreviationDisplay = dataPartAbbreviationDisplay;
    }
    if (ch.nodeName === "page-layout") {
      let dataPageLayout = xmlToPageLayout(ch);
      ret.pageLayout = dataPageLayout;
    }
    if (ch.nodeName === "system-layout") {
      let dataSystemLayout = xmlToSystemLayout(ch);
      ret.systemLayout = dataSystemLayout;
    }
    if (ch.nodeName === "staff-layout") {
      let dataStaffLayouts = xmlToStaffLayout(ch);
      ret.staffLayouts = (ret.staffLayouts || []).concat(dataStaffLayouts);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "new-system") {
      let dataNewSystem = xmlToYesNo(ch2);
      ret.newSystem = dataNewSystem;
    }
    if (ch2.name === "new-page") {
      let dataNewPage = xmlToYesNo(ch2);
      ret.newPage = dataNewPage;
    }
    if (ch2.name === "blank-page") {
      let dataBlankPage = getString(ch2, true);
      ret.blankPage = dataBlankPage;
    }
    if (ch2.name === "staff-spacing") {
      let dataStaffSpacing = getNumber(ch2, true);
      ret.staffSpacing = dataStaffSpacing;
    }
    if (ch2.name === "page-number") {
      let dataPageNumber = getString(ch2, true);
      ret.pageNumber = dataPageNumber;
    }
  }
  ret._class = "Print";
  return ret;
}

/**
 * The measure-numbering element describes how measure
 * numbers are displayed on this part. Values may be none,
 * measure, or system. The number attribute from the measure
 * element is used for printing. Measures with an implicit
 * attribute set to "yes" never display a measure number,
 * regardless of the measure-numbering setting.
 */
export interface MeasureNumbering extends PrintStyleAlign {
  _snapshot?: MeasureNumbering;
  data: string;
}

function xmlToMeasureNumbering(node: Element) {
  let ret: MeasureNumbering = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValign) {
    ret.valign = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The sound element contains general playback parameters.
 * They can stand alone within a part/measure, or be a
 * component element within a direction.
 *
 * Tempo is expressed in quarter notes per minute. If 0,
 * the sound-generating program should prompt the user at the
 * time of compiling a sound (MIDI) file.
 *
 * Dynamics (or MIDI velocity) are expressed as a percentage
 * of the default forte value (90 for MIDI 1.0).
 *
 * Dacapo indicates to go back to the beginning of the
 * movement. When used it always has the value "yes".
 *
 * Segno and dalsegno are used for backwards jumps to a
 * segno sign; coda and tocoda are used for forward jumps
 * to a coda sign. If there are multiple jumps, the value
 * of these parameters can be used to name and distinguish
 * them. If segno or coda is used, the divisions attribute
 * can also be used to indicate the number of divisions
 * per quarter note. Otherwise sound and MIDI generating
 * programs may have to recompute this.
 *
 * By default, a dalsegno or dacapo attribute indicates that
 * the jump should occur the first time through, while a
 * tocoda attribute indicates the jump should occur the second
 * time through. The time that jumps occur can be changed by
 * using the time-only attribute.
 *
 * Forward-repeat is used when a forward repeat sign is
 * implied, and usually follows a bar line. When used it
 * always has the value of "yes".
 *
 * The fine attribute follows the final note or rest in a
 * movement with a da capo or dal segno direction. If numeric,
 * the value represents the actual duration of the final note or
 * rest, which can be ambiguous in written notation and
 * different among parts and voices. The value may also be
 * "yes" to indicate no change to the final duration.
 *
 * If the sound element applies only particular times through a
 * repeat, the time-only attribute indicates which times to apply
 * the sound element. The value is a comma-separated list of
 * positive integers arranged in ascending order, indicating
 * which times through the repeated section that the element
 * applies.
 *
 * Pizzicato in a sound element effects all following notes.
 * Yes indicates pizzicato, no indicates arco.
 *
 * The pan and elevation attributes are deprecated in
 * Version 2.0. The pan and elevation elements in
 * the midi-instrument element should be used instead.
 * The meaning of the pan and elevation attributes is
 * the same as for the pan and elevation elements. If
 * both are present, the mid-instrument elements take
 * priority.
 *
 * The damper-pedal, soft-pedal, and sostenuto-pedal
 * attributes effect playback of the three common piano
 * pedals and their MIDI controller equivalents. The yes
 * value indicates the pedal is depressed; no indicates
 * the pedal is released. A numeric value from 0 to 100
 * may also be used for half pedaling. This value is the
 * percentage that the pedal is depressed. A value of 0 is
 * equivalent to no, and a value of 100 is equivalent to yes.
 *
 * MIDI devices, MIDI instruments, and playback techniques are
 * changed using the midi-device, midi-instrument, and play
 * elements defined in the common.mod file. When there are
 * multiple instances of these elements, they should be grouped
 * together by instrument using the id attribute values.
 *
 * The offset element is used to indicate that the sound takes
 * place offset from the current score position. If the sound
 * element is a child of a direction element, the sound offset
 * element overrides the direction offset element if both
 * elements are present. Note that the offset reflects the
 * intended musical position for the change in sound. It
 * should not be used to compensate for latency issues in
 * particular hardware configurations.
 */
export interface Sound extends TimeOnly {
  _snapshot?: Sound;
  softPedal: string;
  midiInstruments: MidiInstrument[];
  pan: string;
  tocoda: string;
  decapo: boolean;
  divisions: number;
  pizzicato: boolean;
  coda: string;
  segno: string;
  elevation: string;
  fine: string;
  damperPedal: string;
  dynamics: string;
  plays: Play[];
  offset: Offset;
  sostenutoPedal: string;
  dalsegno: string;
  midiDevices: MidiDevice[];
  tempo: string;
  forwardRepeat: boolean;
  _class?: string;
}

function xmlToSound(node: Element) {
  let ret: Sound = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "midi-instrument") {
      let dataMidiInstruments = xmlToMidiInstrument(ch);
      ret.midiInstruments = (ret.midiInstruments || []).concat(
        dataMidiInstruments
      );
    }
    if (ch.nodeName === "play") {
      let dataPlays = xmlToPlay(ch);
      ret.plays = (ret.plays || []).concat(dataPlays);
    }
    if (ch.nodeName === "offset") {
      let dataOffset = xmlToOffset(ch);
      ret.offset = dataOffset;
    }
    if (ch.nodeName === "midi-device") {
      let dataMidiDevices = xmlToMidiDevice(ch);
      ret.midiDevices = (ret.midiDevices || []).concat(dataMidiDevices);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "soft-pedal") {
      let dataSoftPedal = getString(ch2, true);
      ret.softPedal = dataSoftPedal;
    }
    if (ch2.name === "pan") {
      let dataPan = getString(ch2, true);
      ret.pan = dataPan;
    }
    if (ch2.name === "tocoda") {
      let dataTocoda = getString(ch2, true);
      ret.tocoda = dataTocoda;
    }
    if (ch2.name === "decapo") {
      let dataDecapo = xmlToYesNo(ch2);
      ret.decapo = dataDecapo;
    }
    if (ch2.name === "divisions") {
      let dataDivisions = getNumber(ch2, true);
      ret.divisions = dataDivisions;
    }
    if (ch2.name === "pizzicato") {
      let dataPizzicato = xmlToYesNo(ch2);
      ret.pizzicato = dataPizzicato;
    }
    if (ch2.name === "coda") {
      let dataCoda = getString(ch2, true);
      ret.coda = dataCoda;
    }
    if (ch2.name === "segno") {
      let dataSegno = getString(ch2, true);
      ret.segno = dataSegno;
    }
    if (ch2.name === "elevation") {
      let dataElevation = getString(ch2, true);
      ret.elevation = dataElevation;
    }
    if (ch2.name === "fine") {
      let dataFine = getString(ch2, true);
      ret.fine = dataFine;
    }
    if (ch2.name === "damper-pedal") {
      let dataDamperPedal = getString(ch2, true);
      ret.damperPedal = dataDamperPedal;
    }
    if (ch2.name === "dynamics") {
      let dataDynamics = getString(ch2, true);
      ret.dynamics = dataDynamics;
    }
    if (ch2.name === "time-only") {
      let dataTimeOnly = getString(ch2, true);
      ret.timeOnly = dataTimeOnly;
    }
    if (ch2.name === "sostenuto-pedal") {
      let dataSostenutoPedal = getString(ch2, true);
      ret.sostenutoPedal = dataSostenutoPedal;
    }
    if (ch2.name === "dalsegno") {
      let dataDalsegno = getString(ch2, true);
      ret.dalsegno = dataDalsegno;
    }
    if (ch2.name === "tempo") {
      let dataTempo = getString(ch2, true);
      ret.tempo = dataTempo;
    }
    if (ch2.name === "forward-repeat") {
      let dataForwardRepeat = xmlToYesNo(ch2);
      ret.forwardRepeat = dataForwardRepeat;
    }
  }
  ret._class = "Sound";
  return ret;
}

/**
 * Works and movements are optionally identified by number
 * and title. The work element also may indicate a link
 * to the opus document that composes multiple movements
 * into a collection.
 */
export interface Work {
  _snapshot?: Work;
  workNumber: string;
  workTitle: string;
  opus: Opus;
}

function xmlToWork(node: Element) {
  let ret: Work = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "work-number") {
      let dataWorkNumber = getString(ch, true);
      ret.workNumber = dataWorkNumber;
    }
    if (ch.nodeName === "work-title") {
      let dataWorkTitle = getString(ch, true);
      ret.workTitle = dataWorkTitle;
    }
    if (ch.nodeName === "opus") {
      let dataOpus = xmlToOpus(ch);
      ret.opus = dataOpus;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Ripieno MusicXML does not support this field.
 */
export interface Opus {
  _snapshot?: Opus;
}

function xmlToOpus(node: Element) {
  let ret: Opus = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * Collect score-wide defaults. This includes scaling
 * and layout, defined in layout.mod, and default values
 * for the music font, word font, lyric font, and
 * lyric language. The number and name attributes in
 * lyric-font and lyric-language elements are typically
 * used when lyrics are provided in multiple languages.
 * If the number and name attributes are omitted, the
 * lyric-font and lyric-language values apply to all
 * numbers and names.
 */
export interface Defaults {
  _snapshot?: Defaults;
  wordFont: WordFont;
  lyricLanguages: LyricLanguage[];
  lyricFonts: LyricFont[];
  pageLayout: PageLayout;
  systemLayout: SystemLayout;
  appearance: Appearance;
  scaling: Scaling;
  staffLayouts: StaffLayout[];
  musicFont: MusicFont;
}

function xmlToDefaults(node: Element) {
  let ret: Defaults = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "word-font") {
      let dataWordFont = xmlToWordFont(ch);
      ret.wordFont = dataWordFont;
    }
    if (ch.nodeName === "lyric-language") {
      let dataLyricLanguages = xmlToLyricLanguage(ch);
      ret.lyricLanguages = (ret.lyricLanguages || []).concat(
        dataLyricLanguages
      );
    }
    if (ch.nodeName === "lyric-font") {
      let dataLyricFonts = xmlToLyricFont(ch);
      ret.lyricFonts = (ret.lyricFonts || []).concat(dataLyricFonts);
    }
    if (ch.nodeName === "page-layout") {
      let dataPageLayout = xmlToPageLayout(ch);
      ret.pageLayout = dataPageLayout;
    }
    if (ch.nodeName === "system-layout") {
      let dataSystemLayout = xmlToSystemLayout(ch);
      ret.systemLayout = dataSystemLayout;
    }
    if (ch.nodeName === "appearance") {
      let dataAppearance = xmlToAppearance(ch);
      ret.appearance = dataAppearance;
    }
    if (ch.nodeName === "scaling") {
      let dataScaling = xmlToScaling(ch);
      ret.scaling = dataScaling;
    }
    if (ch.nodeName === "staff-layout") {
      let dataStaffLayouts = xmlToStaffLayout(ch);
      ret.staffLayouts = (ret.staffLayouts || []).concat(dataStaffLayouts);
    }
    if (ch.nodeName === "music-font") {
      let dataMusicFont = xmlToMusicFont(ch);
      ret.musicFont = dataMusicFont;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface MusicFont extends Font {
  _snapshot?: MusicFont;
}

function xmlToMusicFont(node: Element) {
  let ret: MusicFont = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
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

export interface WordFont extends Font {
  _snapshot?: WordFont;
}

function xmlToWordFont(node: Element) {
  let ret: WordFont = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
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

export interface LyricFont extends Font {
  _snapshot?: LyricFont;
  number: number;
  name: string;
}

function xmlToLyricFont(node: Element) {
  let ret: LyricFont = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "name") {
      let dataName = getString(ch2, true);
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

export interface LyricLanguage {
  _snapshot?: LyricLanguage;
  number: number;
  name: string;
}

function xmlToLyricLanguage(node: Element) {
  let ret: LyricLanguage = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
    }
    if (ch2.name === "name") {
      let dataName = getString(ch2, true);
      ret.name = dataName;
    }
  }
  return ret;
}

/**
 * Credit elements refer to the title, composer, arranger,
 * lyricist, copyright, dedication, and other text that usually
 * appears on the first page of a score. The credit-words
 * and credit-image elements are similar to the words and
 * image elements for directions. However, since the
 * credit is not part of a measure, the default-x and
 * default-y attributes adjust the origin relative to the
 * bottom left-hand corner of the first page. The
 * enclosure for credit-words is none by default.
 *
 * By default, a series of credit-words elements within a
 * single credit element follow one another in sequence
 * visually. Non-positional formatting attributes are carried
 * over from the previous element by default.
 *
 * The page attribute for the credit element, new in Version
 * 2.0, specifies the page number where the credit should
 * appear. This is an integer value that starts with 1 for the
 * first page. Its value is 1 by default. Since credits occur
 * before the music, these page numbers do not refer to the
 * page numbering specified by the print element's page-number
 * attribute.
 */
export interface Credit {
  _snapshot?: Credit;
  creditTypes: string[];
  creditWords: CreditWords[];
  creditImage: CreditImage;
  page: number;
}

function xmlToCredit(node: Element) {
  let ret: Credit = <any>{};
  ret.creditWords = [];
  let foundCreditTypes = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "credit-type") {
      let dataCreditTypes = getString(ch, true);
      ret.creditTypes = (ret.creditTypes || []).concat(dataCreditTypes);
      foundCreditTypes = true;
    }
    if (ch.nodeName === "credit-words") {
      let dataCreditWords = xmlToCreditWords(ch);
      ret.creditWords.push(dataCreditWords);
    }
    if (ch.nodeName === "credit-image") {
      let dataCreditImage = xmlToCreditImage(ch);
      ret.creditImage = dataCreditImage;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "page") {
      let dataPage = getNumber(ch2, true);
      ret.page = dataPage;
    }
  }
  if (!foundCreditTypes) {
    ret.creditTypes = [];
  }
  return ret;
}

export interface CreditWords extends TextFormatting {
  _snapshot?: CreditWords;
  words: string;
}

function xmlToCreditWords(node: Element) {
  let ret: CreditWords = <any>{};
  let foundJustify = false;
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundHalign = false;
  let foundValign = false;
  let foundUnderline = false;
  let foundOverline = false;
  let foundLineThrough = false;
  let foundRotation = false;
  let foundLetterSpacing = false;
  let foundLineHeight = false;
  let foundDir = false;
  let foundEnclosure = false;
  let foundFontFamily = false;
  let foundRelativeX = false;
  let foundRelativeY = false;
  let foundDefaultX = false;
  let foundDefaultY = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
      foundDefaultX = true;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
      foundRelativeY = true;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
      foundDefaultY = true;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
      foundRelativeX = true;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
      foundFontFamily = true;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValign = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valign = dataValign;
      foundValign = true;
    }
    if (ch2.name === "underline") {
      let dataUnderline = getNumber(ch2, true);
      ret.underline = dataUnderline;
      foundUnderline = true;
    }
    if (ch2.name === "overline") {
      let dataOverline = getNumber(ch2, true);
      ret.overline = dataOverline;
      foundOverline = true;
    }
    if (ch2.name === "line-through") {
      let dataLineThrough = getNumber(ch2, true);
      ret.lineThrough = dataLineThrough;
      foundLineThrough = true;
    }
    if (ch2.name === "rotation") {
      let dataRotation = getNumber(ch2, true);
      ret.rotation = dataRotation;
      foundRotation = true;
    }
    if (ch2.name === "letter-spacing") {
      let dataLetterSpacing = getString(ch2, true);
      ret.letterSpacing = dataLetterSpacing;
      foundLetterSpacing = true;
    }
    if (ch2.name === "line-height") {
      let dataLineHeight = getString(ch2, true);
      ret.lineHeight = dataLineHeight;
      foundLineHeight = true;
    }
    if (ch2.name === "dir") {
      let dataDir = getDirectionMode(ch2, DirectionMode.Ltr);
      ret.dir = dataDir;
      foundDir = true;
    }
    if (ch2.name === "enclosure") {
      let dataEnclosure = getEnclosureShape(ch2, EnclosureShape.None);
      ret.enclosure = dataEnclosure;
      foundEnclosure = true;
    }
  }
  let ch3 = node;
  let dataWords = getString(ch3, true);
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
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
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

export interface CreditImage extends Position, Halign, ValignImage {
  _snapshot?: CreditImage;
  type: string;
  source: string;
}

function xmlToCreditImage(node: Element) {
  let ret: CreditImage = <any>{};
  let foundHalign = false;
  let foundValignImage = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "halign") {
      let dataHalign = getLeftCenterRight(
        ch2,
        (<any>ret).justify || LeftCenterRight.Left
      );
      ret.halign = dataHalign;
      foundHalign = true;
    }
    if (ch2.name === "valign") {
      let dataValignImage = getTopMiddleBottomBaseline(
        ch2,
        TopMiddleBottomBaseline.Bottom
      );
      ret.valignImage = dataValignImage;
      foundValignImage = true;
    }
    if (ch2.name === "type") {
      let dataType = getString(ch2, true);
      ret.type = dataType;
    }
    if (ch2.name === "source") {
      let dataSource = getString(ch2, true);
      ret.source = dataSource;
    }
  }
  if (!foundHalign) {
    ret.halign = (<any>ret).justify || LeftCenterRight.Left;
  }
  if (!foundValignImage) {
    ret.valignImage = TopMiddleBottomBaseline.Bottom;
  }
  return ret;
}

/**
 * The part-list identifies the different musical parts in
 * this movement. Each part has an ID that is used later
 * within the musical data. Since parts may be encoded
 * separately and combined later, identification elements
 * are present at both the score and score-part levels.
 * There must be at least one score-part, combined as
 * desired with part-group elements that indicate braces
 * and brackets. Parts are ordered from top to bottom in
 * a score based on the order in which they appear in the
 * part-list.
 *
 * Each MusicXML part corresponds to a track in a Standard
 * MIDI Format 1 file. The score-instrument elements are
 * used when there are multiple instruments per track.
 * The midi-device element is used to make a MIDI device
 * or port assignment for the given track or specific MIDI
 * instruments. Initial midi-instrument assignments may be
 * made here as well.
 */
export type PartList = Array<ScorePart | PartGroup>;

function xmlToPartList(node: Element): PartList {
  let ret: PartList = [];
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "score-part") {
      let dataScoreParts = xmlToScorePart(ch);
      ret.push(dataScoreParts);
    }
    if (ch.nodeName === "part-group") {
      let dataPartGroups = xmlToPartGroup(ch);
      ret.push(dataPartGroups);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface ScorePart {
  _snapshot?: ScorePart;
  identification?: Identification;
  partNameDisplay?: PartNameDisplay;
  scoreInstruments?: ScoreInstrument[];
  midiDevices?: MidiDevice[];
  partName: PartName;
  partAbbreviationDisplay?: PartAbbreviationDisplay;
  partAbbreviation?: PartAbbreviation;
  groups?: string[];
  midiInstruments?: MidiInstrument[];
  id: string;
  /** Equals "ScorePart" */
  _class?: string;
}

function xmlToScorePart(node: Element) {
  let ret: ScorePart = {
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
    id: "",
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "identification") {
      let dataIdentification = xmlToIdentification(ch);
      ret.identification = dataIdentification;
    }
    if (ch.nodeName === "part-name-display") {
      let dataPartNameDisplay = xmlToPartNameDisplay(ch);
      ret.partNameDisplay = dataPartNameDisplay;
    }
    if (ch.nodeName === "score-instrument") {
      let dataScoreInstruments = xmlToScoreInstrument(ch);
      ret.scoreInstruments = (ret.scoreInstruments || []).concat(
        dataScoreInstruments
      );
    }
    if (ch.nodeName === "midi-device") {
      let dataMidiDevices = xmlToMidiDevice(ch);
      ret.midiDevices = (ret.midiDevices || []).concat(dataMidiDevices);
    }
    if (ch.nodeName === "part-name") {
      let dataPartName = xmlToPartName(ch);
      ret.partName = dataPartName;
    }
    if (ch.nodeName === "part-abbreviation-display") {
      let dataPartAbbreviationDisplay = xmlToPartAbbreviationDisplay(ch);
      ret.partAbbreviationDisplay = dataPartAbbreviationDisplay;
    }
    if (ch.nodeName === "part-abbreviation") {
      let dataPartAbbreviation = xmlToPartAbbreviation(ch);
      ret.partAbbreviation = dataPartAbbreviation;
    }
    if (ch.nodeName === "group") {
      let dataGroups = getString(ch, true);
      ret.groups = (ret.groups || []).concat(dataGroups);
    }
    if (ch.nodeName === "midi-instrument") {
      let dataMidiInstruments = xmlToMidiInstrument(ch);
      ret.midiInstruments = (ret.midiInstruments || []).concat(
        dataMidiInstruments
      );
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "id") {
      let dataId = getString(ch2, true);
      ret.id = dataId;
    }
  }
  return ret;
}

/**
 * The part-name indicates the full name of the musical part.
 * The part-abbreviation indicates the abbreviated version of
 * the name of the musical part. The part-name will often
 * precede the first system, while the part-abbreviation will
 * precede the other systems. The formatting attributes for
 * these elements are deprecated in Version 2.0 in favor of
 * the new part-name-display and part-abbreviation-display
 * elements. These are defined in the common.mod file as they
 * are used in both the part-list and print elements. They
 * provide more complete formatting control for how part names
 * and abbreviations appear in a score.
 */
export interface PartName extends PrintStyle, PrintObject, Justify {
  _snapshot?: PartName;
  partName: string;
}

function xmlToPartName(node: Element) {
  let ret: PartName = {
    partName: "",
    defaultX: null,
    defaultY: null,
    relativeX: null,
    relativeY: null,
    fontFamily: "",
    fontSize: "",
  };
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPrintObject = false;
  let foundJustify = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
  }
  let ch3 = node;
  let dataPartName = getString(ch3, true);
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

/**
 * The part-name indicates the full name of the musical part.
 * The part-abbreviation indicates the abbreviated version of
 * the name of the musical part. The part-name will often
 * precede the first system, while the part-abbreviation will
 * precede the other systems. The formatting attributes for
 * these elements are deprecated in Version 2.0 in favor of
 * the new part-name-display and part-abbreviation-display
 * elements. These are defined in the common.mod file as they
 * are used in both the part-list and print elements. They
 * provide more complete formatting control for how part names
 * and abbreviations appear in a score.
 */
export interface PartAbbreviation extends PrintStyle, PrintObject, Justify {
  _snapshot?: PartAbbreviation;
  abbreviation: string;
}

function xmlToPartAbbreviation(node: Element) {
  let ret: PartAbbreviation = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundPrintObject = false;
  let foundJustify = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "print-object") {
      let dataPrintObject = xmlToYesNo(ch2);
      ret.printObject = dataPrintObject;
      foundPrintObject = true;
    }
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
  }
  let ch3 = node;
  let dataAbbreviation = getString(ch3, true);
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

/**
 * The part-group element indicates groupings of parts in the
 * score, usually indicated by braces and brackets. Braces
 * that are used for multi-staff parts should be defined in
 * the attributes element for that part.
 *
 * A part-group element is not needed for a single multi-staff
 * part. By default, multi-staff parts include a brace symbol
 * and (if appropriate given the bar-style) common barlines.
 * The symbol formatting for a multi-staff part can be more
 * fully specified using the part-symbol element.
 */
export interface PartGroup extends Editorial {
  _snapshot?: PartGroup;
  groupNameDisplay: GroupNameDisplay;
  groupSymbol: GroupSymbol;
  groupName: GroupName;
  groupAbbreviationDisplay: GroupAbbreviationDisplay;
  groupBarline: GroupBarline;
  number: number;
  groupAbbreviation: GroupAbbreviation;
  type: StartStop;
  groupTime: GroupTime;
  /** Equals "PartGroup" */
  _class?: string;
}

function xmlToPartGroup(node: Element) {
  let ret: PartGroup = <any>{
    _class: "PartGroup",
  };
  let foundNumber_ = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "group-name-display") {
      let dataGroupNameDisplay = xmlToGroupNameDisplay(ch);
      ret.groupNameDisplay = dataGroupNameDisplay;
    }
    if (ch.nodeName === "group-symbol") {
      let dataGroupSymbol = xmlToGroupSymbol(ch);
      ret.groupSymbol = dataGroupSymbol;
    }
    if (ch.nodeName === "group-name") {
      let dataGroupName = xmlToGroupName(ch);
      ret.groupName = dataGroupName;
    }
    if (ch.nodeName === "group-abbreviation-display") {
      let dataGroupAbbreviationDisplay = xmlToGroupAbbreviationDisplay(ch);
      ret.groupAbbreviationDisplay = dataGroupAbbreviationDisplay;
    }
    if (ch.nodeName === "group-barline") {
      let dataGroupBarline = xmlToGroupBarline(ch);
      ret.groupBarline = dataGroupBarline;
    }
    if (ch.nodeName === "footnote") {
      let dataFootnote = xmlToFootnote(ch);
      ret.footnote = dataFootnote;
    }
    if (ch.nodeName === "level") {
      let dataLevel = xmlToLevel(ch);
      ret.level = dataLevel;
    }
    if (ch.nodeName === "group-abbreviation") {
      let dataGroupAbbreviation = xmlToGroupAbbreviation(ch);
      ret.groupAbbreviation = dataGroupAbbreviation;
    }
    if (ch.nodeName === "group-time") {
      let dataGroupTime = xmlToGroupTime(ch);
      ret.groupTime = dataGroupTime;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "number") {
      let dataNumber = getNumber(ch2, true);
      ret.number = dataNumber;
      foundNumber_ = true;
    }
    if (ch2.name === "type") {
      let dataType = getStartStop(ch2, null);
      ret.type = dataType;
    }
  }
  if (!foundNumber_) {
    ret.number = 1;
  }
  return ret;
}

/**
 * As with parts, groups can have a name and abbreviation.
 * Formatting attributes for group-name and group-abbreviation
 * are deprecated in Version 2.0 in favor of the new
 * group-name-display and group-abbreviation-display elements.
 */
export interface GroupName extends PrintStyle, Justify {
  _snapshot?: GroupName;
  name: string;
}

function xmlToGroupName(node: Element) {
  let ret: GroupName = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundJustify = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
  }
  let ch3 = node;
  let dataName = getString(ch3, true);
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

/**
 * Formatting specified in the group-name-display and
 * group-abbreviation-display elements overrides formatting
 * specified in the group-name and group-abbreviation
 * elements, respectively.
 */
export interface GroupNameDisplay extends PrintObject {
  _snapshot?: GroupNameDisplay;
  name: TextSegment[];
}

/**
 * As with parts, groups can have a name and abbreviation.
 * Formatting attributes for group-name and group-abbreviation
 * are deprecated in Version 2.0 in favor of the new
 * group-name-display and group-abbreviation-display elements.
 */
export interface GroupAbbreviation extends PrintStyle, Justify {
  _snapshot?: GroupAbbreviation;
  text: string;
}

function xmlToGroupAbbreviation(node: Element) {
  let ret: GroupAbbreviation = <any>{};
  let foundFontWeight = false;
  let foundFontStyle = false;
  let foundColor = false;
  let foundJustify = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "font-family") {
      let dataFontFamily = getString(ch2, true);
      ret.fontFamily = dataFontFamily;
    }
    if (ch2.name === "font-weight") {
      let dataFontWeight = getNormalBold(ch2, NormalBold.Normal);
      ret.fontWeight = dataFontWeight;
      foundFontWeight = true;
    }
    if (ch2.name === "font-style") {
      let dataFontStyle = getNormalItalic(ch2, NormalItalic.Normal);
      ret.fontStyle = dataFontStyle;
      foundFontStyle = true;
    }
    if (ch2.name === "font-size") {
      let dataFontSize = getString(ch2, true);
      ret.fontSize = dataFontSize;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
    if (ch2.name === "justify") {
      let dataJustify = getLeftCenterRight(ch2, LeftCenterRight.Left);
      ret.justify = dataJustify;
      foundJustify = true;
    }
  }
  let ch3 = node;
  let dataText = getString(ch3, true);
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

/**
 * Formatting specified in the group-name-display and
 * group-abbreviation-display elements overrides formatting
 * specified in the group-name and group-abbreviation
 * elements, respectively.
 */
export interface GroupAbbreviationDisplay extends PrintObject {
  _snapshot?: GroupAbbreviationDisplay;
  name: TextSegment[];
}

/**
 * The group-symbol element indicates how the symbol for
 * a group is indicated in the score. Values include none,
 * brace, line, bracket, and square; the default is none.
 */
export interface GroupSymbol extends Position, Color {
  _snapshot?: GroupSymbol;
  data: PartSymbolType;
}

function xmlToGroupSymbol(node: Element) {
  let ret: GroupSymbol = <any>{};
  let foundData = false;
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "default-x") {
      let dataDefaultX = getNumber(ch2, true);
      ret.defaultX = dataDefaultX;
    }
    if (ch2.name === "relative-y") {
      let dataRelativeY = getNumber(ch2, true);
      ret.relativeY = dataRelativeY;
    }
    if (ch2.name === "default-y") {
      let dataDefaultY = getNumber(ch2, true);
      ret.defaultY = dataDefaultY;
    }
    if (ch2.name === "relative-x") {
      let dataRelativeX = getNumber(ch2, true);
      ret.relativeX = dataRelativeX;
    }
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getPartSymbolType(ch3, PartSymbolType.None);
  ret.data = dataData;
  if (!foundData) {
    ret.data = PartSymbolType.None;
  }
  if (!foundColor) {
    ret.color = "#000000";
  }
  return ret;
}

/**
 * The group-barline element indicates if the group should
 * have common barlines. Values can be yes, no, or
 * Mensurstrich.
 */
export interface GroupBarline extends Color {
  _snapshot?: GroupBarline;
  data: string;
}

function xmlToGroupBarline(node: Element) {
  let ret: GroupBarline = <any>{};
  let foundColor = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "color") {
      let dataColor = getString(ch2, true);
      ret.color = dataColor;
      foundColor = true;
    }
  }
  let ch3 = node;
  let dataData = getString(ch3, true);
  ret.data = dataData;
  if (!foundColor) {
    ret.color = "#000000";
  }
  return ret;
}

/**
 * The group-time element indicates that the
 * displayed time signatures should stretch across all parts
 * and staves in the group.
 */
export interface GroupTime {
  _snapshot?: GroupTime;
}

function xmlToGroupTime(node: Element) {
  let ret: GroupTime = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The score-instrument element allows for multiple
 * instruments per score-part. As with the score-part
 * element, each score-instrument has a required ID
 * attribute, a name, and an optional abbreviation. The
 * instrument-name and instrument-abbreviation are
 * typically used within a software application, rather
 * than appearing on the printed page of a score.
 *
 * A score-instrument element is also required if the
 * score specifies MIDI 1.0 channels, banks, or programs.
 * An initial midi-instrument assignment can also
 * be made here.
 *
 * The instrument-sound and virtual-instrument elements
 * are new as of Version 3.0. The instrument-sound element
 * describes the default timbre of the score-instrument. This
 * description is independent of a particular virtual or
 * MIDI instrument specification and allows playback to be
 * shared more easily between applications and libraries.
 * The virtual-instrument element defines a specific virtual
 * instrument used for an instrument sound. The
 * virtual-library element indicates the virtual instrument
 * library name, and the virtual-name element indicates the
 * library-specific name for the virtual instrument.
 *
 * The solo and ensemble elements are new as of Version
 * 2.0. The solo element is present if performance is
 * intended by a solo instrument. The ensemble element
 * is present if performance is intended by an ensemble
 * such as an orchestral section. The text of the
 * ensemble element contains the size of the section,
 * or is empty if the ensemble size is not specified.
 *
 * The midi-instrument element is defined in the common.mod
 * file, as it can be used within both the score-part and
 * sound elements.
 */
export interface ScoreInstrument {
  _snapshot?: ScoreInstrument;
  instrumentName: string;
  instrumentSound?: string;
  ensemble?: string;
  virtualInstrument?: VirtualInstrument;
  instrumentAbbreviation?: string;
  solo?: Solo;
  id: string;
}

function xmlToScoreInstrument(node: Element) {
  let ret: ScoreInstrument = {
    instrumentName: "",
    instrumentSound: "",
    ensemble: "",
    virtualInstrument: null,
    instrumentAbbreviation: "",
    solo: null,
    id: "",
  };
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "instrument-name") {
      let dataInstrumentName = getString(ch, true);
      ret.instrumentName = dataInstrumentName;
    }
    if (ch.nodeName === "instrument-sound") {
      let dataInstrumentSound = getString(ch, true);
      ret.instrumentSound = dataInstrumentSound;
    }
    if (ch.nodeName === "ensemble") {
      let dataEnsemble = getString(ch, true);
      ret.ensemble = dataEnsemble;
    }
    if (ch.nodeName === "virtual-instrument") {
      let dataVirtualInstrument = xmlToVirtualInstrument(ch);
      ret.virtualInstrument = dataVirtualInstrument;
    }
    if (ch.nodeName === "instrument-abbreviation") {
      let dataInstrumentAbbreviation = getString(ch, true);
      ret.instrumentAbbreviation = dataInstrumentAbbreviation;
    }
    if (ch.nodeName === "solo") {
      let dataSolo = xmlToSolo(ch);
      ret.solo = dataSolo;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "id") {
      let dataId = getString(ch2, true);
      ret.id = dataId;
    }
  }
  return ret;
}

export interface Solo {
  _snapshot?: Solo;
}

function xmlToSolo(node: Element) {
  let ret: Solo = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

export interface VirtualInstrument {
  _snapshot?: VirtualInstrument;
  virtualLibrary: string;
  virtualName: string;
}

function xmlToVirtualInstrument(node: Element) {
  let ret: VirtualInstrument = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "virtual-library") {
      let dataVirtualLibrary = getString(ch, true);
      ret.virtualLibrary = dataVirtualLibrary;
    }
    if (ch.nodeName === "virtual-name") {
      let dataVirtualName = getString(ch, true);
      ret.virtualName = dataVirtualName;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The score-header entity contains basic score metadata
 * about the work and movement, score-wide defaults for
 * layout and fonts, credits that appear on the first page,
 * and the part list.
 */
export interface ScoreHeader {
  _snapshot?: ScoreHeader;
  movementTitle: string;
  identification: Identification;
  defaults: Defaults;
  work: Work;
  credits: Credit[];
  partList: PartList;
  movementNumber: string;
}

function xmlToScoreHeader(node: Element) {
  let ret: ScoreHeader = <any>{};
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "movement-title") {
      let dataMovementTitle = getString(ch, true);
      ret.movementTitle = dataMovementTitle;
    }
    if (ch.nodeName === "identification") {
      let dataIdentification = xmlToIdentification(ch);
      ret.identification = dataIdentification;
    }
    if (ch.nodeName === "defaults") {
      let dataDefaults = xmlToDefaults(ch);
      ret.defaults = dataDefaults;
    }
    if (ch.nodeName === "work") {
      let dataWork = xmlToWork(ch);
      ret.work = dataWork;
    }
    if (ch.nodeName === "credit") {
      let dataCredits = xmlToCredit(ch);
      ret.credits = (ret.credits || []).concat(dataCredits);
    }
    if (ch.nodeName === "part-list") {
      let dataPartList = xmlToPartList(ch);
      ret.partList = dataPartList;
    }
    if (ch.nodeName === "movement-number") {
      let dataMovementNumber = getString(ch, true);
      ret.movementNumber = dataMovementNumber;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return ret;
}

/**
 * The score is the root element for the DTD. It includes
 * the score-header entity, followed by a series of
 * measures with parts inside.
 *
 * See also score-partwise.
 */
export interface ScoreTimewise extends DocumentAttributes, ScoreHeader {
  _snapshot?: ScoreTimewise;
  measures: Measure[];
}

function xmlToScoreTimewise(node: Element) {
  let ret: ScoreTimewise = <any>{};
  let foundVersion_ = false;
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "measure") {
      let dataMeasures = xmlToMeasure(ch);
      ret.measures = (ret.measures || []).concat(dataMeasures);
    }
    if (ch.nodeName === "movement-title") {
      let dataMovementTitle = getString(ch, true);
      ret.movementTitle = dataMovementTitle;
    }
    if (ch.nodeName === "identification") {
      let dataIdentification = xmlToIdentification(ch);
      ret.identification = dataIdentification;
    }
    if (ch.nodeName === "defaults") {
      let dataDefaults = xmlToDefaults(ch);
      ret.defaults = dataDefaults;
    }
    if (ch.nodeName === "work") {
      let dataWork = xmlToWork(ch);
      ret.work = dataWork;
    }
    if (ch.nodeName === "credit") {
      let dataCredits = xmlToCredit(ch);
      ret.credits = (ret.credits || []).concat(dataCredits);
    }
    if (ch.nodeName === "part-list") {
      let dataPartList = xmlToPartList(ch);
      ret.partList = dataPartList;
    }
    if (ch.nodeName === "movement-number") {
      let dataMovementNumber = getString(ch, true);
      ret.movementNumber = dataMovementNumber;
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
    if (ch2.name === "version") {
      let dataVersion = getString(ch2, true);
      ret.version = dataVersion;
      foundVersion_ = true;
    }
  }
  if (!foundVersion_) {
    ret.version = "1.0";
  }
  return ret;
}

function xmlToPart(node: Element) {
  let rarr: any[] = [];
  for (let i = 0; i < node.children.length; ++i) {
    let ch = node.children[i];
    if (ch.nodeName === "note") {
      let data: any = xmlToNote(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "backup") {
      let data: any = xmlToBackup(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "harmony") {
      let data: any = xmlToHarmony(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "forward") {
      let data: any = xmlToForward(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "print") {
      let data: any = xmlToPrint(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "figured-bass") {
      let data: any = xmlToFiguredBass(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "direction") {
      let data: any = xmlToDirection(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "attributes") {
      let data: any = xmlToAttributes(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "sound") {
      let data: any = xmlToSound(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "barline") {
      let data: any = xmlToBarline(ch);
      rarr = (rarr || []).concat(data);
    }
    if (ch.nodeName === "grouping") {
      let data: any = xmlToGrouping(ch);
      rarr = (rarr || []).concat(data);
    }
  }
  for (let i = 0; i < node.attributes.length; ++i) {
    let ch2 = node.attributes[i];
  }
  return rarr;
}

/**
 * Represents a measure.
 */
export interface Measure {
  _snapshot?: Measure;
  number: string;
  implicit?: boolean;
  width?: number;
  parts: { [key: string]: any[] };
  nonControlling?: boolean;
}

/*---- Serialization ----------------------------------------------------------------------------*/

/**
 * Safe, escaped tagged template handler.
 */
function xml(
  literals: TemplateStringsArray,
  ...vals: (number | string)[]
): string {
  let escaped = "";
  for (let i = 0; i < literals.length; ++i) {
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
function yesNo(literals: TemplateStringsArray, ...booleans: any[]): string {
  let escaped = "";
  for (let i = 0; i < literals.length; ++i) {
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
function dangerous(literals: TemplateStringsArray, ...vals: string[]): string {
  let result = "";
  for (let i = 0; i < literals.length; ++i) {
    result += literals[i];
    if (i < vals.length) {
      result += vals[i];
    }
  }
  return result;
}

function defined(val: any): boolean {
  return val !== undefined && val !== null && val !== "";
}

function scalingToXML(scaling: Scaling): string {
  // <!ELEMENT scaling (millimeters, tenths)>
  let children: string[] = [];

  if (defined(scaling.millimeters)) {
    children.push(millimetersToXML(scaling.millimeters));
  }
  if (defined(scaling.tenths)) {
    children.push(tenthsToXML(scaling.tenths));
  }

  return dangerous`<scaling>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</scaling>`;
}

function millimetersToXML(mm: number): string {
  return xml`<millimeters>${mm}</millimeters>`;
}

function tenthsToXML(tenths: number): string {
  return xml`<tenths>${tenths}</tenths>`;
}

function pageLayoutToXML(pageLayout: PageLayout): string {
  // <!ELEMENT page-layout ((page-height, page-width)?,
  //     (page-margins, page-margins?)?)>
  // <!ELEMENT page-height %layout-tenths;>
  // <!ELEMENT page-width %layout-tenths;>
  let children: string[] = [];

  if (defined(pageLayout.pageHeight)) {
    children.push(xml`<page-height>${pageLayout.pageHeight}</page-height>`);
  }
  if (defined(pageLayout.pageWidth)) {
    children.push(xml`<page-width>${pageLayout.pageWidth}</page-width>`);
  }
  (pageLayout.pageMargins || []).forEach((pageMargins) => {
    children.push(pageMarginsToXML(pageMargins));
  });

  return dangerous`<page-layout>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</page-layout>`;
}

let oddEvenBothToXML: { [key: number]: string } = {
  2: "both",
  1: "even",
  0: "odd",
};

function pageMarginsToXML(pageMargins: PageMargins): string {
  // <!ELEMENT page-margins (left-margin, right-margin,
  //     top-margin, bottom-margin)>
  // <!ATTLIST page-margins
  //     type (odd | even | both) #IMPLIED
  // >
  let children: string[] = [];

  children = children.concat(hmarginsToXML(pageMargins));
  children = children.concat(vmarginsToXML(pageMargins));

  let attribs = "";
  if (defined(pageMargins.type)) {
    attribs += xml` type="${oddEvenBothToXML[pageMargins.type]}"`;
  }

  return dangerous`<page-margins${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</page-margins>`;
}

function hmarginsToXML(hmargins: {
  leftMargin: number;
  rightMargin: number;
}): string[] {
  // <!ELEMENT left-margin %layout-tenths;>
  // <!ELEMENT right-margin %layout-tenths;>
  let children: string[] = [];
  if (defined(hmargins.leftMargin)) {
    children.push(xml`<left-margin>${hmargins.leftMargin}</left-margin>`);
  }
  if (defined(hmargins.rightMargin)) {
    children.push(xml`<right-margin>${hmargins.rightMargin}</right-margin>`);
  }
  return children;
}

function vmarginsToXML(hmargins: {
  topMargin: number;
  bottomMargin: number;
}): string[] {
  // <!ELEMENT top-margin %layout-tenths;>
  // <!ELEMENT bottom-margin %layout-tenths;>
  let children: string[] = [];
  if (defined(hmargins.topMargin)) {
    children.push(xml`<top-margin>${hmargins.topMargin}</top-margin>`);
  }
  if (defined(hmargins.bottomMargin)) {
    children.push(xml`<bottom-margin>${hmargins.bottomMargin}</bottom-margin>`);
  }
  return children;
}

function systemLayoutToXML(systemLayout: SystemLayout): string {
  // <!ELEMENT system-layout
  //     (system-margins?, system-distance?,
  //      top-system-distance?, system-dividers?)>
  let children: string[] = [];

  if (defined(systemLayout.systemMargins)) {
    children.push(systemMarginsToXML(systemLayout.systemMargins));
  }
  if (defined(systemLayout.systemDistance)) {
    children.push(
      xml`<system-distance>${systemLayout.systemDistance}</system-distance>`
    );
  }
  if (defined(systemLayout.topSystemDistance)) {
    children.push(
      xml`<top-system-distance>${systemLayout.topSystemDistance}</top-system-distance>`
    );
  }
  if (defined(systemLayout.systemDividers)) {
    children.push(systemDividersToXML(systemLayout.systemDividers));
  }

  return dangerous`<system-layout>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</system-layout>`;
}

function systemMarginsToXML(systemMargins: SystemMargins): string {
  // <!ELEMENT system-margins (left-margin, right-margin)>
  let children = hmarginsToXML(systemMargins);
  return dangerous`<system-margins>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</system-margins>`;
}

function systemDividersToXML(systemDividers: SystemDividers): string {
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
  let children: string[] = [];
  if (defined(systemDividers.leftDivider)) {
    children.push(
      xml`<left-divider${
        printObjectToXML(systemDividers.leftDivider) +
        printStyleAlignToXML(systemDividers.leftDivider)
      } />`
    );
  }
  if (defined(systemDividers.rightDivider)) {
    children.push(
      xml`<right-divider${
        printObjectToXML(systemDividers.rightDivider) +
        printStyleAlignToXML(systemDividers.rightDivider)
      } />`
    );
  }
  return dangerous`<system-dividers>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</system-dividers>`;
}

function appearanceToXML(appearance: Appearance): string {
  // <!ELEMENT appearance
  //     (line-width*, note-size*, distance*,
  //      other-appearance*)>
  let children: string[] = [];
  Object.keys(appearance.lineWidths || {}).forEach((key) => {
    children.push(lineWidthToXML(appearance.lineWidths[key]));
  });
  Object.keys(appearance.noteSizes || {}).forEach((key) => {
    children.push(noteSizeToXML(appearance.noteSizes[key]));
  });
  Object.keys(appearance.distances || {}).forEach((key) => {
    children.push(distanceToXML(appearance.distances[key]));
  });
  // TODO: fix musicxml-interfaces
  // appearance.otherAppearances.forEach(otherAppearance => {
  //     children.push(otherAppearanceToXML(otherAppearance));
  // });
  return dangerous`<appearance>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</appearance>`;
}

function lineWidthToXML(lineWidth: LineWidth): string {
  // <!ELEMENT line-width %layout-tenths;>
  // <!ATTLIST line-width
  //     type CDATA #REQUIRED
  // >
  return xml`<line-width type="${lineWidth.type}">${lineWidth.tenths}</line-width>`;
}

let cueGraceLargeToXML: { [key: number]: string } = {
  1: "grace",
  0: "cue",
  2: "large",
};

function noteSizeToXML(noteSize: NoteSize): string {
  // <!ELEMENT note-size (#PCDATA)>
  // <!ATTLIST note-size
  //     type (cue | grace | large) #REQUIRED
  // >
  return xml`<note-size type="${cueGraceLargeToXML[noteSize.type]}">${
    noteSize.size
  }</note-size>`;
}

function distanceToXML(distance: Distance): string {
  // <!ELEMENT distance %layout-tenths;>
  // <!ATTLIST distance
  //     type CDATA #REQUIRED
  // >
  return xml`<distance type="${distance.type}">${distance.tenths}</distance>`;
}

function workToXML(work: Work): string {
  // <!ELEMENT work (work-number?, work-title?, opus?)>
  if (!work || (!work.workNumber && !work.workTitle)) {
    return xml`<!-- no work metadata -->`;
  }

  let children: string[] = [];
  if (defined(work.workNumber)) {
    // <!ELEMENT work-number (#PCDATA)>
    children.push(xml`<work-number>${work.workNumber}</work-number>`);
  }
  if (defined(work.workTitle)) {
    // <!ELEMENT work-title (#PCDATA)>
    children.push(xml`<work-title>${work.workTitle}</work-title>`);
  }
  if (defined(work.opus) && !!work.opus) {
    // <!ELEMENT opus EMPTY>
    // <!ATTLIST opus
    //     %link-attributes;
    //     >
    console.warn("link-attributes in <opus /> aren't implemented."); // TODO: IMPLEMENT link-attributes
    children.push(dangerous`<opus />`);
  }

  return dangerous`<work>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</work>`;
}

function movementNumberToXML(movementNumber: string): string {
  // <!ELEMENT movement-number (#PCDATA)>
  if (!movementNumber) {
    return xml`<!-- no movement-number metadata -->`;
  }
  return xml`<movement-number>${movementNumber}</movement-number>`;
}

function movementTitleToXML(movementTitle: string): string {
  // <!ELEMENT movement-title (#PCDATA)>
  if (!movementTitle) {
    return xml`<!-- no movement-title metadata -->`;
  }
  return xml`<movement-title>${movementTitle}</movement-title>`;
}

function identificationToXML(identification: Identification): string {
  // <!ELEMENT identification (creator*, rights*, encoding?,
  //     source?, relation*, miscellaneous?)>
  let children: string[] = [];
  (identification.creators || []).forEach((creator) => {
    children.push(creatorToXML(creator));
  });
  (identification.rights || []).forEach((rights) => {
    children.push(rightsToXML(rights));
  });
  if (defined(identification.encoding)) {
    children.push(encodingToXML(identification.encoding));
  }
  if (defined(identification.source) && !!identification.source) {
    children.push(sourceToXML(identification.source));
  }
  (identification.relations || []).forEach((relation) => {
    children.push(relationToXML(relation));
  });
  if (defined(identification.miscellaneous)) {
    children.push(miscellaneousToXML(identification.miscellaneous));
  }

  return dangerous`<identification>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</identification>`;
}

function creatorToXML(creator: Creator): string {
  // <!ELEMENT creator (#PCDATA)>
  // <!ATTLIST creator
  //     type CDATA #IMPLIED
  // >
  let attribs = "";
  if (creator.type) {
    attribs += xml` type="${creator.type}"`;
  }
  let pcdata = xml`${creator.creator}`;
  return dangerous`<creator${attribs}>${pcdata}</creator>`;
}

function rightsToXML(rights: Rights): string {
  // <!ELEMENT rights (#PCDATA)>
  // <!ATTLIST rights
  //     type CDATA #IMPLIED
  // >
  let attribs = "";
  if (rights.type) {
    attribs += xml` type="${rights.type}"`;
  }
  let pcdata = xml`${rights.rights}`;
  return dangerous`<rights${attribs}>${pcdata}</rights>`;
}

function encodingToXML(encoding: Encoding): string {
  // <!ELEMENT encoding ((encoding-date | encoder | software |
  //     encoding-description | supports)*)>
  let children: string[] = [];
  if (defined(encoding.encodingDate)) {
    children.push(encodingDateToXML(encoding.encodingDate));
  }
  (encoding.encoders || []).forEach((encoder) => {
    children.push(encoderToXML(encoder));
  });
  (encoding.softwares || []).forEach((software) => {
    children.push(softwareToXML(software));
  });
  (encoding.encodingDescriptions || []).forEach((encodingDescription) => {
    children.push(encodingDescriptionToXML(encodingDescription));
  });
  Object.keys(encoding.supports || {}).forEach((key) => {
    children.push(supportsToXML(encoding.supports[key]));
  });
  return dangerous`<encoding>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</encoding>`;
}

function encodingDateToXML(encodingDate: EncodingDate): string {
  // <!ELEMENT encoding-date %yyyy-mm-dd;>
  return xml`<encoding-date>${("0000" + encodingDate.year).slice(-4)}-${(
    "00" + encodingDate.month
  ).slice(-2)}-${("00" + encodingDate.day).slice(-2)}</encoding-date>`;
}

function encoderToXML(encoder: Encoder): string {
  // <!ELEMENT encoder (#PCDATA)>
  // <!ATTLIST encoder
  //     type CDATA #IMPLIED
  // >
  let attribs = "";
  if (defined(encoder.type)) {
    attribs = xml` type="${encoder.type}"`;
  }
  let pcdata = xml`${encoder.encoder}`;
  return dangerous`<encoder${attribs}>${pcdata}</encoder>`;
}

function softwareToXML(software: string): string {
  // <!ELEMENT software (#PCDATA)>
  return xml`<software>${software}</software>`;
}

function encodingDescriptionToXML(encodingDescription: string): string {
  // <!ELEMENT encoding-description (#PCDATA)>
  return xml`<encoding-description>${encodingDescription}</encoding-description>`;
}

function supportsToXML(supports: Supports): string {
  // <!ELEMENT supports EMPTY>
  // <!ATTLIST supports
  //     type %yes-no; #REQUIRED
  //     element CDATA #REQUIRED
  //     attribute CDATA #IMPLIED
  //     value CDATA #IMPLIED
  let attribs = "";
  if (defined(supports.type)) {
    attribs += yesNo` type="${supports.type}"`;
  }
  if (defined(supports.element)) {
    attribs += xml` element="${supports.element}"`;
  }
  if (defined(supports.attribute)) {
    attribs += xml` attribute="${supports.attribute}"`;
  }
  if (defined(supports.value)) {
    attribs += xml` value="${supports.value}"`;
  }
  return dangerous`<supports${attribs} />`;
}

function sourceToXML(source: string): string {
  // <!ELEMENT source (#PCDATA)>
  return xml`<source>${source}</source>`;
}

function relationToXML(relation: Relation): string {
  // <!ELEMENT relation (#PCDATA)>
  // <!ATTLIST relation
  //     type CDATA #IMPLIED
  // >
  let attribs = "";
  if (relation.type) {
    attribs += xml` type="${relation.type}"`;
  }
  let pcdata = xml`${relation.data}`;
  return dangerous`<relation${attribs}>${pcdata}</relation>`;
}

function miscellaneousToXML(miscellaneous: Miscellaneous): string {
  // <!ELEMENT miscellaneous (miscellaneous-field*)>
  let children = miscellaneous.miscellaneousFields.map((field) =>
    miscellaneousFieldToXML(field)
  );
  return dangerous`<miscellaneous>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</miscellaneous>`;
}

function miscellaneousFieldToXML(field: MiscellaneousField): string {
  // <!ELEMENT miscellaneous-field (#PCDATA)>
  // <!ATTLIST miscellaneous-field
  //     name CDATA #REQUIRED
  // >
  return xml`<miscellaneous-field name="${field.name}">${
    field.data || ""
  }</miscellaneous-field>`;
}

function defaultsToXML(defaults: Defaults): string {
  // <!ELEMENT defaults (scaling?, page-layout?,
  //     system-layout?, staff-layout*, appearance?,
  //     music-font?, word-font?, lyric-font*, lyric-language*)>

  let children: string[] = [];

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
  (defaults.lyricFonts || []).forEach((lyricFont) => {
    children.push(lyricFontToXML(lyricFont));
  });
  (defaults.lyricLanguages || []).forEach((lyricLanguage) => {
    children.push(lyricLanguageToXML(lyricLanguage));
  });
  return dangerous`<defaults>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</defaults>`;
}

function musicFontToXML(musicFont: MusicFont): string {
  // <!ELEMENT music-font EMPTY>
  // <!ATTLIST music-font
  //     %font;
  // >
  return dangerous`<music-font${fontToXML(musicFont)} />`;
}

function wordFontToXML(wordFont: WordFont): string {
  // <!ELEMENT word-font EMPTY>
  // <!ATTLIST word-font
  //     %font;
  // >
  return dangerous`<word-font${fontToXML(wordFont)} />`;
}

function lyricFontToXML(lyricFont: LyricFont): string {
  // <!ELEMENT lyric-font EMPTY>
  // <!ATTLIST lyric-font
  //     number NMTOKEN #IMPLIED
  //     name CDATA #IMPLIED
  //     %font;
  // >
  return dangerous`<lyric-font${
    numberLevelToXML(lyricFont) + nameToXML(lyricFont) + fontToXML(lyricFont)
  } />`;
}

function lyricLanguageToXML(lyricLanguage: LyricLanguage): string {
  // <!ELEMENT lyric-language EMPTY>
  // <!ATTLIST lyric-language
  //     number NMTOKEN #IMPLIED
  //     name CDATA #IMPLIED
  //     xml:lang NMTOKEN #REQUIRED TODO musicxml-interfaces
  // >
  return dangerous`<lyric-language${
    numberLevelToXML(lyricLanguage) + nameToXML(lyricLanguage)
  } />`;
}

function creditToXML(credit: Credit): string {
  // <!ELEMENT credit
  //     (credit-type*, link*, bookmark*,
  //     (credit-image |
  //      (credit-words, (link*, bookmark*, credit-words)*)))>
  // <!ATTLIST credit
  //     page NMTOKEN #IMPLIED
  // >
  let attributes = "";
  let children: string[] = [];
  (credit.creditTypes || []).forEach((creditType) => {
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
  (credit.creditWords || []).forEach((words) => {
    children.push(creditWordsToXML(words));
  });

  if (defined(credit.page)) {
    attributes += xml` page="${credit.page}"`;
  }
  return dangerous`<credit${attributes}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</credit>`;
}

function creditTypeToXML(creditType: string): string {
  // <!ELEMENT credit-type (#PCDATA)>
  return xml`<credit-type>${creditType}</credit-type>`;
}

function creditWordsToXML(creditWords: CreditWords): string {
  // <!ELEMENT credit-words (#PCDATA)>
  // <!ATTLIST credit-words
  //     %text-formatting;
  // >
  let pcdata = xml`${creditWords.words}`;
  return dangerous`<credit-words${textFormattingToXML(
    creditWords
  )}>${pcdata}</credit-words>`;
}

function creditImageToXML(creditImage: CreditImage): string {
  // <!ELEMENT credit-image EMPTY>
  // <!ATTLIST credit-image
  //     source CDATA #REQUIRED
  //     type CDATA #REQUIRED
  //     %position;
  //     %halign;
  //     %valign-image;
  // >
  let attribs = "";
  if (defined(creditImage.source)) {
    attribs += xml` credit-image="${creditImage.source}"`;
  }
  if (defined(creditImage.type)) {
    attribs += xml` type="${creditImage.type}"`;
  }
  attribs +=
    positionToXML(creditImage) +
    halignToXML(creditImage) +
    valignImageToXML(creditImage);

  return dangerous`<credit-image${attribs} />`;
}

let topMiddleBottomBaselineToXML: { [key: number]: string } = {
  0: "top",
  1: "middle",
  3: "baseline",
  2: "bottom",
};

function valignImageToXML(valignImage: ValignImage) {
  // <!ENTITY % valign-image
  //     "valign (top | middle | bottom) #IMPLIED">
  if (defined(valignImage.valignImage)) {
    return xml` valign="${
      topMiddleBottomBaselineToXML[valignImage.valignImage]
    }"`;
  }
  return "";
}

function partListToXML(partList: PartList): string {
  // <!ELEMENT part-list (part-group*, score-part,
  //     (part-group | score-part)*)>

  let children: string[] = [];
  partList.forEach((partGroupOrScorePart) => {
    if (partGroupOrScorePart._class === "PartGroup") {
      children.push(partGroupToXML(<PartGroup>partGroupOrScorePart));
    } else if (partGroupOrScorePart._class === "ScorePart") {
      children.push(scorePartToXML(<ScorePart>partGroupOrScorePart));
    } else {
      console.warn("Unknwn type for", partGroupOrScorePart);
    }
  });
  return dangerous`<part-list>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</part-list>`;
}

function scorePartToXML(scorePart: ScorePart): string {
  // <!ELEMENT score-part (identification?,
  //     part-name, part-name-display?,
  //     part-abbreviation?, part-abbreviation-display?,
  //     group*, score-instrument*,
  //     (midi-device?, midi-instrument?)*)>
  // <!ATTLIST score-part
  //     id ID #REQUIRED
  // >
  let children: string[] = [];
  let attribs = "";
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
    children.push(
      partAbbreviationDisplayToXML(scorePart.partAbbreviationDisplay)
    );
  }
  (scorePart.groups || []).forEach((group) => {
    children.push(xml`<group>${group}</group>`);
  });
  (scorePart.scoreInstruments || []).forEach((scoreInstrument) => {
    children.push(scoreInstrumentToXML(scoreInstrument));
  });
  // Is it okay if there are different numbers of devices and instruments?
  (scorePart.midiDevices || []).forEach((device, idx) => {
    children.push(midiDeviceToXML(device));
    if (scorePart.midiInstruments[idx]) {
      children.push(midiInstrumentToXML(scorePart.midiInstruments[idx]));
    }
  });
  if (defined(scorePart.id)) {
    attribs += xml` id="${scorePart.id}"`;
  }
  return dangerous`<score-part${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</score-part>`;
}

function partNameToXML(partName: PartName): string {
  // <!ELEMENT part-name (#PCDATA)>
  // <!ATTLIST part-name
  //     %print-style;
  //     %print-object;
  //     %justify;
  // >
  let pcdata = xml`${partName.partName}`;
  return dangerous`<part-name${
    printStyleToXML(partName) +
    printObjectToXML(partName) +
    justifyToXML(partName)
  }>${pcdata}</part-name>`;
}

function partNameDisplayToXML(partNameDisplay: PartNameDisplay): string {
  // <!ELEMENT part-name-display
  //     ((display-text | accidental-text)*)>
  // <!ATTLIST part-name-display
  //     %print-object;
  // >
  return dangerous`<part-name-display${printObjectToXML(
    partNameDisplay
  )}>\n${textArrayToXML(partNameDisplay.name)
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}</part-name-display>`;
}

function partAbbreviationToXML(abbreviation: PartAbbreviation): string {
  // <!ELEMENT part-abbreviation (#PCDATA)>
  // <!ATTLIST part-abbreviation
  //     %print-style;
  //     %print-object;
  //     %justify;
  // >
  let pcdata = xml`${abbreviation.abbreviation}`;
  return dangerous`<part-abbreviation${
    printStyleToXML(abbreviation) +
    printObjectToXML(abbreviation) +
    justifyToXML(abbreviation)
  }>${pcdata}</part-abbreviation>`;
}

function partAbbreviationDisplayToXML(
  partAbbreviationDisplay: PartAbbreviationDisplay
): string {
  // <!ELEMENT part-abbreviation-display
  //     ((display-text | accidental-text)*)>
  // <!ATTLIST part-abbreviation-display
  //     %print-object;
  // >
  return dangerous`<part-abbreviation-display${printObjectToXML(
    partAbbreviationDisplay
  )}>${textArrayToXML(partAbbreviationDisplay.name)
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}</part-abbreviation-display>`;
}

function textArrayToXML(texts: TextSegment[]): string[] {
  return texts.map((text) => {
    if (text.acc) {
      return (
        dangerous`<accidental-text${textFormattingToXML(text.acc)}` +
        xml`>${text.acc.text}</accidental-text>`
      );
    } else if (text.text) {
      return (
        dangerous`<display-text${textFormattingToXML(text.text)}` +
        xml`>${text.text.text}</display-text>`
      );
    } else {
      throw "Unknown type " + text;
    }
  });
}

function midiDeviceToXML(midiDevice: MidiDevice): string {
  // <!ELEMENT midi-device (#PCDATA)>
  // <!ATTLIST midi-device
  //     port CDATA #IMPLIED
  //     id IDREF #IMPLIED
  // >
  let attribs = "";
  if (defined(midiDevice.port)) {
    attribs += xml` port="${midiDevice.port}"`;
  }
  if (defined(midiDevice.id)) {
    attribs += xml` id="${midiDevice.id}"`;
  }
  let pcdata = xml`${midiDevice.deviceName || ""}`;
  return dangerous`<midi-device${attribs}>${pcdata}</midi-device>`;
}

function midiInstrumentToXML(midiInstrument: MidiInstrument): string {
  // <!ELEMENT midi-instrument
  //     (midi-channel?, midi-name?, midi-bank?, midi-program?,
  //      midi-unpitched?, volume?, pan?, elevation?)>
  // <!ATTLIST midi-instrument
  //     id IDREF #REQUIRED
  // >
  let children: string[] = [];
  let attribs = "";
  if (defined(midiInstrument.midiChannel)) {
    // <!ELEMENT midi-channel (#PCDATA)>
    children.push(
      xml`<midi-channel>${midiInstrument.midiChannel}</midi-channel>`
    );
  }
  if (defined(midiInstrument.midiName)) {
    // <!ELEMENT midi-name (#PCDATA)>
    children.push(xml`<midi-name>${midiInstrument.midiName}</midi-name>`);
  }
  if (defined(midiInstrument.midiBank)) {
    // <!ELEMENT midi-bank (#PCDATA)>
    children.push(xml`<midi-bank>${midiInstrument.midiBank}</midi-bank>`);
  }
  if (defined(midiInstrument.midiProgram)) {
    // <!ELEMENT midi-program (#PCDATA)>
    children.push(
      xml`<midi-program>${midiInstrument.midiProgram}</midi-program>`
    );
  }
  if (defined(midiInstrument.midiUnpitched)) {
    // <!ELEMENT midi-unpitched (#PCDATA)>
    children.push(
      xml`<midi-unpitched>${midiInstrument.midiUnpitched}</midi-unpitche>`
    );
  }
  if (defined(midiInstrument.volume)) {
    // <!ELEMENT volume (#PCDATA)>
    children.push(xml`<volume>${midiInstrument.volume}</volume>`);
  }
  if (defined(midiInstrument.pan)) {
    // <!ELEMENT pan (#PCDATA)>
    children.push(xml`<pan>${midiInstrument.pan}</pan>`);
  }
  if (defined(midiInstrument.elevation)) {
    // <!ELEMENT elevation (#PCDATA)>
    children.push(xml`<elevation>${midiInstrument.elevation}</elevation>`);
  }
  if (defined(midiInstrument.id)) {
    attribs += xml` id="${midiInstrument.id}"`;
  }
  return dangerous`<midi-instrument${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</midi-instrument>`;
}

function scoreInstrumentToXML(scoreInstrument: ScoreInstrument): string {
  // <!ELEMENT score-instrument
  //     (instrument-name, instrument-abbreviation?,
  //      instrument-sound?, (solo | ensemble)?,
  //      virtual-instrument?)>
  // <!ATTLIST score-instrument
  //     id ID #REQUIRED
  // >
  let children: string[] = [];
  let attribs = xml` id="${scoreInstrument.id}"`;
  if (defined(scoreInstrument.instrumentName)) {
    // <!ELEMENT instrument-name (#PCDATA)>
    children.push(
      xml`<instrument-name>${scoreInstrument.instrumentName}</instrument-name>`
    );
  }
  if (defined(scoreInstrument.instrumentAbbreviation)) {
    // <!ELEMENT instrument-abbreviation (#PCDATA)>
    children.push(
      xml`<instrument-abbreviation>${scoreInstrument.instrumentAbbreviation}</instrument-abbreviation>`
    );
  }
  if (defined(scoreInstrument.instrumentSound)) {
    // <!ELEMENT instrument-sound (#PCDATA)>
    children.push(
      xml`<instrument-sound>${scoreInstrument.instrumentSound}</instrument-sound>`
    );
  }
  if (scoreInstrument.solo) {
    // <!ELEMENT solo EMPTY>
    children.push(xml`<solo />`);
  }
  if (defined(scoreInstrument.ensemble)) {
    // <!ELEMENT ensemble (#PCDATA)>
    children.push(xml`<ensemble>${scoreInstrument.ensemble}</ensemble>`);
  }
  if (defined(scoreInstrument.virtualInstrument)) {
    // <!ELEMENT virtual-instrument
    //     (virtual-library?, virtual-name?)>
    let vChildren: string[] = [];
    let v = scoreInstrument.virtualInstrument;
    if (defined(v.virtualLibrary)) {
      // <!ELEMENT virtual-library (#PCDATA)>
      vChildren.push(
        xml`<virtual-library>${v.virtualLibrary}</virtual-library>`
      );
    }
    if (defined(v.virtualName)) {
      // <!ELEMENT virtual-name (#PCDATA)>
      vChildren.push(xml`<virtual-name>${v.virtualName}</virtual-name>`);
    }
    children.push(
      dangerous`<virtual-instrument>\n${vChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</virtual-instrument>`
    );
  }

  return dangerous`<score-instrument${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</score-instrument>`;
}

function partGroupToXML(partGroup: PartGroup): string {
  // <!ELEMENT part-group (group-name?, group-name-display?,
  //     group-abbreviation?, group-abbreviation-display?,
  //     group-symbol?, group-barline?, group-time?, %editorial;)>
  // <!ATTLIST part-group
  //     type %start-stop; #REQUIRED
  //     number CDATA "1"
  // >

  // <!ELEMENT group-time EMPTY>

  let children: string[] = [];
  let attribs: string =
    "" + startStopToXML(partGroup) + numberLevelToXML(partGroup);

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
    children.push(
      groupAbbreviationDisplayToXML(partGroup.groupAbbreviationDisplay)
    );
  }
  if (defined(partGroup.groupSymbol)) {
    children.push(groupSymbolToXML(partGroup.groupSymbol));
  }
  if (defined(partGroup.groupBarline)) {
    children.push(groupBarlineToXML(partGroup.groupBarline));
  }
  if (!!partGroup.groupTime) {
    children.push(xml`<group-time />`);
  }

  children = children.concat(editorialToXML(partGroup));

  return dangerous`<part-group${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</part-group>`;
}

function groupNameToXML(groupName: GroupName): string {
  // <!ELEMENT group-name (#PCDATA)>
  // <!ATTLIST group-name
  //     %print-style;
  //     %justify;
  // >
  let pcdata = xml`${groupName.name}`;
  return dangerous`<group-name${
    printStyleToXML(groupName) + justifyToXML(groupName)
  }>${pcdata}</group-name>`;
}

function groupNameDisplayToXML(groupNameDisplay: GroupNameDisplay): string {
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

function groupAbbreviationToXML(groupAbbreviation: GroupAbbreviation): string {
  // <!ELEMENT group-abbreviation (#PCDATA)>
  // <!ATTLIST group-abbreviation
  //     %print-style;
  //     %justify;
  // >
  let pcdata = xml`${groupAbbreviation.text}`;
  return dangerous`<group-abbreviation${
    printStyleToXML(groupAbbreviation) + justifyToXML(groupAbbreviation)
  }>${pcdata}</group-abbreviation>`;
}

function groupAbbreviationDisplayToXML(
  groupAbbreviationDisplay: GroupAbbreviationDisplay
): string {
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

function groupSymbolToXML(groupSymbol: GroupSymbol): string {
  // <!ELEMENT group-symbol (#PCDATA)>
  // <!ATTLIST group-symbol
  //     %position;
  //     %color;
  // >
  let pcdata = xml`${groupSymbol.data}`;
  return dangerous`<group-symbol${
    positionToXML(groupSymbol) + colorToXML(groupSymbol)
  }>${pcdata}</group-symbol>`;
}

function groupBarlineToXML(groupBarline: GroupBarline): string {
  // <!ELEMENT group-barline (#PCDATA)>
  // <!ATTLIST group-barline
  //     %color;
  // >
  let pcdata = xml`${groupBarline.data}`;
  return dangerous`<group-barline${colorToXML(
    groupBarline
  )}>${pcdata}</group-barline>`;
}

function scoreHeaderToXML(header: ScoreHeader): string[] {
  // <!ENTITY % score-header
  // "(work?, movement-number?, movement-title?,
  // identification?, defaults?, credit*, part-list)">
  let children: string[] = [];
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
  (header.credits || []).forEach((credit) => {
    children.push(creditToXML(credit));
  });
  if (defined(header.partList)) {
    children.push(partListToXML(header.partList));
  }
  return children;
}

function backupToXML(backup: Backup): string {
  // <!ELEMENT backup (duration, %editorial;)>
  let children: string[] = [];
  children.push(xml`<duration>${backup.duration}</duration>`);
  children = children.concat(editorialToXML(backup));
  return dangerous`<backup>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</backup>`;
}

function forwardToXML(forward: Forward): string {
  // <!ELEMENT forward
  //     (duration, %editorial-voice;, staff?)>
  let children: string[] = [];
  children.push(xml`<duration>${forward.duration}</duration>`);
  children = children.concat(editorialVoiceToXML(forward));
  if (forward.staff) {
    children.push(xml`<staff>${forward.staff}</staff>`);
  }
  return dangerous`<forward>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</forward>`;
}

function groupingToXML(grouping: Grouping): string {
  // <!ELEMENT grouping ((feature)*)>
  // <!ATTLIST grouping
  //     type %start-stop-single; #REQUIRED
  //     number CDATA "1"
  //     member-of CDATA #IMPLIED
  // >
  let children: string[] = [];
  children = children.concat(staffDebugInfoToXMLComment(grouping));
  (grouping.features || []).forEach((feature) => {
    // <!ELEMENT feature (#PCDATA)>
    // <!ATTLIST feature
    //     type CDATA #IMPLIED
    // >
    let pcdata = xml`${feature.data}`;
    let attribs = "";
    if (defined(feature.type)) {
      attribs += xml` type="${feature.type}"`;
    }
    children.push(dangerous`<grouping${attribs}>${pcdata}</grouping>`);
  });
  let attribs =
    "" + startStopSingleToXML(grouping) + numberLevelToXML(grouping);

  if (defined(grouping.memberOf)) {
    attribs += xml` member-of="${grouping.memberOf}"`;
  }
  return dangerous`<grouping${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</grouping>`;
}

function harmonyToXML(harmony: Harmony): string {
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
  let attribs =
    "" + explicitImpliedAlternateToXML(harmony) + printObjectToXML(harmony);

  if (defined(harmony.printFrame)) {
    attribs += yesNo` print-frame="${harmony.printFrame}"`;
  }
  attribs += printStyleToXML(harmony) + placementToXML(harmony);

  let children: string[] = [];
  children = children.concat(staffDebugInfoToXMLComment(harmony));

  // TODO: multiple of everything in harmony-chord!
  if (defined(harmony.root)) {
    children.push(rootToXML(harmony.root));
  } else if (defined(harmony.function)) {
    children.push(functionToXML(harmony.function));
  }

  children.push(kindToXML(harmony.kind));
  if (defined(harmony.inversion)) {
    children.push(inversionToXML(harmony.inversion));
  }
  if (defined(harmony.bass)) {
    children.push(bassToXML(harmony.bass));
  }
  (harmony.degrees || []).forEach((degree) => {
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
    children.push(xml`<staff>${harmony.staff}</staff>`);
  }

  return dangerous`<harmony${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</harmony>`;
}

let eiaTypeToXML: { [key: number]: string } = {
  [ExplicitImpliedAlternate.Explicit]: "explicit",
  [ExplicitImpliedAlternate.Implied]: "implied",
  [ExplicitImpliedAlternate.Alternate]: "alternate",
};
function explicitImpliedAlternateToXML(eia: {
  type: ExplicitImpliedAlternate;
}): string {
  if (defined(eia.type)) {
    return xml` type="${eiaTypeToXML[eia.type]}"`;
  }
  return "";
}

function rootToXML(root: Root): string {
  // <!ELEMENT root (root-step, root-alter?)>
  let children: string[] = [];
  if (defined(root.rootStep)) {
    // <!ELEMENT root-step (#PCDATA)>
    // <!ATTLIST root-step
    //     text CDATA #IMPLIED
    //     %print-style;
    // >
    let attribs = "";
    if (defined(root.rootStep.text)) {
      attribs += xml` text="${root.rootStep.text}"`;
    }
    attribs += printStyleToXML(root.rootStep);
    let pcdata = xml`${root.rootStep.data}`;
    children.push(dangerous`<root-step${attribs}>${pcdata}</root-step>`);
  }
  if (defined(root.rootAlter)) {
    // <!ELEMENT root-alter (#PCDATA)>
    // <!ATTLIST root-alter
    //     %print-object;
    //     %print-style;
    //     location %left-right; #IMPLIED
    // >
    let attribs =
      printObjectToXML(root.rootAlter) + printStyleToXML(root.rootAlter);
    if (defined(root.rootAlter.location)) {
      attribs += xml` location="${
        root.rootAlter.location === LeftRight.Left ? "left" : "right"
      }"`;
    }
    let pcdata = root.rootAlter.data;
    children.push(dangerous`<root-alter${attribs}>${pcdata}</root-alter>`);
  }
  return dangerous`<root>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</root>`;
}

function functionToXML(func: Function): string {
  // <!ELEMENT function (#PCDATA)>
  // <!ATTLIST function
  //     %print-style;
  // >
  let pcdata = xml`${func.data}`;
  let attribs = printStyleToXML(func);
  return `<function${attribs}>${pcdata}</function>`;
}

function kindToXML(kind: Kind): string {
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
  let attribs = "";
  if (defined(kind.useSymbols)) {
    attribs += yesNo` kind="${kind.useSymbols}"`;
  }
  if (defined(kind.text)) {
    attribs += xml` text="${kind.text}"`;
  }
  if (defined(kind.stackDegrees)) {
    attribs += yesNo` stack-degrees="${kind.stackDegrees}"`;
  }
  if (defined(kind.parenthesesDegrees)) {
    attribs += yesNo` parentheses-degrees="${kind.parenthesesDegrees}"`;
  }
  attribs += printStyleToXML(kind) + halignToXML(kind) + valignToXML(kind);

  let pcdata = xml`${kind.data}`;
  return dangerous`<kind${attribs}>\n${pcdata}</kind>`;
}

function inversionToXML(inversion: Inversion): string {
  // <!ELEMENT inversion (#PCDATA)>
  // <!ATTLIST inversion
  //     %print-style;
  //     >
  let pcdata = xml`${inversion.data}`;
  let attribs = printStyleToXML(inversion);
  return `<inversion${attribs}>${pcdata}</inversion>`;
}

function bassToXML(bass: Bass): string {
  // <!ELEMENT bass (bass-step, bass-alter?)>
  let children: string[] = [];
  if (defined(bass.bassStep)) {
    // <!ELEMENT bass-step (#PCDATA)>
    // <!ATTLIST bass-step
    //     text CDATA #IMPLIED
    //     %print-style;
    // >
    let attribs = "";
    if (defined(bass.bassStep.text)) {
      attribs += xml` text="${bass.bassStep.text}"`;
    }
    attribs += printStyleToXML(bass.bassStep);
    let pcdata = xml`${bass.bassStep.data}`;
    children.push(dangerous`<bass-step${attribs}>${pcdata}</bass-step>`);
  }
  if (defined(bass.bassAlter)) {
    // <!ELEMENT bass-alter (#PCDATA)>
    // <!ATTLIST bass-alter
    //     %print-object;
    //     %print-style;
    //     location (left | right) #IMPLIED
    // >
    let attribs =
      printObjectToXML(bass.bassAlter) + printStyleToXML(bass.bassAlter);
    if (defined(bass.bassAlter.location)) {
      attribs += xml` location="${
        bass.bassAlter.location === LeftRight.Left ? "left" : "right"
      }"`;
    }
    let pcdata = bass.bassAlter.data;
    children.push(dangerous`<bass-alter${attribs}>${pcdata}</bass-alter>`);
  }
  return dangerous`<bass>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</bass>`;
}

let chordTypeToXML: { [key: number]: string } = {
  [ChordType.Augmented]: "augmented",
  [ChordType.Diminished]: "diminished",
  [ChordType.Major]: "major",
  [ChordType.Minor]: "minor",
  [ChordType.HalfDiminished]: "half-diminished",
};

function degreeToXML(degree: Degree): string {
  // <!ELEMENT degree (degree-value, degree-alter, degree-type)>
  // <!ATTLIST degree
  //     %print-object;
  // >
  let children: string[] = [];
  if (defined(degree.degreeValue)) {
    // <!ELEMENT degree-value (#PCDATA)>
    // <!ATTLIST degree-value
    //     symbol (major | minor | augmented |
    //         diminished | half-diminished) #IMPLIED
    //     text CDATA #IMPLIED
    //     %print-style;
    // >
    let lattribs = "";
    if (defined(degree.degreeValue.symbol)) {
      lattribs += xml` symbol="${chordTypeToXML[degree.degreeValue.symbol]}"`;
    }
    if (defined(degree.degreeValue.text)) {
      lattribs += xml` text="${degree.degreeValue.text}"`;
    }
    lattribs += printStyleToXML(degree.degreeValue);
    let pcdata = xml`${degree.degreeValue.data}`;
    children.push(dangerous`<degree-value${lattribs}>${pcdata}</degree-value>`);
  }
  if (defined(degree.degreeAlter)) {
    // <!ELEMENT degree-alter (#PCDATA)>
    // <!ATTLIST degree-alter
    //     %print-style;
    //     plus-minus %yes-no; #IMPLIED
    // >
    let lattribs = printStyleToXML(degree.degreeAlter);
    if (defined(degree.degreeAlter.plusMinus)) {
      lattribs += yesNo` plus-minus="${degree.degreeAlter.plusMinus}"`;
    }
    let pcdata = xml`${degree.degreeAlter.data}`;
    children.push(dangerous`<degree-alter${lattribs}>${pcdata}</degree-alter>`);
  }
  if (defined(degree.degreeType)) {
    // <!ELEMENT degree-type (#PCDATA)>
    // <!ATTLIST degree-type
    //     text CDATA #IMPLIED
    //     %print-style;
    // >
    let lattribs = printStyleToXML(degree.degreeType);
    if (defined(degree.degreeType.text)) {
      lattribs += xml` text="${degree.degreeType.text}"`;
    }
    let pcdata = xml`${degree.degreeType.data}`;
    children.push(dangerous`<degree-type${lattribs}>${pcdata}</degree-type>`);
  }
  let attribs = printObjectToXML(degree);
  return dangerous`<degree${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</degree>`;
}

function frameToXML(frame: Frame): string {
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
  let attribs =
    positionToXML(frame) +
    colorToXML(frame) +
    halignToXML(frame) +
    valignImageToXML(frame);

  if (defined(frame.height)) {
    attribs += xml` height="${frame.height}"`;
  }
  if (defined(frame.width)) {
    attribs += xml` width="${frame.width}"`;
  }
  if (defined(frame.unplayed)) {
    attribs += xml` unplayed="${frame.unplayed}"`;
  }
  let children: string[] = [];
  if (defined(frame.frameStrings)) {
    // <!ELEMENT frame-strings (#PCDATA)>
    children.push(xml`<frame-strings>${frame.frameStrings}</frame-strings>`);
  }
  if (defined(frame.frameFrets)) {
    // <!ELEMENT frame-frets (#PCDATA)>
    children.push(xml`<frame-frets>${frame.frameFrets}</frame-frets>`);
  }
  if (defined(frame.firstFret)) {
    // <!ELEMENT first-fret (#PCDATA)>
    // <!ATTLIST first-fret
    //     text CDATA #IMPLIED
    //     location %left-right; #IMPLIED
    // >
    let pcdata = xml`${frame.firstFret.data}`;
    let attribs = "";
    if (defined(frame.firstFret.text)) {
      attribs += xml` text="${frame.firstFret.text}"`;
    }
    if (defined(frame.firstFret.location)) {
      attribs += xml` location="${
        frame.firstFret.location === LeftRight.Left ? "left" : "right"
      }"`;
    }
  }
  (frame.frameNotes || []).forEach((frameNote) => {
    // <!ELEMENT frame-note (string, fret, fingering?, barre?)>
    let fChildren: string[] = [];

    // <!ELEMENT string (#PCDATA)>
    // <!ATTLIST string
    //     %print-style;
    //     %placement;
    // >
    if (defined(frameNote.string)) {
      let pcdata = xml`${frameNote.string.stringNum}`;
      fChildren.push(
        dangerous`<string${
          printStyleToXML(frameNote.string) + placementToXML(frameNote.string)
        }>${pcdata}</string>`
      );
    }
    // <!ELEMENT fret (#PCDATA)>
    // <!ATTLIST fret
    //     %font;
    //     %color;
    // >
    if (defined(frameNote.fret)) {
      let pcdata = xml`${frameNote.fret.fret}`;
      fChildren.push(
        dangerous`<fret${
          fontToXML(frameNote.fret) + colorToXML(frameNote.fret)
        }>${pcdata}</fret>`
      );
    }
    // <!ELEMENT fingering (#PCDATA)>
    // <!ATTLIST fingering
    //     substitution %yes-no; #IMPLIED
    //     alternate %yes-no; #IMPLIED
    //     %print-style;
    //     %placement;
    // >
    if (defined(frameNote.fingering)) {
      let pcdata = xml`${frameNote.fingering.finger}`;
      let coreAttribs = "";
      if (defined(frameNote.fingering.substitution)) {
        coreAttribs += yesNo` substitution="${frameNote.fingering.substitution}"`;
      }
      if (defined(frameNote.fingering.alternate)) {
        coreAttribs += yesNo` alternate="${frameNote.fingering.alternate}"`;
      }
      fChildren.push(
        dangerous`<fingering${
          coreAttribs +
          printStyleToXML(frameNote.fingering) +
          placementToXML(frameNote.fingering)
        }>${pcdata}</fingering>`
      );
    }
    // <!ELEMENT barre EMPTY>
    // <!ATTLIST barre
    //     type %start-stop; #REQUIRED
    //     %color;
    // >
    if (defined(frameNote.barre)) {
      fChildren.push(
        dangerous`<barre${
          startStopToXML(frameNote.barre) + colorToXML(frameNote.barre)
        } />`
      );
    }

    children.push(
      dangerous`<frame-note>\n${fChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</frame-note>`
    );
  });

  return dangerous`<frame${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</frame>`;
}

function printToXML(print: Print): string {
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
  let attribs = "";
  let children: string[] = [];

  children = children.concat(staffDebugInfoToXMLComment(print));

  if (defined(print.staffSpacing)) {
    attribs += xml` staff-spacing="${print.staffSpacing}"`;
  }
  if (defined(print.newSystem)) {
    attribs += yesNo` new-system="${print.newSystem}"`;
  }
  if (defined(print.newPage)) {
    attribs += yesNo` new-page="${print.newPage}"`;
  }
  if (defined(print.blankPage)) {
    attribs += xml` blank-page="${print.blankPage}"`;
  }
  if (defined(print.pageNumber)) {
    attribs += xml` page-number="${print.pageNumber}"`;
  }

  if (defined(print.pageLayout)) {
    children.push(pageLayoutToXML(print.pageLayout));
  }
  if (defined(print.systemLayout)) {
    children.push(systemLayoutToXML(print.systemLayout));
  }
  (print.staffLayouts || []).forEach((staffLayout) => {
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

  return dangerous`<print${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</print>`;
}

function soundToXML(sound: Sound): string {
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
  let children: string[] = [];
  let attribs: string = "";

  children = children.concat(staffDebugInfoToXMLComment(sound));

  // TODO musicxml-interfaces: can have many midi-devices, instruments, etc.
  (sound.midiDevices || []).forEach((midiDevice) => {
    children.push(midiDeviceToXML(midiDevice));
  });
  (sound.midiInstruments || []).forEach((midiInstrument) => {
    children.push(midiInstrumentToXML(midiInstrument));
  });
  (sound.plays || []).forEach((play) => {
    children.push(playToXML(play));
  });

  if (defined(sound.tempo)) {
    attribs += xml` tempo="${sound.tempo}"`;
  }
  if (defined(sound.dynamics)) {
    attribs += xml` dynamics="${sound.dynamics}"`;
  }
  if (defined(sound.decapo)) {
    attribs += yesNo` decapo="${sound.decapo}"`;
  }
  if (defined(sound.segno)) {
    attribs += xml` segno="${sound.segno}"`;
  }
  if (defined(sound.dalsegno)) {
    attribs += xml` dalsegno="${sound.dalsegno}"`;
  }
  if (defined(sound.coda)) {
    attribs += xml` coda="${sound.coda}"`;
  }
  if (defined(sound.tocoda)) {
    attribs += xml` tocoda="${sound.tocoda}"`;
  }
  if (defined(sound.divisions)) {
    attribs += xml` divisions="${sound.divisions}"`;
  }
  if (defined(sound.forwardRepeat)) {
    attribs += yesNo` forward-repeat="${sound.forwardRepeat}"`;
  }
  if (defined(sound.fine)) {
    attribs += xml` fine="${sound.fine}"`;
  }
  attribs += timeOnlyToXML(sound);
  if (defined(sound.pizzicato)) {
    attribs += yesNo` pizzicato="${sound.pizzicato}"`;
  }
  if (defined(sound.pan)) {
    attribs += xml` pan="${sound.pan}"`;
  }
  if (defined(sound.elevation)) {
    attribs += xml` elevation="${sound.elevation}"`;
  }
  if (defined(sound.damperPedal)) {
    attribs += xml` damper-pedal="${sound.damperPedal}"`;
  }
  if (defined(sound.softPedal)) {
    attribs += xml` soft-pedal="${sound.softPedal}"`;
  }
  if (defined(sound.sostenutoPedal)) {
    attribs += xml` sostenuto-pedal="${sound.sostenutoPedal}"`;
  }
  return dangerous`<sound${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</sound>`;
}

function staffDebugInfoToXMLComment(module: any): string[] {
  let comments: string[] = [];
  if (defined(module.divCount)) {
    comments.push(
      xml`<!--musicxml-interfaces:debug>\n${""}  <div-count>${
        module.divCount
      }</div-count>\n${""}</musicxml-interfaces:debug-->`
    );
  }
  return comments;
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

function directionToXML(direction: Direction): string {
  // <!ELEMENT direction (direction-type+, offset?,
  //     %editorial-voice;, staff?, sound?)>
  // <!ATTLIST direction
  //     %placement;
  //     %directive;
  // >
  let children: string[] = [];
  children = children.concat(staffDebugInfoToXMLComment(direction));
  (direction.directionTypes || []).forEach((directionType) => {
    children.push(directionTypeToXML(directionType));
  });
  if (defined(direction.offset)) {
    children.push(offsetToXML(direction.offset));
  }
  children = children.concat(editorialVoiceToXML(direction));
  if (defined(direction.staff)) {
    children.push(xml`<staff>${direction.staff}</staff>`);
  }
  if (defined(direction.sound)) {
    children.push(soundToXML(direction.sound));
  }
  let attribs = "" + placementToXML(direction);

  if (defined(direction.directive)) {
    attribs += yesNo` directive="${direction.directive}"`;
  }

  return dangerous`<direction${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</direction>`;
}

function attributesToXML(attributes: Attributes): string {
  // <!ELEMENT attributes (%editorial;, divisions?, key*, time*,
  //     staves?, part-symbol?, instruments?, clef*, staff-details*,
  //     transpose*, directive*, measure-style*)>
  let children: string[] = [];
  children = children.concat(staffDebugInfoToXMLComment(attributes));
  children = children.concat(editorialToXML(attributes));

  if (defined(attributes.divisions)) {
    // <!ELEMENT divisions (#PCDATA)>
    children.push(xml`<divisions>${attributes.divisions}</divisions>`);
  }
  (attributes.keySignatures || []).forEach((keySignature) => {
    children.push(keyToXML(keySignature));
  });
  (attributes.times || []).forEach((time) => {
    children.push(timeToXML(time));
  });
  if (defined(attributes.staves)) {
    // <!ELEMENT staves (#PCDATA)>
    children.push(xml`<staves>${attributes.staves}</staves>`);
  }
  if (defined(attributes.partSymbol)) {
    children.push(partSymbolToXML(attributes.partSymbol));
  }
  if (defined(attributes.instruments)) {
    // <!ELEMENT instruments (#PCDATA)>
    children.push(xml`<instruments>${attributes.instruments}</instruments>`);
  }
  (attributes.clefs || []).forEach((clef) => {
    children.push(clefToXML(clef));
  });
  (attributes.staffDetails || []).forEach((staffDetails) => {
    children.push(staffDetailsToXML(staffDetails));
  });
  (attributes.transposes || []).forEach((transpose) => {
    children.push(transposeToXML(transpose));
  });
  (attributes.directives || []).forEach((directive) => {
    children.push(directiveToXML(directive));
  });
  (attributes.measureStyles || []).forEach((measureStyle) => {
    children.push(measureStyleToXML(measureStyle));
  });
  return dangerous`<attributes>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</attributes>`;
}

let countToXML: { [key: number]: string } = {
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
  1: "whole",
};

let accidentalToXML: { [key: number]: string } = {
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
  33: "double-flat",
};

let syllabicTypeToXML: { [key: number]: string } = {
  0: "single",
  1: "begin",
  3: "middle",
  2: "end",
};

let breathMarkTypeToXML: { [key: number]: string } = {
  0: "comma",
  1: "tick",
  2: "empty",
};

let holeClosedTypeToXML: { [key: number]: string } = {
  1: "no",
  0: "yes",
  2: "half",
};

let holeLocationToXML: { [key: number]: string } = {
  0: "right",
  3: "top",
  1: "bottom",
  2: "left",
};

let actualBothNoneToXML: { [key: number]: string } = {
  [ActualBothNone.None]: "none",
  [ActualBothNone.Both]: "both",
  [ActualBothNone.Actual]: "actual",
};

let beamTypeToXML: { [key: number]: string } = {
  4: "backward hook",
  0: "begin",
  3: "forward hook",
  1: "continue",
  2: "end",
};

let accelRitNoneToXML: { [key: number]: string } = {
  0: "accel",
  2: "none",
  1: "rit",
};

let noteheadTypeToXML: { [key: number]: string } = {
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
  6: "circle x",
};

let stemToXML: { [key: number]: string } = {
  2: "none",
  3: "double",
  0: "down",
  1: "up",
};

function measureToXML(measure: Measure) {
  // <!ATTLIST measure
  //     number CDATA #REQUIRED
  //     implicit %yes-no; #IMPLIED
  //     non-controlling %yes-no; #IMPLIED
  //     width %tenths; #IMPLIED
  // >
  // <!ELEMENT measure (part+)>
  let attribs = "";
  if (defined(measure.number)) {
    attribs += xml` number="${measure.number}"`;
  }
  if (defined(measure.implicit)) {
    attribs += yesNo` implicit="${measure.implicit}"`;
  }
  if (defined(measure.nonControlling)) {
    attribs += yesNo` non-controlling="${measure.nonControlling}"`;
  }
  if (defined(measure.width)) {
    attribs += xml` width="${measure.width}"`;
  }

  let elements: string[] = [];
  for (let key in measure.parts) {
    elements.push(partToXML(measure.parts[key], key));
  }

  return dangerous`<measure${attribs}>\n${elements
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</measure>`;
}

function partToXML(part: any[], id: string) {
  // <!ELEMENT part (%music-data;)>
  // <!ATTLIST part
  //     id IDREF #REQUIRED
  // >
  let attribs = xml` id="${id}"`;
  // <!ENTITY % music-data
  //     "(note | backup | forward | direction | attributes |
  //       harmony | figured-bass | print | sound | barline |
  //       grouping | link | bookmark)*">
  let elements = part.map((element) => {
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
        return xml`<!-- unknown type (class ${element._class}) -->`;
    }
  });
  return dangerous`<part${attribs}>\n${elements
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</part>`;
}

function noteToXML(note: Note) {
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
  let attribs = "";
  attribs += printStyleToXML(note);
  attribs += printoutToXML(note);
  if (defined(note.dynamics)) {
    attribs += xml` dynamics="${note.dynamics}"`;
  }
  if (defined(note.endDynamics)) {
    attribs += xml` end-dynamics="${note.endDynamics}"`;
  }
  if (defined(note.attack)) {
    attribs += xml` attack="${note.attack}"`;
  }
  if (defined(note.release)) {
    attribs += xml` release="${note.release}"`;
  }
  attribs += timeOnlyToXML(note);
  if (defined(note.pizzicato)) {
    attribs += yesNo` pizzicato="${note.pizzicato}"`;
  }

  // <!ELEMENT note
  //     (((grace, %full-note;, (tie, tie?)?) |
  //     (cue, %full-note;, duration) |
  //     (%full-note;, duration, (tie, tie?)?)),
  //     ...
  let elements: string[] = [];
  if (note.grace) {
    let graceAttribs = "";
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
      graceAttribs += xml` steal-time-previous="${note.grace.stealTimePrevious}"`;
    }
    if (note.grace.stealTimeFollowing) {
      graceAttribs += xml` steal-time-following="${note.grace.stealTimeFollowing}"`;
    }
    if (note.grace.makeTime) {
      graceAttribs += xml` make-time="${note.grace.makeTime}"`;
    }
    if (note.grace.slash !== undefined && note.grace.slash !== null) {
      graceAttribs += yesNo` slash="${note.grace.slash}"`;
    }
    elements.push(dangerous`<grace${graceAttribs} />`);
  } else if (note.cue) {
    elements.push(xml`<cue />`);
  }

  /*
        <!ENTITY % full-note "(chord?, (pitch | unpitched | rest))">
    */

  if (note.chord) {
    elements.push(xml`<chord />`);
  }

  if (note.pitch) {
    /*
            <!ELEMENT pitch (step, alter?, octave)>
            <!ELEMENT step (#PCDATA)>
            <!ELEMENT alter (#PCDATA)>
            <!ELEMENT octave (#PCDATA)>
        */
    let pitchElements: string[] = [];
    if (note.pitch.step) {
      pitchElements.push(xml`<step>${note.pitch.step.toUpperCase()}</step>`);
    }
    if (note.pitch.alter) {
      pitchElements.push(xml`<alter>${note.pitch.alter}</alter>`);
    }
    if (note.pitch.octave) {
      pitchElements.push(xml`<octave>${note.pitch.octave}</octave>`);
    }
    elements.push(
      dangerous`<pitch>\n${pitchElements
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</pitch>`
    );
  } else if (note.unpitched) {
    // <!ELEMENT unpitched ((display-step, display-octave)?)>
    let upChildren: string[] = [];
    if (note.unpitched.displayStep) {
      upChildren.push(
        xml`<display-step>${note.unpitched.displayStep}</display-step>`
      );
    }
    if (note.unpitched.displayOctave) {
      upChildren.push(
        xml`<display-octave>${note.unpitched.displayOctave}</display-octave>`
      );
    }
    elements.push(
      dangerous`<unpitched>\n${upChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</unpitched>`
    );
  } else if (note.rest) {
    let restAttribs = "";
    let restChildren: string[] = [];
    if (note.rest.displayStep) {
      restChildren.push(
        `<display-step>${note.rest.displayStep}</display-step>`
      );
    }
    if (note.rest.displayOctave) {
      restChildren.push(
        `<display-octave>${note.rest.displayOctave}</display-octave>`
      );
    }
    if (note.rest.measure !== undefined && note.rest.measure !== null) {
      restAttribs += yesNo` measure="${note.rest.measure}"`;
    }
    elements.push(
      dangerous`<rest${restAttribs}>\n${restChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</rest>`
    );
  }

  if (!note.grace && note.duration) {
    elements.push(xml`<duration>${note.duration}</duration>`);
  }

  if (note.ties && note.ties.length) {
    let tieAttribs = xml` type="${
      note.ties[0].type === StartStop.Stop ? "stop" : "start"
    }"`;
    elements.push(dangerous`<tie${tieAttribs} />`);
  }

  // ...
  // instrument?, %editorial-voice;, type?, dot*,
  // ...

  if (note.instrument) {
    elements.push(xml`<instrument id="${note.instrument.id}" />`);
  }

  elements = elements.concat(editorialVoiceToXML(note));

  if (note.noteType && defined(note.noteType.duration)) {
    elements.push(xml`<type>${countToXML[note.noteType.duration]}</type>`);
  }

  (note.dots || []).forEach(() => {
    elements.push(xml`<dot />`);
  });

  // ...
  // accidental?, time-modification?, stem?, notehead?,
  // ...

  if (note.accidental) {
    let accidentalAttribs = "";
    if (
      note.accidental.editorial !== undefined &&
      note.accidental.editorial !== null
    ) {
      accidentalAttribs += yesNo` editorial="${note.accidental.editorial}"`;
    }
    if (
      note.accidental.cautionary !== undefined &&
      note.accidental.cautionary !== null
    ) {
      accidentalAttribs += yesNo` cautionary="${note.accidental.cautionary}"`;
    }
    elements.push(
      dangerous`<accidental${accidentalAttribs}>${
        accidentalToXML[note.accidental.accidental]
      }</accidental>`
    ); // (safe)
  }

  if (note.timeModification) {
    let timeModificationChildren: string[] = [];

    // <!ELEMENT time-modification
    // 	(actual-notes, normal-notes,
    // 	(normal-type, normal-dot*)?)>
    // <!ELEMENT actual-notes (#PCDATA)>
    // <!ELEMENT normal-notes (#PCDATA)>
    // <!ELEMENT normal-type (#PCDATA)>
    // <!ELEMENT normal-dot EMPTY>

    if (note.timeModification.actualNotes) {
      timeModificationChildren.push(
        xml`<actual-notes>${note.timeModification.actualNotes}</actual-notes>`
      );
    }
    if (note.timeModification.normalNotes) {
      timeModificationChildren.push(
        xml`<normal-notes>${note.timeModification.normalNotes}</normal-notes>`
      );
    }
    if (note.timeModification.normalType) {
      timeModificationChildren.push(
        xml`<normal-type>${note.timeModification.normalType}</normal-type>`
      );
    }
    (note.timeModification.normalDots || []).forEach(() => {
      timeModificationChildren.push(xml`<normal-dot />`);
    });

    elements.push(
      dangerous`<time-modification>\n${timeModificationChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</time-modification>`
    );
  }

  if (note.stem) {
    let stemAttribs = "" + positionToXML(note.stem) + colorToXML(note.stem);
    elements.push(
      dangerous`<stem${stemAttribs}>${stemToXML[note.stem.type]}</stem>`
    ); // (safe)
  }

  if (note.notehead) {
    let hattribs = "" + fontToXML(note.notehead) + colorToXML(note.notehead);

    if (defined(note.notehead.filled)) {
      hattribs += yesNo` filled="${note.notehead.filled}"`;
    }

    if (defined(note.notehead.parentheses)) {
      hattribs += yesNo` parentheses="${note.notehead.parentheses}"`;
    }
    elements.push(
      dangerous`<notehead${hattribs}>${
        noteheadTypeToXML[note.notehead.type]
      }</notehead>`
    );
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
    elements.push(xml`<staff>${note.staff}</staff>`);
  }

  (note.beams || []).forEach((beam) => {
    let beamAttribs = xml` number="${beam.number}"`;

    if (defined(beam.repeater)) {
      beamAttribs += yesNo` repeater="${beam.repeater}"`;
    }
    if (defined(beam.fan)) {
      beamAttribs += xml` fan="${accelRitNoneToXML[beam.fan]}"`;
    }
    elements.push(
      dangerous`<beam${beamAttribs}>${beamTypeToXML[beam.type]}</beam>`
    ); // safe
  });

  (note.notations || []).forEach((notation) => {
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
    let notationsAttribs = "";
    let nChildren: string[] = [];
    if (defined(notation.printObject)) {
      notationsAttribs += yesNo` print-object="${notation.printObject}"`;
    }
    nChildren = nChildren.concat(editorialToXML(notation));

    (notation.tieds || []).forEach((tied) => {
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
      nChildren.push(
        dangerous`<tied${
          startStopContinueToXML(tied) +
          numberLevelToXML(tied) +
          lineTypeToXML(tied) +
          dashedFormattingToXML(tied) +
          positionToXML(tied) +
          placementToXML(tied) +
          orientationToXML(tied) +
          bezierToXML(tied) +
          colorToXML(tied)
        } />`
      );
    });

    (notation.slurs || []).forEach((slur) => {
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
      nChildren.push(
        dangerous`<slur${
          startStopContinueToXML(slur) +
          numberLevelToXML(slur) +
          lineTypeToXML(slur) +
          dashedFormattingToXML(slur) +
          positionToXML(slur) +
          placementToXML(slur) +
          orientationToXML(slur) +
          bezierToXML(slur) +
          colorToXML(slur)
        } />`
      );
    });

    (notation.tuplets || []).forEach((tuplet) => {
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
      let tattribs = "" + startStopToXML(tuplet) + numberLevelToXML(tuplet);

      if (defined(tuplet.bracket)) {
        tattribs += yesNo` bracket="${tuplet.bracket}"`;
      }
      if (defined(tuplet.showNumber)) {
        tattribs += xml` show-number="${
          actualBothNoneToXML[tuplet.showNumber]
        }"`;
      }
      if (defined(tuplet.showType)) {
        tattribs += xml` show-type="${actualBothNoneToXML[tuplet.showType]}"`;
      }
      tattribs += lineShapeToXML(tuplet);
      tattribs += positionToXML(tuplet);
      tattribs += placementToXML(tuplet);

      let tChildren: string[] = [];

      [
        ["tuplet-actual", "tupletActual"],
        ["tuplet-normal", "tupletNormal"],
      ].forEach((tup) => {
        let data: TupletNormal | TupletActual = (<any>tuplet)[tup[1]];
        if (!data) {
          return;
        }

        let dataChildren: string[] = [];
        if (data.tupletNumber) {
          let num = data.tupletNumber;
          let pcdata = xml`${num.text}`;
          dataChildren.push(
            dangerous`<tuplet-number${
              fontToXML(num) + colorToXML(num)
            }>${pcdata}</tuplet-number>`
          );
        }
        if (data.tupletType) {
          let type = data.tupletType;
          let pcdata = xml`${type.text}`;
          dataChildren.push(
            dangerous`<tuplet-type${
              fontToXML(type) + colorToXML(type)
            }>${pcdata}</tuplet-type>`
          );
        }
        (data.tupletDots || []).forEach((dot) => {
          dataChildren.push(
            dangerous`<tuplet-dot${fontToXML(dot) + colorToXML(dot)} />`
          );
        });

        tChildren.push(
          dangerous`<${tup[0]}>\n${dataChildren
            .join("\n")
            .split("\n")
            .map((n) => "  " + n)
            .join("\n")}\n</${tup[0]}>`
        );
      });
      nChildren.push(
        dangerous`<tuplet${tattribs}>\n${tChildren
          .join("\n")
          .split("\n")
          .map((n) => "  " + n)
          .join("\n")}\n</tuplet>`
      );
    });

    (notation.glissandos || []).forEach((glissando) => {
      // <!ELEMENT glissando (#PCDATA)>
      // <!ATTLIST glissando
      //     type %start-stop; #REQUIRED
      //     number %number-level; "1"
      //     %line-type;
      //     %dashed-formatting;
      //     %print-style;
      // >
      let pcdata = xml`${glissando.text}`;
      nChildren.push(
        dangerous`<glissando${
          startStopToXML(glissando) +
          numberLevelToXML(glissando) +
          lineTypeToXML(glissando) +
          dashedFormattingToXML(glissando) +
          printStyleToXML(glissando)
        }>${pcdata}</glissando>`
      );
    });

    (notation.slides || []).forEach((slide) => {
      // <!ELEMENT slide (#PCDATA)>
      // <!ATTLIST slide
      //     type %start-stop; #REQUIRED
      //     number %number-level; "1"
      //     %line-type;
      //     %dashed-formatting;
      //     %print-style;
      //     %bend-sound;
      // >
      let pcdata = xml`${slide.text}`;
      nChildren.push(
        dangerous`<slide${
          startStopToXML(slide) +
          numberLevelToXML(slide) +
          lineTypeToXML(slide) +
          dashedFormattingToXML(slide) +
          printStyleToXML(slide) +
          bendSoundToXML(slide)
        }>${pcdata}</slide>`
      );
    });

    (notation.ornaments || []).forEach((ornaments) => {
      // <!ELEMENT ornaments
      //     (((trill-mark | turn | delayed-turn | inverted-turn |
      //        delayed-inverted-turn | vertical-turn | shake |
      //        wavy-line | mordent | inverted-mordent | schleifer |
      //        tremolo | other-ornament), accidental-mark*)*)>
      let oChildren: string[] = [];

      // <!ELEMENT trill-mark EMPTY>
      // <!ATTLIST trill-mark
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      // >
      if (ornaments.trillMark) {
        oChildren.push(
          dangerous`<trill-mark${
            printStyleToXML(ornaments.trillMark) +
            placementToXML(ornaments.trillMark) +
            trillSoundToXML(ornaments.trillMark)
          } />`
        );
      }

      // <!ATTLIST turn
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      //     slash %yes-no; #IMPLIED
      // >
      if (ornaments.turn) {
        oChildren.push(
          dangerous`<turn${
            printStyleToXML(ornaments.turn) +
            placementToXML(ornaments.turn) +
            trillSoundToXML(ornaments.turn) +
            slashToXML(ornaments.turn)
          } />`
        );
      }

      // <!ATTLIST delayed-turn
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      //     slash %yes-no; #IMPLIED
      // >
      if (ornaments.delayedTurn) {
        oChildren.push(
          dangerous`<delayed-turn${
            printStyleToXML(ornaments.delayedTurn) +
            placementToXML(ornaments.delayedTurn) +
            trillSoundToXML(ornaments.delayedTurn) +
            slashToXML(ornaments.delayedTurn)
          } />`
        );
      }

      // <!ATTLIST inverted-turn
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      //     slash %yes-no; #IMPLIED
      // >
      if (ornaments.invertedTurn) {
        oChildren.push(
          dangerous`<inverted-turn${
            printStyleToXML(ornaments.invertedTurn) +
            placementToXML(ornaments.invertedTurn) +
            trillSoundToXML(ornaments.invertedTurn) +
            slashToXML(ornaments.invertedTurn)
          } />`
        );
      }

      // <!ATTLIST delayed-inverted-turn
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      //     slash %yes-no; #IMPLIED
      // >
      if (ornaments.delayedInvertedTurn) {
        oChildren.push(
          dangerous`<delayed-inverted-turn${
            printStyleToXML(ornaments.delayedInvertedTurn) +
            placementToXML(ornaments.delayedInvertedTurn) +
            trillSoundToXML(ornaments.delayedInvertedTurn) +
            slashToXML(ornaments.delayedInvertedTurn)
          } />`
        );
      }

      // <!ATTLIST vertical-turn
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      // >
      if (ornaments.verticalTurn) {
        oChildren.push(
          dangerous`<vertical-turn${
            printStyleToXML(ornaments.verticalTurn) +
            placementToXML(ornaments.verticalTurn) +
            trillSoundToXML(ornaments.verticalTurn)
          } />`
        );
      }
      //
      // <!ATTLIST shake
      //     %print-style;
      //     %placement;
      //     %trill-sound;
      // >
      if (ornaments.shake) {
        oChildren.push(
          dangerous`<shake${
            printStyleToXML(ornaments.shake) +
            placementToXML(ornaments.shake) +
            trillSoundToXML(ornaments.shake)
          } />`
        );
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
        oChildren.push(
          dangerous`<mordent${
            mordentSubsetToXML(ornaments.mordent) +
            printStyleToXML(ornaments.mordent) +
            placementToXML(ornaments.mordent) +
            trillSoundToXML(ornaments.mordent)
          } />`
        );
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
        oChildren.push(
          dangerous`<inverted-mordent${
            mordentSubsetToXML(ornaments.invertedMordent) +
            printStyleToXML(ornaments.invertedMordent) +
            placementToXML(ornaments.invertedMordent) +
            trillSoundToXML(ornaments.invertedMordent)
          } />`
        );
      }
      //
      // <!ATTLIST schleifer
      //     %print-style;
      //     %placement;
      // >
      if (ornaments.schleifer) {
        oChildren.push(
          dangerous`<schleifer${
            printStyleToXML(ornaments.schleifer) +
            placementToXML(ornaments.schleifer)
          } />`
        );
      }
      //
      // <!ELEMENT tremolo (#PCDATA)>
      // <!ATTLIST tremolo
      //     type %start-stop-single; "single"
      //     %print-style;
      //     %placement;
      // >
      if (ornaments.tremolo) {
        let pcdata = xml`${ornaments.tremolo.data || ""}`;
        oChildren.push(
          dangerous`<tremolo${
            startStopSingleToXML(ornaments.tremolo) +
            printStyleToXML(ornaments.tremolo) +
            placementToXML(ornaments.tremolo)
          }>${pcdata}</tremolo>`
        );
      }
      //
      // <!ELEMENT other-ornament (#PCDATA)>
      // <!ATTLIST other-ornament
      //     %print-style;
      //     %placement;
      // >
      if (ornaments.otherOrnament) {
        let pcdata = xml`${ornaments.otherOrnament.data || ""}`;
        oChildren.push(
          dangerous`<other-ornament${
            printStyleToXML(ornaments.otherOrnament) +
            placementToXML(ornaments.otherOrnament)
          }>${pcdata}</other-ornament>`
        );
      }
      //
      // <!ELEMENT accidental-mark (#PCDATA)>
      // <!ATTLIST accidental-mark
      //     %print-style;
      //     %placement;
      // >
      (ornaments.accidentalMarks || []).forEach((accidentalMark) => {
        let pcdata = xml`${accidentalMark.mark || ""}`;
        oChildren.push(
          dangerous`<accidental-mark${
            printStyleToXML(accidentalMark) + placementToXML(accidentalMark)
          }>${pcdata}</accidental-mark>`
        );
      });

      nChildren.push(
        dangerous`<ornaments>\n${oChildren
          .join("\n")
          .split("\n")
          .map((n) => "  " + n)
          .join("\n")}\n</ornaments>`
      );
    });

    (notation.technicals || []).forEach((technical) => {
      let oChildren: string[] = [];
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
        oChildren.push(
          dangerous`<up-bow${
            printStyleToXML(technical.upBow) + placementToXML(technical.upBow)
          } />`
        );
      }
      // <!ATTLIST down-bow
      //     %print-style;
      //     %placement;
      // >
      if (technical.downBow) {
        oChildren.push(
          dangerous`<down-bow${
            printStyleToXML(technical.downBow) +
            placementToXML(technical.downBow)
          } />`
        );
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
        let hChildren: string[] = [];

        // <!ELEMENT natural EMPTY>
        // <!ELEMENT artificial EMPTY>
        // <!ELEMENT base-pitch EMPTY>
        // <!ELEMENT touching-pitch EMPTY>
        // <!ELEMENT sounding-pitch EMPTY>
        if (technical.harmonic.natural) {
          hChildren.push(xml`<natural />`);
        }
        if (technical.harmonic.artificial) {
          hChildren.push(xml`<artificial />`);
        }
        if (technical.harmonic.basePitch) {
          hChildren.push(xml`<base-pitch />`);
        }
        if (technical.harmonic.touchingPitch) {
          hChildren.push(xml`<touching-pitch />`);
        }
        if (technical.harmonic.soundingPitch) {
          hChildren.push(xml`<sounding-pitch />`);
        }
        oChildren.push(
          dangerous`<harmonic${
            printObjectToXML(technical.harmonic) +
            printStyleToXML(technical.harmonic) +
            placementToXML(technical.harmonic)
          }>${hChildren
            .join("\n")
            .split("\n")
            .map((n) => "  " + n)
            .join("\n")}\n</harmonic>`
        );
      }

      // <!ATTLIST open-string
      //     %print-style;
      //     %placement;
      // >
      if (technical.openString) {
        oChildren.push(
          dangerous`<open-string${
            printStyleToXML(technical.openString) +
            placementToXML(technical.openString)
          } />`
        );
      }
      //
      // <!ATTLIST thumb-position
      //     %print-style;
      //     %placement;
      // >
      if (technical.thumbPosition) {
        oChildren.push(
          dangerous`<thumb-position${
            printStyleToXML(technical.thumbPosition) +
            placementToXML(technical.thumbPosition)
          } />`
        );
      }
      //
      // <!ELEMENT fingering (#PCDATA)>
      // <!ATTLIST fingering
      //     substitution %yes-no; #IMPLIED
      //     alternate %yes-no; #IMPLIED
      //     %print-style;
      //     %placement;
      // >
      //
      if (technical.fingering) {
        let substitution = "";
        if (defined(technical.fingering.substitution)) {
          substitution += yesNo` substitution="${technical.fingering.substitution}"`;
        }
        let alternate = "";
        if (defined(technical.fingering.alternate)) {
          alternate += yesNo` alternate="${technical.fingering.alternate}"`;
        }
        oChildren.push(
          dangerous`<fingering${
            substitution +
            alternate +
            printStyleToXML(technical.fingering) +
            placementToXML(technical.fingering)
          }>${String(
            parseInt(String(technical.fingering.finger), 10)
          )}</fingering>`
        );
      }
      //
      // <!ELEMENT pluck (#PCDATA)>
      // <!ATTLIST pluck
      //     %print-style;
      //     %placement;
      // >
      if (technical.pluck) {
        oChildren.push(
          dangerous`<pluck${
            printStyleToXML(technical.pluck) + placementToXML(technical.pluck)
          } />`
        );
      }
      //
      // <!ATTLIST double-tongue
      //     %print-style;
      //     %placement;
      // >
      if (technical.doubleTongue) {
        oChildren.push(
          dangerous`<double-tongue${
            printStyleToXML(technical.doubleTongue) +
            placementToXML(technical.doubleTongue)
          } />`
        );
      }
      //
      // <!ATTLIST triple-tongue
      //     %print-style;
      //     %placement;
      // >
      if (technical.tripleTongue) {
        oChildren.push(
          dangerous`<triple-tongue${
            printStyleToXML(technical.tripleTongue) +
            placementToXML(technical.tripleTongue)
          } />`
        );
      }
      //
      // <!ATTLIST stopped
      //     %print-style;
      //     %placement;
      // >
      if (technical.stopped) {
        oChildren.push(
          dangerous`<stopped${
            printStyleToXML(technical.stopped) +
            placementToXML(technical.stopped)
          } />`
        );
      }
      //
      // <!ATTLIST snap-pizzicato
      //     %print-style;
      //     %placement;
      // >
      if (technical.snapPizzicato) {
        oChildren.push(
          dangerous`<snap-pizzicato${
            printStyleToXML(technical.snapPizzicato) +
            placementToXML(technical.snapPizzicato)
          } />`
        );
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
        let pcdata = xml`${technical.hammerOn.data}`;
        oChildren.push(
          dangerous`<hammer-on${
            startStopToXML(technical.hammerOn) +
            numberLevelToXML(technical.hammerOn) +
            printStyleToXML(technical.hammerOn) +
            placementToXML(technical.hammerOn)
          }>${pcdata}</hammer-on>`
        );
      }
      // <!ELEMENT pull-off (#PCDATA)>
      // <!ATTLIST pull-off
      //     type %start-stop; #REQUIRED
      //     number %number-level; "1"
      //     %print-style;
      //     %placement;
      // >
      if (technical.pullOff) {
        let pcdata = xml`${technical.pullOff.data}`;
        oChildren.push(
          dangerous`<pull-off${
            startStopToXML(technical.pullOff) +
            numberLevelToXML(technical.pullOff) +
            printStyleToXML(technical.pullOff) +
            placementToXML(technical.pullOff)
          }>${pcdata}</pull-off>`
        );
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
        let bendChildren: string[] = [];
        if (defined(technical.bend.bendAlter)) {
          bendChildren.push(
            xml`<bend-alter>${technical.bend.bendAlter}</bend-alter>`
          );
        }
        if (defined(technical.bend.preBend)) {
          bendChildren.push(xml`<pre-bend />`);
        } else if (defined(technical.bend.release)) {
          bendChildren.push(xml`<release />`);
        }
        if (defined(technical.bend.withBar)) {
          let pcdata = xml`${technical.bend.withBar.data}`;
          bendChildren.push(
            dangerous`<with-bar${
              printStyleToXML(technical.bend.withBar) +
              placementToXML(technical.bend.withBar)
            }>${pcdata}</with-bar>`
          );
        }
        oChildren.push(
          dangerous`<bend${
            printStyleToXML(technical.bend) + bendSoundToXML(technical.bend)
          }>\n${bendChildren
            .join("\n")
            .split("\n")
            .map((n) => "  " + n)
            .join("\n")}\n</bend>`
        );
      }
      //
      // <!ELEMENT tap (#PCDATA)>
      // <!ATTLIST tap
      //     %print-style;
      //     %placement;
      // >
      if (technical.tap) {
        let pcdata = xml`${technical.tap.data}`;
        oChildren.push(
          dangerous`<tap${
            printStyleToXML(technical.tap) + placementToXML(technical.tap)
          }>${pcdata}</tap>`
        );
      }
      //
      // <!ATTLIST heel
      //     substitution %yes-no; #IMPLIED
      //     %print-style;
      //     %placement;
      // >
      if (technical.heel) {
        let substitution = "";
        if (defined(technical.heel.substitution)) {
          substitution += yesNo` substitution="${technical.heel.substitution}"`;
        }
        oChildren.push(
          dangerous`<heel${
            substitution +
            printStyleToXML(technical.heel) +
            placementToXML(technical.heel)
          } />`
        );
      }
      // <!ATTLIST toe
      //     substitution %yes-no; #IMPLIED
      //     %print-style;
      //     %placement;
      // >
      if (technical.toe) {
        let substitution = "";
        if (defined(technical.toe.substitution)) {
          substitution += yesNo` substitution="${technical.toe.substitution}"`;
        }
        oChildren.push(
          dangerous`<toe${
            substitution +
            printStyleToXML(technical.toe) +
            placementToXML(technical.toe)
          } />`
        );
      }
      //
      // <!ATTLIST fingernails
      //     %print-style;
      //     %placement;
      // >
      if (technical.fingernails) {
        oChildren.push(
          dangerous`<fingernails${
            printStyleToXML(technical.fingernails) +
            placementToXML(technical.fingernails)
          } />`
        );
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
        let holeChildren: string[] = [];
        if (defined(technical.hole.holeType)) {
          holeChildren.push(
            xml`<hole-type>${technical.hole.holeType}</hole-type>`
          );
        }
        if (defined(technical.hole.holeClosed)) {
          let holeClosedAttribs = "";
          if (defined(technical.hole.holeClosed.location)) {
            holeClosedAttribs = xml` location="${
              holeLocationToXML[technical.hole.holeClosed.location]
            }"`;
          }
          holeChildren.push(
            dangerous`<hole-closed${holeClosedAttribs}>${
              holeClosedTypeToXML[technical.hole.holeClosed.data]
            }</hole-closed>`
          );
        }
        if (defined(technical.hole.holeShape)) {
          holeChildren.push(
            xml`<hole-shape>${technical.hole.holeShape}</hole-shape>`
          );
        }
        oChildren.push(
          dangerous`<hole${
            printStyleToXML(technical.hole) + placementToXML(technical.hole)
          }>${holeChildren
            .join("\n")
            .split("\n")
            .map((n) => "  " + n)
            .join("\n")}\n</hole>`
        );
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
        let arrowChildren: string[] = [];
        if (defined(technical.arrow.arrowDirection)) {
          arrowChildren.push(xml`<arrow-direction>
                        ${technical.arrow.arrowDirection}</arrow-direction>`);
        }
        if (defined(technical.arrow.arrowStyle)) {
          arrowChildren.push(xml`<arrow-style>
                        ${technical.arrow.arrowStyle}</arrow-style>`);
        }
        if (defined(technical.arrow.circularArrow)) {
          arrowChildren.push(xml`<circular-arrow>
                        ${technical.arrow.circularArrow}</circular-arrow>`);
        }
        oChildren.push(
          dangerous`<arrow${
            printStyleToXML(technical.arrow) + placementToXML(technical.arrow)
          }>${arrowChildren
            .join("\n")
            .split("\n")
            .map((n) => "  " + n)
            .join("\n")}\n</arrow>`
        );
      }
      //
      // <!ELEMENT handbell (#PCDATA)>
      // <!ATTLIST handbell
      //     %print-style;
      //     %placement;
      // >
      if (technical.handbell) {
        let pcdata = xml`${technical.handbell.data}`;
        oChildren.push(
          dangerous`<handbell${
            printStyleToXML(technical.handbell) +
            placementToXML(technical.handbell)
          }>${pcdata}</handbell>`
        );
      }
      //
      // <!ELEMENT other-technical (#PCDATA)>
      // <!ATTLIST other-technical
      //     %print-style;
      //     %placement;
      // >
      if (technical.otherTechnical) {
        let pcdata = xml`${technical.otherTechnical.data}`;
        oChildren.push(
          dangerous`<other-technical${
            printStyleToXML(technical.otherTechnical) +
            placementToXML(technical.otherTechnical)
          }>${pcdata}</other-technical>`
        );
      }

      nChildren.push(
        dangerous`<technical>\n${oChildren
          .join("\n")
          .split("\n")
          .map((n) => "  " + n)
          .join("\n")}\n</technical>`
      );
    });

    (notation.articulations || []).forEach((articulation) => {
      let oChildren: string[] = [];
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
        oChildren.push(
          dangerous`<accent${
            printStyleToXML(articulation.accent) +
            placementToXML(articulation.accent)
          } />`
        );
      }
      // <!ATTLIST strong-accent
      //     %print-style;
      //     %placement;
      //     type %up-down; "up"
      // >
      if (articulation.strongAccent) {
        oChildren.push(
          dangerous`<strong-accent${
            printStyleToXML(articulation.strongAccent) +
            placementToXML(articulation.strongAccent) +
            upDownToXML(articulation.strongAccent)
          } />`
        );
      }
      //
      // <!ATTLIST staccato
      //     %print-style;
      //     %placement;
      // >
      if (articulation.staccato) {
        oChildren.push(
          dangerous`<staccato${
            printStyleToXML(articulation.staccato) +
            placementToXML(articulation.staccato)
          } />`
        );
      }
      // <!ATTLIST tenuto
      //     %print-style;
      //     %placement;
      // >
      if (articulation.tenuto) {
        oChildren.push(
          dangerous`<tenuto${
            printStyleToXML(articulation.tenuto) +
            placementToXML(articulation.tenuto)
          } />`
        );
      }
      // <!ATTLIST detached-legato
      //     %print-style;
      //     %placement;
      // >
      if (articulation.detachedLegato) {
        oChildren.push(
          dangerous`<detached-legato${
            printStyleToXML(articulation.detachedLegato) +
            placementToXML(articulation.detachedLegato)
          } />`
        );
      }
      //
      // <!ATTLIST staccatissimo
      //     %print-style;
      //     %placement;
      // >
      if (articulation.staccatissimo) {
        oChildren.push(
          dangerous`<staccatissimo${
            printStyleToXML(articulation.staccatissimo) +
            placementToXML(articulation.staccatissimo)
          } />`
        );
      }
      //
      // <!ATTLIST spiccato
      //     %print-style;
      //     %placement;
      // >
      if (articulation.spiccato) {
        oChildren.push(
          dangerous`<spiccato${
            printStyleToXML(articulation.spiccato) +
            placementToXML(articulation.spiccato)
          } />`
        );
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
        oChildren.push(
          dangerous`<scoop${
            lineShapeToXML(articulation.scoop) +
            lineTypeToXML(articulation.scoop) +
            dashedFormattingToXML(articulation.scoop) +
            printStyleToXML(articulation.scoop) +
            placementToXML(articulation.scoop)
          } />`
        );
      }
      // <!ATTLIST plop
      //     %line-shape;
      //     %line-type;
      //     %dashed-formatting;
      //     %print-style;
      //     %placement;
      // >
      if (articulation.plop) {
        oChildren.push(
          dangerous`<plop${
            lineShapeToXML(articulation.plop) +
            lineTypeToXML(articulation.plop) +
            dashedFormattingToXML(articulation.plop) +
            printStyleToXML(articulation.plop) +
            placementToXML(articulation.plop)
          } />`
        );
      }
      // <!ATTLIST doit
      //     %line-shape;
      //     %line-type;
      //     %dashed-formatting;
      //     %print-style;
      //     %placement;
      // >
      if (articulation.doit) {
        oChildren.push(
          dangerous`<doit${
            lineShapeToXML(articulation.doit) +
            lineTypeToXML(articulation.doit) +
            dashedFormattingToXML(articulation.doit) +
            printStyleToXML(articulation.doit) +
            placementToXML(articulation.doit)
          } />`
        );
      }
      // <!ATTLIST falloff
      //     %line-shape;
      //     %line-type;
      //     %dashed-formatting;
      //     %print-style;
      //     %placement;
      // >
      if (articulation.falloff) {
        oChildren.push(
          dangerous`<falloff${
            lineShapeToXML(articulation.falloff) +
            lineTypeToXML(articulation.falloff) +
            dashedFormattingToXML(articulation.falloff) +
            printStyleToXML(articulation.falloff) +
            placementToXML(articulation.falloff)
          } />`
        );
      }
      //
      // <!ELEMENT breath-mark (#PCDATA)>
      // <!ATTLIST breath-mark
      //     %print-style;
      //     %placement;
      // >
      if (articulation.breathMark) {
        let pcdata = xml`${breathMarkTypeToXML[articulation.breathMark.type]}`;
        oChildren.push(
          dangerous`<breath-mark${
            printStyleToXML(articulation.breathMark) +
            placementToXML(articulation.breathMark)
          }>${pcdata}</breath-mark>`
        );
      }
      //
      // <!ATTLIST caesura
      //     %print-style;
      //     %placement;
      // >
      if (articulation.caesura) {
        oChildren.push(
          dangerous`<caesura${
            printStyleToXML(articulation.caesura) +
            placementToXML(articulation.caesura)
          } />`
        );
      }
      // <!ATTLIST stress
      //     %print-style;
      //     %placement;
      // >
      if (articulation.stress) {
        oChildren.push(
          dangerous`<stress${
            printStyleToXML(articulation.stress) +
            placementToXML(articulation.stress)
          } />`
        );
      }
      // <!ATTLIST unstress
      //     %print-style;
      //     %placement;
      // >
      if (articulation.unstress) {
        oChildren.push(
          dangerous`<unstress${
            printStyleToXML(articulation.unstress) +
            placementToXML(articulation.unstress)
          } />`
        );
      }
      // <!ELEMENT other-articulation (#PCDATA)>
      // <!ATTLIST other-articulation
      //     %print-style;
      //     %placement;
      // >
      (articulation.otherArticulations || []).forEach((articulation) => {
        let pcdata = xml`${articulation.data}`;
        oChildren.push(
          dangerous`<other-articulation${
            printStyleToXML(articulation) + placementToXML(articulation)
          }>${pcdata}</other-articulation>`
        );
      });

      nChildren.push(
        dangerous`<articulations>\n${oChildren
          .join("\n")
          .split("\n")
          .map((n) => "  " + n)
          .join("\n")}\n</articulations>`
      );
    });

    (notation.dynamics || []).forEach((dynamics) => {
      nChildren.push(dynamicsToXML(dynamics));
    });

    (notation.fermatas || []).forEach((fermata) => {
      nChildren.push(fermataToXML(fermata));
    });

    (notation.arpeggiates || []).forEach((arpeggiate) => {
      // <!ATTLIST arpeggiate
      //     number %number-level; #IMPLIED
      //     direction %up-down; #IMPLIED
      //     %position;
      //     %placement;
      //     %color;
      // >
      nChildren.push(
        dangerous`<arpeggiate${
          numberLevelToXML(arpeggiate) +
          upDownDirectionToXML(arpeggiate) +
          positionToXML(arpeggiate) +
          placementToXML(arpeggiate) +
          colorToXML(arpeggiate)
        } />`
      );
    });

    (notation.nonArpeggiates || []).forEach((nonArpeggiate) => {
      // <!ATTLIST non-arpeggiate
      //     type %top-bottom; #REQUIRED
      //     number %number-level; #IMPLIED
      //     %position;
      //     %placement;
      //     %color;
      // >
      nChildren.push(
        dangerous`<non-arpeggiate${
          topBottomToXML(nonArpeggiate) +
          numberLevelToXML(nonArpeggiate) +
          positionToXML(nonArpeggiate) +
          placementToXML(nonArpeggiate) +
          colorToXML(nonArpeggiate)
        } />`
      );
    });

    (notation.accidentalMarks || []).forEach((accidentalMark) => {
      // <!ELEMENT accidental-mark (#PCDATA)>
      // <!ATTLIST accidental-mark
      //     %print-style;
      //     %placement;
      // >
      let pcdata = xml`${accidentalMark.mark}`;
      nChildren.push(
        dangerous`<accidental-mark${
          printStyleToXML(accidentalMark) + placementToXML(accidentalMark)
        }>${pcdata}</accidental-mark>`
      );
    });

    (notation.otherNotations || []).forEach((otherNotation) => {
      // <!ELEMENT other-notation (#PCDATA)>
      // <!ATTLIST other-notation
      //     type %start-stop-single; #REQUIRED
      //     number %number-level; "1"
      //     %print-object;
      //     %print-style;
      //     %placement;
      // >
      let pcdata = xml`${otherNotation.data}`;
      nChildren.push(
        dangerous`<other-notation${
          startStopSingleToXML(otherNotation) +
          numberLevelToXML(otherNotation) +
          printObjectToXML(otherNotation) +
          printStyleToXML(otherNotation) +
          placementToXML(otherNotation)
        }>${pcdata}</other-notation>`
      );
    });

    elements.push(
      dangerous`<notations${notationsAttribs}>\n${nChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</notations>`
    );
  });

  (note.lyrics || []).forEach((lyric) => {
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
    let lyricAttribs =
      "" +
      numberLevelToXML(lyric) +
      nameToXML(lyric) +
      justifyToXML(lyric) +
      positionToXML(lyric) +
      placementToXML(lyric) +
      colorToXML(lyric) +
      printObjectToXML(lyric);

    let lyricChildren: string[] = [];
    (lyric.lyricParts || []).forEach((part) => {
      // relies on part._class as set in musicxml-interfaces
      switch (part._class) {
        case "Syllabic":
          // <!ELEMENT syllabic (#PCDATA)>
          lyricChildren.push(
            dangerous`<syllabic>${syllabicTypeToXML[part.data]}</syllabic>`
          );
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
          let textpcdata: string = xml`${part.data}`;
          lyricChildren.push(
            dangerous`<text${
              fontToXML(part) +
              colorToXML(part) +
              textDecorationToXML(part) +
              textRotationToXML(part) +
              letterSpacingToXML(part) +
              textDirectionToXML(part)
            }>${textpcdata}</text>`
          );
          break;
        case "Elision":
          // <!ELEMENT elision (#PCDATA)>
          // <!ATTLIST elision
          //     %font;
          //     %color;
          // >
          let pcdata: string = xml`${part.data}`;
          lyricChildren.push(
            dangerous`<elision${
              startStopContinueToXML(part) + printStyleToXML(part)
            }>${pcdata}</elision>`
          );
          break;
        case "Extend":
          // <!ELEMENT extend EMPTY>
          // <!ATTLIST extend
          //     type %start-stop-continue; #IMPLIED
          //     %print-style;
          // >
          lyricChildren.push(
            dangerous`<extend${
              startStopContinueToXML(part) + printStyleToXML(part)
            } />`
          );
          break;
        case "Laughing":
          // <!ELEMENT laughing EMPTY>
          lyricChildren.push(xml`<laughing />`);
          break;
        case "Humming":
          // <!ELEMENT humming EMPTY>
          lyricChildren.push(xml`<humming />`);
          break;
        case "EndLine":
          // <!ELEMENT end-line EMPTY>
          lyricChildren.push(xml`<end-line />`);
          break;
        case "EndParagraph":
          // <!ELEMENT end-paragraph EMPTY>
          lyricChildren.push(xml`<end-paragraph />`);
          break;
        case "Footnote":
        case "Level":
        case "Editorial":
          lyricChildren = lyricChildren.concat(editorialToXML(part));
          break;
      }
    });

    elements.push(
      dangerous`<lyric${lyricAttribs}>\n${lyricChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</lyric>`
    );
  });

  if (defined(note.play)) {
    // <!ELEMENT play ((ipa | mute | semi-pitched | other-play)*)>
    // <!ATTLIST play
    //     id IDREF #IMPLIED
    // >
    let playAttribs = "";
    let playChildren: string[] = [];
    // TODO: musicxml-interfaces is missing play.id!!
    // if (defined(note.play.id)) {
    //     playAttribs += xml ` id="${note.play.id}"`;
    // }

    // <!ELEMENT ipa (#PCDATA)>
    if (defined(note.play.ipa)) {
      playChildren.push(xml`<ipa>${note.play.ipa}</ipa>`);
    }
    // <!ELEMENT mute (#PCDATA)>
    if (defined(note.play.mute)) {
      playChildren.push(xml`<mute>${note.play.mute}</mute>`);
    }
    // <!ELEMENT semi-pitched (#PCDATA)>
    if (defined(note.play.semiPitched)) {
      playChildren.push(
        xml`<semi-pitched>${note.play.semiPitched}</semi-pitched>`
      );
    }
    // <!ELEMENT other-play (#PCDATA)>
    // <!ATTLIST other-play
    //     type CDATA #REQUIRED
    // >
    if (defined(note.play.otherPlay)) {
      let oPcdata = xml`${note.play.otherPlay.data}`;
      let oAttribs = "";
      if (defined(note.play.otherPlay.type)) {
        oAttribs += xml` type="${note.play.otherPlay.type}"`;
      }
      playChildren.push(
        dangerous`<other-play${oAttribs}>${oPcdata}</other-play>`
      );
    }
    elements.push(
      dangerous`<play${playAttribs}>\n${playChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</play>`
    );
  }

  return dangerous`<note${attribs}>\n${elements
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</note>`;
}

function figuredBassToXML(figuredBass: FiguredBass): string {
  // <!ELEMENT figured-bass (figure+, duration?, %editorial;)>
  // <!ATTLIST figured-bass
  //     %print-style;
  //     %printout;
  //     parentheses %yes-no; #IMPLIED
  // >
  let attribs = "" + printStyleToXML(figuredBass) + printoutToXML(figuredBass);
  if (defined(figuredBass.parentheses)) {
    attribs += yesNo` parentheses="${figuredBass.parentheses}"`;
  }
  let children: string[] = [];
  children = children.concat(staffDebugInfoToXMLComment(figuredBass));
  (figuredBass.figures || []).forEach((figure) => {
    // <!ELEMENT figure (prefix?, figure-number?, suffix?, extend?)>
    let fChildren: string[] = [];

    // <!ELEMENT prefix (#PCDATA)>
    // <!ATTLIST prefix
    //     %print-style;
    // >
    if (defined(figure.prefix)) {
      let pcdata = xml`${figure.prefix.data}`;
      fChildren.push(
        dangerous`<prefix${printStyleToXML(figure.prefix)}>${pcdata}</prefix>`
      );
    }
    // <!ELEMENT figure-number (#PCDATA)>
    // <!ATTLIST figure-number
    //     %print-style;
    // >
    if (defined(figure.figureNumber)) {
      let pcdata = xml`${figure.figureNumber.data}`;
      fChildren.push(
        dangerous`<figure-number${printStyleToXML(
          figure.figureNumber
        )}>${pcdata}</figure-number>`
      );
    }
    // <!ELEMENT suffix (#PCDATA)>
    // <!ATTLIST suffix
    //     %print-style;
    // >
    if (defined(figure.suffix)) {
      let pcdata = xml`${figure.suffix.data}`;
      fChildren.push(
        dangerous`<suffix${printStyleToXML(figure.suffix)}>${pcdata}</suffix>`
      );
    }
    children.push(
      dangerous`<figure>\n${fChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</figure>`
    );
  });
  if (defined(figuredBass.duration)) {
    children.push(xml`<duration>${figuredBass.duration}</duration>`);
  }
  children = children.concat(editorialToXML(figuredBass));

  return dangerous`<figured-bass${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</figured-bass>`;
}

let barlineLocationToXML: { [key: number]: string } = {
  1: "right",
  2: "middle",
  0: "left",
};

function barlineToXML(barline: Barline): string {
  // <!ELEMENT barline (bar-style?, %editorial;, wavy-line?,
  //     segno?, coda?, (fermata, fermata?)?, ending?, repeat?)>
  // <!ATTLIST barline
  //     location (right | left | middle) "right"
  //     segno CDATA #IMPLIED
  //     coda CDATA #IMPLIED
  //     divisions CDATA #IMPLIED
  // >
  let children: string[] = [];
  let attribs = "";
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
  (barline.fermatas || []).forEach((fermata) => {
    children.push(fermataToXML(fermata));
  });
  if (defined(barline.ending)) {
    children.push(endingToXML(barline.ending));
  }
  if (defined(barline.repeat)) {
    children.push(repeatToXML(barline.repeat));
  }
  if (defined(barline.location)) {
    attribs += xml` location="${barlineLocationToXML[barline.location]}"`;
  }
  if (defined(barline.segnoAttrib)) {
    attribs += xml` segno="${barline.segnoAttrib}"`;
  }
  if (defined(barline.codaAttrib)) {
    attribs += xml` coda="${barline.codaAttrib}"`;
  }
  if (defined(barline.divisions)) {
    attribs += xml` divisions="${barline.divisions}"`;
  }
  return dangerous`<barline${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</barline>`;
}

function directionTypeToXML(d: DirectionType) {
  // <!ELEMENT direction-type (rehearsal+ | segno+ | words+ |
  let children: string[] = [];

  (d.rehearsals || []).forEach((rehearsal) => {
    children.push(rehearsalToXML(rehearsal));
  });
  (d.segnos || []).forEach((segno) => {
    children.push(segnoToXML(segno));
  });
  (d.words || []).forEach((words) => {
    children.push(wordsToXML(words));
  });
  //     coda+ | wedge | dynamics+ | dashes | bracket | pedal |
  (d.codas || []).forEach((coda) => {
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
  (d.percussions || []).forEach((p) => {
    children.push(percussionToXML(p));
  });
  //     other-direction)>
  if (defined(d.otherDirection)) {
    children.push(otherDirectionToXML(d.otherDirection));
  }

  return dangerous`<direction-type>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</direction-type>`;
}

function offsetToXML(offset: Offset): string {
  // <!ELEMENT offset (#PCDATA)>
  // <!ATTLIST offset
  //     sound %yes-no; #IMPLIED
  // >
  let pcdata = xml`${offset.data || ""}`;
  let attribs = yesNo` sound="${offset.sound}"`;
  return dangerous`<offset${attribs}>${pcdata}</offset>`;
}

function rehearsalToXML(rehearsal: Rehearsal): string {
  // <!ELEMENT rehearsal (#PCDATA)>
  // <!ATTLIST rehearsal
  //     %text-formatting;
  // >
  let pcdata = xml`${rehearsal.data}`;
  return dangerous`<rehearsal${textFormattingToXML(
    rehearsal
  )}>${pcdata}</rehearsal>`;
}

function wordsToXML(words: Words): string {
  // <!ELEMENT words (#PCDATA)>
  // <!ATTLIST words
  //     %text-formatting;
  // >
  let pcdata = xml`${words.data}`;
  return dangerous`<words${textFormattingToXML(words)}>${pcdata}</words>`;
}

let wedgeTypeToXML: { [key: number]: string } = {
  [WedgeType.Diminuendo]: "diminuendo",
  [WedgeType.Crescendo]: "crescendo",
  [WedgeType.Stop]: "stop",
  [WedgeType.Continue]: "continue",
};

function wedgeToXML(wedge: Wedge): string {
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
  let attribs =
    "" + xml` type="${wedgeTypeToXML[wedge.type]}"` + numberLevelToXML(wedge);

  if (defined(wedge.spread)) {
    attribs += xml` spread="${wedge.spread}"`;
  }
  if (defined(wedge.niente)) {
    attribs += yesNo` niente="${wedge.niente}"`;
  }
  attribs +=
    lineTypeToXML(wedge) +
    dashedFormattingToXML(wedge) +
    positionToXML(wedge) +
    colorToXML(wedge);

  return dangerous`<wedge${attribs} />`;
}

function dynamicsToXML(dynamics: Dynamics): string {
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
  let oChildren: string[] = [];

  Object.keys(dynamics || {}).forEach((key) => {
    let subDynamic = dynamics[key];
    if (
      !!subDynamic &&
      [
        "p",
        "pp",
        "ppp",
        "pppp",
        "ppppp",
        "pppppp",
        "f",
        "ff",
        "fff",
        "ffff",
        "fffff",
        "ffffff",
        "mp",
        "mf",
        "sf",
        "sfp",
        "sfpp",
        "fp",
        "rf",
        "rfz",
        "sfz",
        "sffz",
        "fz",
      ].indexOf(key) !== -1
    ) {
      oChildren.push(dangerous`<${key} />`);
    }
  });
  if (dynamics.otherDynamics) {
    oChildren.push(
      xml`<other-dynamics>${dynamics.otherDynamics}</other-dynamics>`
    );
  }
  return dangerous`<dynamics${
    printStyleAlignToXML(dynamics) +
    placementToXML(dynamics) +
    textDecorationToXML(dynamics) +
    enclosureToXML(dynamics)
  }>\n${oChildren
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</dynamics>`;
}

function dashesToXML(dashes: Dashes): string {
  // <!ELEMENT dashes EMPTY>
  // <!ATTLIST dashes
  //     type %start-stop-continue; #REQUIRED
  //     number %number-level; #IMPLIED
  //     %dashed-formatting;
  //     %position;
  //     %color;
  // >
  let attribs =
    "" +
    startStopContinueToXML(dashes) +
    numberLevelToXML(dashes) +
    dashedFormattingToXML(dashes) +
    positionToXML(dashes) +
    colorToXML(dashes);

  return dangerous`<dashes${attribs} />`;
}

let lineEndTypeToXML: { [key: number]: string } = {
  [LineEndType.None]: "none",
  [LineEndType.Both]: "both",
  [LineEndType.Arrow]: "arrow",
  [LineEndType.Down]: "down",
  [LineEndType.Up]: "up",
};

function bracketToXML(bracket: Bracket): string {
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
  let attribs =
    "" + startStopContinueToXML(bracket) + numberLevelToXML(bracket);

  attribs += xml` line-end="${lineEndTypeToXML[bracket.lineEnd]}"`;
  if (defined(bracket.endLength)) {
    attribs += xml` end-length="${bracket.endLength}"`;
  }

  attribs +=
    lineTypeToXML(bracket) +
    dashedFormattingToXML(bracket) +
    positionToXML(bracket) +
    colorToXML(bracket);

  return dangerous`<bracket${attribs} />`;
}

let pedalTypeToXML: { [key: number]: string } = {
  [PedalType.Change]: "change",
  [PedalType.Start]: "start",
  [PedalType.Stop]: "stop",
  [PedalType.Continue]: "continue",
};

function pedalToXML(pedal: Pedal): string {
  // <!ELEMENT pedal EMPTY>
  // <!ATTLIST pedal
  //     type (start | stop | continue | change) #REQUIRED
  //     line %yes-no; #IMPLIED
  //     sign %yes-no; #IMPLIED
  //     %print-style-align;
  // >
  let attribs = "" + xml` type="${pedalTypeToXML[pedal.type]}"`;
  if (defined(pedal.line)) {
    attribs += yesNo` line="${pedal.line}"`;
  }
  if (defined(pedal.sign)) {
    attribs += yesNo` sign="${pedal.sign}"`;
  }
  attribs += printStyleAlignToXML(pedal);
  return dangerous`<pedal${attribs} />`;
}

function metronomeToXML(metronome: Metronome): string {
  // <!ELEMENT metronome
  //     ((beat-unit, beat-unit-dot*,
  //      (per-minute | (beat-unit, beat-unit-dot*))) |
  //     (metronome-note+, (metronome-relation, metronome-note+)?))>
  // <!ATTLIST metronome
  //     %print-style-align;
  //     %justify;
  //     parentheses %yes-no; #IMPLIED
  // >
  let children: string[] = [];
  let attribs = "" + printStyleAlignToXML(metronome) + justifyToXML(metronome);
  if (defined(metronome.parentheses)) {
    attribs += yesNo` parentheses="${metronome.parentheses}"`;
  }
  if (defined(metronome.beatUnit)) {
    // <!ELEMENT beat-unit (#PCDATA)>
    children.push(xml`<beat-unit>${metronome.beatUnit}</beat-unit>`);
  }
  (metronome.beatUnitDots || []).forEach(() => {
    // <!ELEMENT beat-unit-dot EMPTY>
    children.push(xml`<beat-unit-dot />`);
  });
  if (defined(metronome.perMinute)) {
    // <!ELEMENT per-minute (#PCDATA)>
    // <!ATTLIST per-minute
    //     %font;
    // >
    let pcdata = xml`${metronome.perMinute.data}`;
    children.push(
      dangerous`<per-minute${fontToXML(
        metronome.perMinute
      )}>${pcdata}</per-minute>`
    );
  } else {
    if (defined(metronome.beatUnitChange)) {
      // <!ELEMENT beat-unit (#PCDATA)>
      children.push(xml`<beat-unit>${metronome.beatUnitChange}</beat-unit>`);
    }
    (metronome.beatUnitDotsChange || []).forEach(() => {
      // <!ELEMENT beat-unit-dot EMPTY>
      children.push(xml`<beat-unit-dot />`);
    });
  }

  // TODO musicxml-interfaces second beat-unit!!

  (metronome.metronomeNotes || []).forEach((note) => {
    // <!ELEMENT metronome-note
    //     (metronome-type, metronome-dot*,
    //      metronome-beam*, metronome-tuplet?)>
    let oChildren: string[] = [];

    if (defined(note.metronomeType)) {
      // <!ELEMENT metronome-type (#PCDATA)>
      oChildren.push(
        xml`<metronome-type>${note.metronomeType}</metronome-type>`
      );
    }
    (note.metronomeDots || []).forEach(() => {
      // <!ELEMENT metronome-dot EMPTY>
      oChildren.push(xml`<metronome-dot />`);
    });
    (note.metronomeBeams || []).forEach((beam) => {
      // <!ELEMENT metronome-beam (#PCDATA)>
      // <!ATTLIST metronome-beam
      //     number %beam-level; "1"
      // >
      let pcdata = xml`${beam.data}`;
      oChildren.push(
        dangerous`<metronome-beam${numberLevelToXML(
          beam
        )}>${pcdata}</metronome-beam>`
      );
    });

    if (defined(note.metronomeTuplet)) {
      oChildren.push(metronomeTupletToXML(note.metronomeTuplet));
    }

    children.push(
      dangerous`<metronome-note>\n${oChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</metronome-note>`
    );
  });
  if (defined(metronome.metronomeRelation)) {
    // <!ELEMENT metronome-relation (#PCDATA)>
    children.push(
      xml`<metronome-relation>${metronome.metronomeRelation}</metronome-relation>`
    );
  }

  return dangerous`<metronome${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</metronome>`;
}

function metronomeTupletToXML(metronomeTuplet: MetronomeTuplet): string {
  // <!ELEMENT metronome-tuplet
  //     (actual-notes, normal-notes,
  //      (normal-type, normal-dot*)?)>
  // <!ATTLIST metronome-tuplet
  //     type %start-stop; #REQUIRED
  //     bracket %yes-no; #IMPLIED
  //     show-number (actual | both | none) #IMPLIED
  // >
  let children: string[] = [];
  let attribs = "" + startStopToXML(metronomeTuplet);
  if (defined(metronomeTuplet.bracket)) {
    attribs += yesNo` bracket="${metronomeTuplet.bracket}"`;
  }
  if (defined(metronomeTuplet.showNumber)) {
    attribs += xml` show-number="${
      actualBothNoneToXML[metronomeTuplet.showNumber]
    }"`;
  }
  if (metronomeTuplet.actualNotes) {
    children.push(
      xml`<actual-notes>${metronomeTuplet.actualNotes}</actual-notes>`
    );
  }
  if (metronomeTuplet.normalNotes) {
    children.push(
      xml`<normal-notes>${metronomeTuplet.normalNotes}</normal-notes>`
    );
  }
  if (metronomeTuplet.normalType) {
    children.push(
      xml`<normal-type>${metronomeTuplet.normalType}</normal-type>`
    );
  }
  (metronomeTuplet.normalDots || []).forEach(() => {
    children.push(xml`<normal-dot />`);
  });
  return dangerous`<metronome-tuplet${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</metronome-tuplet>`;
}

let octaveShiftTypeToXML: { [key: number]: string } = {
  [OctaveShiftType.Down]: "down",
  [OctaveShiftType.Stop]: "stop",
  [OctaveShiftType.Up]: "up",
  [OctaveShiftType.Continue]: "continue",
};

function octaveShiftToXML(octaveShift: OctaveShift): string {
  // <!ELEMENT octave-shift EMPTY>
  // <!ATTLIST octave-shift
  //     type (up | down | stop | continue) #REQUIRED
  //     number %number-level; #IMPLIED
  //     size CDATA "8"
  //     %dashed-formatting;
  //     %print-style;
  // >
  let attribs =
    "" +
    xml` type="${octaveShiftTypeToXML[octaveShift.type]}"` +
    numberLevelToXML(octaveShift);

  if (defined(octaveShift.size)) {
    attribs += xml` size="${octaveShift.size}"`;
  }
  attribs += dashedFormattingToXML(octaveShift) + printStyleToXML(octaveShift);

  return dangerous`<octave-shift${attribs} />`;
}

function harpPedalsToXML(harpPedals: HarpPedals): string {
  // <!ELEMENT harp-pedals (pedal-tuning)+>
  // <!ATTLIST harp-pedals
  //     %print-style-align;
  // >
  // <!ELEMENT pedal-tuning (pedal-step, pedal-alter)>
  // <!ELEMENT pedal-step (#PCDATA)>
  // <!ELEMENT pedal-alter (#PCDATA)>
  let children: string[] = [];
  (harpPedals.pedalTunings || []).forEach((tuning) => {
    let nChildren: string[] = [];
    if (tuning.pedalStep) {
      nChildren.push(xml`<pedal-step>${tuning.pedalStep}</pedal-step>`);
    }
    if (tuning.pedalAlter) {
      nChildren.push(xml`<pedal-alter>${tuning.pedalAlter}</pedal-alter>`);
    }
    children.push(
      dangerous`<pedal-tuning>\n${nChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</pedal-tuning>`
    );
  });

  let attribs = printStyleAlignToXML(harpPedals);

  return dangerous`<harp-pedals${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</harp-pedals>`;
}

function dampToXML(damp: Damp): string {
  // <!ELEMENT damp EMPTY>
  // <!ATTLIST damp
  //     %print-style-align;
  // >
  return dangerous`<damp${printStyleAlignToXML(damp)} />`;
}

function dampAllToXML(dampAll: DampAll): string {
  // <!ELEMENT damp-all EMPTY>
  // <!ATTLIST damp-all
  //     %print-style-align;
  // >
  return dangerous`<damp-all${printStyleAlignToXML(dampAll)} />`;
}

function eyeglassesToXML(eyeglasses: Eyeglasses): string {
  // <!ELEMENT eyeglasses EMPTY>
  // <!ATTLIST eyeglasses
  //     %print-style-align;
  // >
  return dangerous`<eyeglasses${printStyleAlignToXML(eyeglasses)} />`;
}

function stringMuteToXML(stringMute: StringMute): string {
  // <!ELEMENT string-mute EMPTY>
  // <!ATTLIST string-mute
  //     type (on | off) #REQUIRED
  //     %print-style-align;
  // >
  let attribs =
    xml` type="${stringMute.type}"` + printStyleAlignToXML(stringMute);
  return dangerous`<string-mute${attribs} />`;
}

function scordaturaToXML(scordatura: Scordatura): string {
  // <!ELEMENT scordatura (accord+)>
  // <!ELEMENT accord
  //     (tuning-step, tuning-alter?, tuning-octave)>
  // <!ATTLIST accord
  //     string CDATA #REQUIRED
  // >
  let children: string[] = [];
  (scordatura.accords || []).forEach((accord) => {
    let oChildren = tuningStepAlterOctaveToXML(accord);
    let oAttribs = xml` string="${accord.string}"`;
    children.push(
      dangerous`<accord${oAttribs}>\n${oChildren
        .join("\n")
        .split("\n")
        .map((n) => "  " + n)
        .join("\n")}\n</accord>`
    );
  });
  return dangerous`<scordatura>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</scordatura>`;
}

function imageToXML(image: Image): string {
  // <!ELEMENT image EMPTY>
  // <!ATTLIST image
  //     source CDATA #REQUIRED
  //     type CDATA #REQUIRED
  //     %position;
  //     %halign;
  //     %valign-image;
  // >
  let attribs =
    "" +
    xml` source="${image.source}"` +
    xml` type="${image.type}"` +
    positionToXML(image) +
    halignToXML(image) +
    valignImageToXML(image);

  return dangerous`<image${attribs} />`;
}

let voiceSymbolToXML: { [key: number]: string } = {
  [VoiceSymbol.None]: "none",
  [VoiceSymbol.Hauptstimme]: "hauptstimme",
  [VoiceSymbol.Nebenstimme]: "nebenstimme",
  [VoiceSymbol.Plain]: "plain",
};

function principalVoiceToXML(principalVoice: PrincipalVoice): string {
  // <!ELEMENT principal-voice (#PCDATA)>
  // <!ATTLIST principal-voice
  //     type %start-stop; #REQUIRED
  //     symbol (Hauptstimme | Nebenstimme | plain | none) #REQUIRED
  //     %print-style-align;
  // >
  let pcdata = xml`${principalVoice.data}`;
  let attribs =
    startStopToXML(principalVoice) +
    xml` symbol="${voiceSymbolToXML[principalVoice.symbol]}"` +
    printStyleAlignToXML(principalVoice);

  return dangerous`<principal-voice${attribs}${pcdata}</principal-voice>`;
}

function accordionRegistrationToXML(
  accordionRegistration: AccordionRegistration
): string {
  // <!ELEMENT accordion-registration
  //     (accordion-high?, accordion-middle?, accordion-low?)>
  // <!ATTLIST accordion-registration
  //     %print-style-align;
  // >
  // <!ELEMENT accordion-high EMPTY>
  // <!ELEMENT accordion-middle (#PCDATA)>
  // <!ELEMENT accordion-low EMPTY>
  let children: string[] = [];
  let attribs = printStyleAlignToXML(accordionRegistration);
  if (defined(accordionRegistration.accordionHigh)) {
    children.push(xml`<accordion-high />`);
  }
  if (defined(accordionRegistration.accordionMiddle)) {
    children.push(
      xml`<accordion-middle>${
        accordionRegistration.accordionMiddle || ""
      }</accordion-middle>`
    );
  }
  if (defined(accordionRegistration.accordionLow)) {
    children.push(xml`<accordion-low />`);
  }
  return dangerous`<accordion-registration${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</accordion-registration>`;
}

let tipDirectionToXML: { [key: number]: string } = {
  [TipDirection.Right]: "right",
  [TipDirection.Northwest]: "northwest",
  [TipDirection.Southwest]: "southwest",
  [TipDirection.Down]: "down",
  [TipDirection.Northeast]: "northeast",
  [TipDirection.Southeast]: "southeast",
  [TipDirection.Up]: "up",
  [TipDirection.Left]: "left",
};

function percussionToXML(percussion: Percussion): string {
  // <!ELEMENT percussion
  //     (glass | metal | wood | pitched | membrane | effect |
  //      timpani | beater | stick | stick-location |
  //      other-percussion)>
  // <!ATTLIST percussion
  //     %print-style-align;
  //     %enclosure;
  // >
  let children: string[] = [];
  if (defined(percussion.glass)) {
    // <!ELEMENT glass (#PCDATA)>
    children.push(xml`<glass>${percussion.glass}</glass>`);
  }
  if (defined(percussion.metal)) {
    // <!ELEMENT metal (#PCDATA)>
    children.push(xml`<metal>${percussion.metal}</metal>`);
  }
  if (defined(percussion.wood)) {
    // <!ELEMENT wood (#PCDATA)>
    children.push(xml`<wood>${percussion.wood}</wood>`);
  }
  if (defined(percussion.pitched)) {
    // <!ELEMENT pitched (#PCDATA)>
    children.push(xml`<pitched>${percussion.pitched}</pitched>`);
  }
  if (defined(percussion.membrane)) {
    // <!ELEMENT membrane (#PCDATA)>
    children.push(xml`<membrane>${percussion.membrane}</membrane>`);
  }
  if (defined(percussion.effect)) {
    // <!ELEMENT effect (#PCDATA)>
    children.push(xml`<effect>${percussion.effect}</effect>`);
  }
  if (defined(percussion.timpani)) {
    // <!ELEMENT timpani EMPTY>
    children.push(xml`<timpani />`);
  }
  if (defined(percussion.beater)) {
    // <!ELEMENT beater (#PCDATA)>
    // <!ATTLIST beater
    //     tip %tip-direction; #IMPLIED
    // >
    let pcdata = xml`${percussion.beater.data || ""}`;
    let oAttribs = "";
    if (defined(percussion.beater.tip)) {
      oAttribs += xml` tip="${tipDirectionToXML[percussion.beater.tip]}"`;
    }
    children.push(dangerous`<beater${oAttribs}>${pcdata}</beater>`);
  }
  if (defined(percussion.stick)) {
    // <!ELEMENT stick (stick-type, stick-material)>
    // <!ATTLIST stick
    //     tip %tip-direction; #IMPLIED
    //     >

    // <!ELEMENT stick-type (#PCDATA)>
    // <!ELEMENT stick-material (#PCDATA)>
    let pcdata = "";
    let oAttribs = "";
    if (defined(percussion.stick.tip)) {
      oAttribs += xml` tip="${tipDirectionToXML[percussion.stick.tip]}"`;
    }
    if (defined(percussion.stick.stickType)) {
      pcdata += xml`  <stick-type>${percussion.stick.stickType}</stick-type>\n`;
    }
    if (defined(percussion.stick.stickMaterial)) {
      pcdata += xml`  <stick-material>${percussion.stick.stickMaterial}</stick-material>\n`;
    }
    children.push(dangerous`<stick${oAttribs}>${pcdata}</stick>`);
  }
  if (defined(percussion.stickLocation)) {
    // <!ELEMENT stick-location (#PCDATA)>
    children.push(
      xml`<stick-location>${percussion.stickLocation}</stick-location>`
    );
  }
  if (defined(percussion.otherPercussion)) {
    // <!ELEMENT other-percussion (#PCDATA)>
    children.push(
      xml`<other-percussion>${percussion.otherPercussion}</other-percussion>`
    );
  }

  return dangerous`<percussion>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</percussion>`;
}

function otherDirectionToXML(otherDirection: OtherDirection): string {
  // <!ELEMENT other-direction (#PCDATA)>
  // <!ATTLIST other-direction
  //     %print-object;
  //     %print-style-align;
  // >
  let pcdata = xml`${otherDirection.data}`;
  return dangerous`<other-direction${
    printObjectToXML(otherDirection) + printStyleAlignToXML(otherDirection)
  }>${pcdata}</other-direction>`;
}

function wavyLineToXML(wavyLine: WavyLine): string {
  // <!ELEMENT wavy-line EMPTY>
  // <!ATTLIST wavy-line
  //     type %start-stop-continue; #REQUIRED
  //     number %number-level; #IMPLIED
  //     %position;
  //     %placement;
  //     %color;
  //     %trill-sound;
  // >
  let attribs =
    "" +
    startStopContinueToXML(wavyLine) +
    numberLevelToXML(wavyLine) +
    positionToXML(wavyLine) +
    placementToXML(wavyLine) +
    colorToXML(wavyLine) +
    trillSoundToXML(wavyLine);

  return dangerous`<wavy-line${attribs} />`;
}

let barStyleTypeToXML: { [key: number]: string } = {
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
  4: "light-light",
};

function barStyleToXML(barStyle: BarStyle): string {
  // <!ELEMENT bar-style (#PCDATA)>
  // <!ATTLIST bar-style
  //     %color;
  // >
  let attribs = "" + colorToXML(barStyle);
  let pcdata = xml`${barStyleTypeToXML[barStyle.data] || ""}`;
  return dangerous`<bar-style${attribs}>${pcdata}</bar-style>`;
}

let startStopDiscontinueTypeToXML: { [key: number]: string } = {
  [StartStopDiscontinue.Start]: "start",
  [StartStopDiscontinue.Stop]: "stop",
  [StartStopDiscontinue.Discontinue]: "discontinue",
};

function endingToXML(ending: Ending): string {
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
  let attribs =
    "" +
    numberLevelToXML(ending) +
    startStopDiscontinueToXML(ending) +
    printObjectToXML(ending) +
    printStyleToXML(ending);

  if (defined(ending.endLength)) {
    attribs += xml` end-length="${ending.endLength}"`;
  }
  if (defined(ending.textX)) {
    attribs += xml` text-x="${ending.textX}"`;
  }
  if (defined(ending.textY)) {
    attribs += xml` text-y="${ending.textY}"`;
  }

  let pcdata = xml`${ending.ending}`;
  return dangerous`<ending${attribs}>${pcdata}</ending>`;
}

let directionTypeBgToXML: { [key: number]: string } = {
  [DirectionTypeBg.Forward]: "forward",
  [DirectionTypeBg.Backward]: "backward",
};

let wingedTypeToXML: { [key: number]: string } = {
  [WingedType.None]: "none",
  [WingedType.Curved]: "curved",
  [WingedType.DoubleCurved]: "double-curved",
  [WingedType.Straight]: "straight",
  [WingedType.DoubleStraight]: "double-straight",
};

function repeatToXML(repeat: Repeat): string {
  // <!ELEMENT repeat EMPTY>
  // <!ATTLIST repeat
  //     direction (backward | forward) #REQUIRED
  //     times CDATA #IMPLIED
  //     winged (none | straight | curved |
  //         double-straight | double-curved) #IMPLIED
  // >
  let attribs =
    "" + xml` direction="${directionTypeBgToXML[repeat.direction]}"`;

  if (defined(repeat.times)) {
    attribs += xml` times="${repeat.times}"`;
  }
  if (defined(repeat.winged)) {
    attribs += xml` winged="${wingedTypeToXML[repeat.winged]}"`;
  }
  return dangerous`<repeat${attribs} />`;
}

function segnoToXML(segno: Segno): string {
  // <!ELEMENT segno EMPTY>
  // <!ATTLIST segno
  //     %print-style-align;
  // >
  let attribs = "" + printStyleAlignToXML(segno);

  return dangerous`<segno${attribs} />`;
}

function codaToXML(coda: Coda): string {
  // <!ELEMENT coda EMPTY>
  // <!ATTLIST coda
  //     %print-style-align;
  // >
  let attribs = "" + printStyleAlignToXML(coda);

  return dangerous`<coda${attribs} />`;
}

let uprightInvertedToXML: { [key: number]: string } = {
  0: "upright",
  1: "inverted",
};

let normalAngledSquareToXML: { [key: number]: string } = {
  1: "angled",
  2: "square",
  0: "normal",
};

function fermataToXML(fermata: Fermata): string {
  // <!ELEMENT fermata  (#PCDATA)>
  // <!ATTLIST fermata
  //     type (upright | inverted) #IMPLIED
  //     %print-style;
  // >
  let pcdata = defined(fermata.shape)
    ? normalAngledSquareToXML[fermata.shape]
    : "";
  let attribs = defined(fermata.type)
    ? xml` type="${uprightInvertedToXML[fermata.type]}"`
    : "";
  attribs += printStyleToXML(fermata);
  return dangerous`<fermata${attribs}>${pcdata}</fermata>`;
}

function playToXML(play: Play): string {
  // <!ELEMENT play ((ipa | mute | semi-pitched | other-play)*)>
  // <!ATTLIST play
  //     id IDREF #IMPLIED
  // >
  // TODO musicxml-interfaces: missing id
  let children: string[] = [];
  if (defined(play.ipa)) {
    children.push(xml`<ipa>${play.ipa}</ipa>`);
  }
  if (defined(play.mute)) {
    children.push(xml`<mute>${play.mute}</mute>`);
  }
  if (defined(play.semiPitched)) {
    children.push(xml`<semi-pitched>${play.semiPitched}</semi-pitched>`);
  }
  if (defined(play.otherPlay)) {
    let pcdata = xml`${play.otherPlay.data}`;
    let oAttribs = "";
    if (defined(play.otherPlay.type)) {
      oAttribs += xml` type="${play.otherPlay.type}"`;
    }
    children.push(dangerous`<other-play${oAttribs}>${pcdata}</other-play>`);
  }
  return dangerous`<play>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</play>`;
}

function staffLayoutToXML(staffLayout: StaffLayout): string {
  // <!ELEMENT staff-layout (staff-distance?)>
  // <!ELEMENT staff-distance %layout-tenths;>
  // <!ATTLIST staff-layout
  //     number CDATA #IMPLIED
  // >
  let children: string[] = [];
  if (defined(staffLayout.staffDistance)) {
    children.push(
      xml`<staff-distance>${staffLayout.staffDistance}</staff-distance>`
    );
  }
  let attribs = numberLevelToXML(staffLayout);
  return dangerous`<staff-layout${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</staff-layout>`;
}

function measureLayoutToXML(measureLayout: MeasureLayout): string {
  // <!ELEMENT measure-layout (measure-distance?)>
  // <!ELEMENT measure-distance %layout-tenths;>
  let children: string[] = [];
  if (defined(measureLayout.measureDistance)) {
    children.push(
      xml`<measure-distance>${measureLayout.measureDistance}</measure-distance>`
    );
  }
  return dangerous`<measure-layout>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</measure-layout>`;
}

function measureNumberingToXML(measureNumbering: MeasureNumbering): string {
  // <!ELEMENT measure-numbering (#PCDATA)>
  // <!ATTLIST measure-numbering
  //     %print-style-align;
  // >
  let attribs = printStyleAlignToXML(measureNumbering);
  let pcdata = xml`${measureNumbering.data}`;
  return dangerous`<measure-numbering${attribs}>${pcdata}</measure-numbering>`;
}

function keyToXML(key: Key): string {
  // <!ELEMENT key (((cancel?, fifths, mode?) |
  //     ((key-step, key-alter, key-accidental?)*)), key-octave*)>
  // <!ATTLIST key
  //     number CDATA #IMPLIED
  //     %print-style;
  //     %print-object;
  // >
  let children: string[] = [];
  let attribs =
    "" + numberLevelToXML(key) + printStyleToXML(key) + printObjectToXML(key);

  if (defined(key.cancel)) {
    children.push(cancelToXML(key.cancel));
  }

  if (defined(key.fifths)) {
    // <!ELEMENT fifths (#PCDATA)>
    children.push(xml`<fifths>${key.fifths}</fifths>`);
  }

  if (defined(key.mode)) {
    // <!ELEMENT mode (#PCDATA)>
    children.push(xml`<mode>${key.mode}</mode>`);
  }

  (key.keySteps || []).forEach((keyStep, idx) => {
    // <!ELEMENT key-step (#PCDATA)>
    // <!ELEMENT key-alter (#PCDATA)>
    // <!ELEMENT key-accidental (#PCDATA)>
    children.push(xml`<key-step>${keyStep}</key-step>`);
    children.push(xml`<key-alter>${key.keyAlters[idx]}</key-alter>`);
    if (key.keyAccidentals && key.keyAccidentals[idx]) {
      children.push(
        xml`<key-accidental>${key.keyAccidentals[idx]}</key-accidental>`
      );
    }
  });

  (key.keyOctaves || []).forEach((keyOctave) => {
    children.push(keyOctaveToXML(keyOctave));
  });

  return dangerous`<key${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</key>`;
}

let cancelLocationToXML: { [key: number]: string } = {
  1: "right",
  2: "before-barline",
  0: "left",
};

function cancelToXML(cancel: Cancel): string {
  // <!ELEMENT cancel (#PCDATA)>
  // <!ATTLIST cancel
  //     location (left | right | before-barline) #IMPLIED
  // >
  let attribs = "";
  let pcdata = xml`${cancel.fifths}`;
  if (defined(cancel.location)) {
    attribs += xml` location="${cancelLocationToXML[cancel.location]}"`;
  }
  return dangerous`<cancel${attribs}>${pcdata}</cancel>`;
}

function keyOctaveToXML(keyOctave: KeyOctave): string {
  // <!ELEMENT key-octave (#PCDATA)>
  // <!ATTLIST key-octave
  //     number NMTOKEN #REQUIRED
  //     cancel %yes-no; #IMPLIED
  // >
  let attribs = numberLevelToXML(keyOctave);
  let pcdata = xml`${keyOctave.octave}`;
  if (defined(keyOctave.cancel)) {
    attribs += yesNo` cancel="${keyOctave.cancel}"`;
  }
  return dangerous`<key-octave${attribs}>${pcdata}</key-octave>`;
}

function timeToXML(time: Time): string {
  // <!ELEMENT time
  //     (((beats, beat-type)+, interchangeable?) | senza-misura)>
  // <!ATTLIST time
  //     number CDATA #IMPLIED
  //     %time-symbol;
  //     %time-separator;
  //     %print-style-align;
  //     %print-object;
  // >
  let attribs =
    "" +
    numberLevelToXML(time) +
    timeSymbolToXML(time) +
    timeSeparatorToXML(time) +
    printStyleAlignToXML(time) +
    printObjectToXML(time);

  let children: string[] = [];

  if (time.senzaMisura != null) {
    // <!ELEMENT senza-misura (#PCDATA)>
    // TODO musicxml-interfaces: PCDATA?
    children.push(xml`<senza-misura />`);
  } else {
    // TODO musicxml-interfaces: check this
    (time.beats || []).forEach((beats, idx) => {
      // <!ELEMENT beats (#PCDATA)>
      // <!ELEMENT beat-type (#PCDATA)>
      children.push(xml`<beats>${beats}</beats>`);
      children.push(xml`<beat-type>${time.beatTypes[idx]}</beat-type>`);
    });

    if (defined(time.interchangeable)) {
      children.push(interchangeableToXML(time.interchangeable));
    }
  }

  return dangerous`<time${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</time>`;
}

let timeSymbolTypeToXML: { [key: number]: string } = {
  4: "dotted-note",
  1: "cut",
  2: "single-number",
  3: "note",
  0: "common",
  5: "normal",
};

function timeSymbolToXML(timeSymbol: TimeSymbol): string {
  // <!ENTITY % time-symbol
  //     "symbol (common | cut | single-number |
  //              note | dotted-note | normal) #IMPLIED">
  if (defined(timeSymbol.symbol)) {
    return xml` symbol="${timeSymbolTypeToXML[timeSymbol.symbol]}"`;
  }
  return "";
}

let separatorTypeToXML: { [key: number]: string } = {
  0: "none",
  1: "horizontal",
  2: "diagonal",
  3: "vertical",
  4: "adjacent",
};

function timeSeparatorToXML(timeSeparator: TimeSeparator): string {
  // <!ENTITY % time-separator
  //     "separator (none | horizontal | diagonal |
  //         vertical | adjacent) #IMPLIED">
  if (defined(timeSeparator.separator)) {
    return xml` separator="${separatorTypeToXML[timeSeparator.separator]}"`;
  }
  return "";
}

function interchangeableToXML(interchangeable: Interchangeable): string {
  // <!ELEMENT interchangeable (time-relation?, (beats, beat-type)+)>
  // <!ATTLIST interchangeable
  //     %time-symbol;
  //     %time-separator;
  // >
  let attribs =
    "" + timeSymbolToXML(interchangeable) + timeSeparatorToXML(interchangeable);

  let children: string[] = [];
  (interchangeable.beats || []).forEach((beats, idx) => {
    // <!ELEMENT beats (#PCDATA)>
    // <!ELEMENT beat-type (#PCDATA)>
    children.push(xml`<beats>${beats}</beats>`);
    children.push(
      xml`<beat-type>${interchangeable.beatTypes[idx]}</beat-type>`
    );
  });
  if (defined(interchangeable.timeRelation)) {
    // <!ELEMENT time-relation (#PCDATA)>
    children.push(
      xml`<time-relation>${interchangeable.timeRelation}</time-relation>`
    );
  }
  return dangerous`<interchangeable${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</interchangeable>`;
}

let partSymbolTypeToXML: { [key: number]: string } = {
  0: "none",
  2: "line",
  3: "bracket",
  4: "square",
  1: "brace",
};

function partSymbolToXML(partSymbol: PartSymbol): string {
  // <!ELEMENT part-symbol (#PCDATA)>
  // <!ATTLIST part-symbol
  //     top-staff CDATA #IMPLIED
  //     bottom-staff CDATA #IMPLIED
  //     %position;
  //     %color;
  // >
  let pcdata = "";
  if (defined(partSymbol.type)) {
    pcdata = xml`${partSymbolTypeToXML[partSymbol.type]}`;
  }
  let attribs = "";
  if (defined(partSymbol.topStaff)) {
    attribs += xml` top-staff="${partSymbol.topStaff}"`;
  }
  if (defined(partSymbol.bottomStaff)) {
    attribs += xml` bottom-staff="${partSymbol.bottomStaff}"`;
  }
  attribs += positionToXML(partSymbol) + colorToXML(partSymbol);

  return dangerous`<part-symbol${attribs}>${pcdata}</part-symbol>`;
}

let symbolSizeToXML: { [key: number]: string } = {
  1: "full",
  2: "cue",
  3: "large",
};

function clefToXML(clef: Clef): string {
  // <!ELEMENT clef (sign, line?, clef-octave-change?)>
  // <!ATTLIST clef
  //     number CDATA #IMPLIED
  //     additional %yes-no; #IMPLIED
  //     size %symbol-size; #IMPLIED
  //     after-barline %yes-no; #IMPLIED
  //     %print-style;
  //     %print-object;
  // >
  let attribs = "" + numberLevelToXML(clef);

  let children: string[] = [];

  if (defined(clef.additional)) {
    attribs += yesNo` additional="${clef.additional}"`;
  }

  if (clef.size >= SymbolSize.Unspecified) {
    attribs += xml` size="${symbolSizeToXML[clef.size]}"`;
  }

  if (defined(clef.afterBarline)) {
    attribs += yesNo` after-barline="${clef.afterBarline}"`;
  }

  attribs += printStyleToXML(clef) + printObjectToXML(clef);

  if (defined(clef.sign)) {
    // <!ELEMENT sign (#PCDATA)>
    children.push(xml`<sign>${clef.sign}</sign>`);
  }

  if (defined(clef.line)) {
    // <!ELEMENT line (#PCDATA)>
    children.push(xml`<line>${clef.line}</line>`);
  }

  if (defined(clef.clefOctaveChange)) {
    // <!ELEMENT clef-octave-change (#PCDATA)>
    children.push(
      xml`<clef-octave-change>${clef.clefOctaveChange}</clef-octave-change>`
    );
  }

  return dangerous`<clef${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</clef>`;
}

function staffDetailsToXML(staffDetails: StaffDetails): string {
  // <!ELEMENT staff-details (staff-type?, staff-lines?,
  //     staff-tuning*, capo?, staff-size?)>
  // <!ATTLIST staff-details
  //     number         CDATA                #IMPLIED
  //     show-frets     (numbers | letters)  #IMPLIED
  //     %print-object;
  //     %print-spacing;
  // >
  let attribs = "";
  let children: string[] = [];

  attribs += numberLevelToXML(staffDetails);
  // TODO: musicxml-interfaces show__FRETS__

  attribs += printObjectToXML(staffDetails);
  attribs += printSpacingToXML(staffDetails);

  if (defined(staffDetails.staffType)) {
    // <!ELEMENT staff-type (#PCDATA)>
    children.push(xml`<staff-type>${staffDetails.staffType}</staff-type>`);
  }
  if (defined(staffDetails.staffLines)) {
    // <!ELEMENT staff-lines (#PCDATA)>
    children.push(xml`<staff-lines>${staffDetails.staffLines}</staff-lines>`);
  }
  (staffDetails.staffTunings || []).forEach((tuning) => {
    children.push(staffTuningToXML(tuning));
  });
  if (defined(staffDetails.capo)) {
    // <!ELEMENT capo (#PCDATA)>
    children.push(xml`<capo>${staffDetails.capo}</capo>`);
  }
  if (defined(staffDetails.staffSize)) {
    // <!ELEMENT staff-size (#PCDATA)>
    children.push(xml`<staff-size>${staffDetails.staffSize}</staff-size>`);
  }

  return dangerous`<staff-details${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</staff-details>`;
}

function staffTuningToXML(staffTuning: StaffTuning): string {
  // <!ELEMENT staff-tuning
  //     (tuning-step, tuning-alter?, tuning-octave)>
  // <!ATTLIST staff-tuning
  //     line CDATA #REQUIRED
  let children: string[] = [];
  let attribs = "";
  if (defined(staffTuning.line)) {
    attribs += xml` line="${staffTuning.line}"`;
  }
  children = children.concat(tuningStepAlterOctaveToXML(staffTuning));
  return dangerous`<staff-tuning${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</staff-tuning>`;
}

function tuningStepAlterOctaveToXML(tuning: {
  tuningAlter?: string;
  tuningStep?: string;
  tuningOctave: string;
}): string[] {
  let children: string[] = [];
  if (defined(tuning.tuningStep)) {
    // <!ELEMENT tuning-step (#PCDATA)>
    children.push(xml`<tuning-step>${tuning.tuningStep}</tuning-step>`);
  }
  if (defined(tuning.tuningAlter)) {
    // <!ELEMENT tuning-alter (#PCDATA)>
    children.push(xml`<tuning-alter>${tuning.tuningAlter}</tuning-alter>`);
  }
  if (defined(tuning.tuningOctave)) {
    // <!ELEMENT tuning-octave (#PCDATA)>
    children.push(xml`<tuning-octave>${tuning.tuningOctave}</tuning-octave>`);
  }
  return children;
}

function transposeToXML(transpose: Transpose): string {
  // <!ELEMENT transpose
  //     (diatonic?, chromatic, octave-change?, double?)>
  // <!ATTLIST transpose
  //     number CDATA #IMPLIED
  // >
  let children: string[] = [];
  let attribs = numberLevelToXML(transpose);
  if (defined(transpose.diatonic)) {
    // <!ELEMENT diatonic (#PCDATA)>
    children.push(xml`<diatonic>${transpose.diatonic}</diatonic>`);
  }
  if (defined(transpose.chromatic)) {
    // <!ELEMENT chromatic (#PCDATA)>
    children.push(xml`<chromatic>${transpose.chromatic}</chromatic>`);
  }
  if (defined(transpose.octaveChange)) {
    // <!ELEMENT octave-change (#PCDATA)>
    children.push(
      xml`<octave-change>${transpose.octaveChange}</octave-change>`
    );
  }
  if (defined(transpose.double)) {
    // <!ELEMENT double EMPTY>
    children.push(xml`<double />`);
  }
  return dangerous`<transpose${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</transpose>`;
}

function directiveToXML(directive: Directive): string {
  // <!ELEMENT directive (#PCDATA)>
  // <!ATTLIST directive
  //     %print-style;
  //     xml:lang NMTOKEN #IMPLIED
  // >
  let pcdata = xml`${directive.data}`;
  let attribs = printStyleToXML(directive); // TODO musicxml-interfaces xml:lang
  return dangerous`<directive${attribs}>${pcdata}</directive>`;
}

function measureStyleToXML(measureStyle: MeasureStyle): string {
  // <!ELEMENT measure-style (multiple-rest |
  //     measure-repeat | beat-repeat | slash)>
  // <!ATTLIST measure-style
  //     number CDATA #IMPLIED
  //     %font;
  //     %color;
  // >
  let children: string[] = [];
  let attribs =
    "" +
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
  return dangerous`<measure-style${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</measure-style>`;
}

function multipleRestToXML(multipleRest: MultipleRest): string {
  // <!ELEMENT multiple-rest (#PCDATA)>
  // <!ATTLIST multiple-rest
  //     use-symbols %yes-no; #IMPLIED
  // >
  let attribs = "";
  let pcdata = xml`${multipleRest.count}`;
  if (defined(multipleRest.useSymbols)) {
    attribs += yesNo` use-symbols="${multipleRest.useSymbols}"`;
  }
  return dangerous`<multiple-rest${attribs}>${pcdata}</multiple-rest>`;
}

function measureRepeatToXML(measureRepeat: MeasureRepeat): string {
  // <!ELEMENT measure-repeat (#PCDATA)>
  // <!ATTLIST measure-repeat
  //     type %start-stop; #REQUIRED
  //     slashes NMTOKEN #IMPLIED
  // >
  let attribs = "";
  let pcdata = xml`${measureRepeat.data || ""}`;
  attribs += startStopToXML(measureRepeat);
  // TODO: musicxml-interfaces: slashed -> slashes
  return dangerous`<measure-repeat${attribs}>${pcdata}</measure-repeat>`;
}

function beatRepeatToXML(beatRepeat: BeatRepeat): string {
  // <!ELEMENT beat-repeat ((slash-type, slash-dot*)?)>
  // <!ATTLIST beat-repeat
  //     type %start-stop; #REQUIRED
  //     slashes NMTOKEN #IMPLIED
  //     use-dots %yes-no; #IMPLIED
  // >
  // <!ELEMENT slash-type (#PCDATA)>
  let children: string[] = [];
  let attribs = "" + startStopToXML(beatRepeat);

  // TODO: musicxml-interfaces: slases -> slashes
  if (defined(beatRepeat.useDots)) {
    attribs += yesNo` use-dots="${beatRepeat.useDots}"`;
  }
  if (defined(beatRepeat.slashType)) {
    children.push(xml`<slash-type>${beatRepeat.slashType}</slash-type>`);
  }
  (beatRepeat.slashDots || []).forEach((dot) => {
    // <!ELEMENT slash-dot EMPTY>
    children.push(xml`<slash-dot />`);
  });
  return dangerous`<beat-repeat${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</beat-repeat>`;
}

function slashElToXML(slash: Slash): string {
  // <!ELEMENT slash ((slash-type, slash-dot*)?)>
  // <!ATTLIST slash
  //     type %start-stop; #REQUIRED
  //     use-dots %yes-no; #IMPLIED
  //     use-stems %yes-no; #IMPLIED
  // >
  let attribs = startStopToXML(slash);
  if (defined(slash.useDots)) {
    attribs += yesNo` use-dots="${slash.useDots}"`;
  }
  if (defined(slash.useStems)) {
    attribs += yesNo` use-stems="${slash.useStems}"`;
  }
  let children: string[] = [];
  if (defined(slash.slashType)) {
    children.push(xml`<slash-type>${slash.slashType}</slash-type>`);
  }
  (slash.slashDots || []).forEach((dot) => {
    // <!ELEMENT slash-dot EMPTY>
    children.push(xml`<slash-dot />`);
  });
  return dangerous`<slash${attribs}>\n${children
    .join("\n")
    .split("\n")
    .map((n) => "  " + n)
    .join("\n")}\n</slash>`;
}

function printStyleToXML(printStyle: PrintStyle): string {
  // <!ENTITY % print-style
  //     "%position;
  //      %font;
  //      %color;">
  return (
    positionToXML(printStyle) + fontToXML(printStyle) + colorToXML(printStyle)
  );
}

function printoutToXML(printout: Printout): string {
  // <!ENTITY % printout
  //     "%print-object;
  //      print-dot     %yes-no;  #IMPLIED
  //      %print-spacing;
  //      print-lyric   %yes-no;  #IMPLIED">
  let attribs = printObjectToXML(printout);
  if (defined(printout.printDot)) {
    attribs += yesNo` print-dot="${printout.printDot}"`;
  }
  attribs += printSpacingToXML(printout);
  if (defined(printout.printLyric)) {
    attribs += yesNo` print-lyric="${printout.printLyric}"`;
  }
  return attribs;
}

function timeOnlyToXML(timeOnly: TimeOnly): string {
  // <!ENTITY % time-only
  //     "time-only CDATA #IMPLIED">
  if (defined(timeOnly.timeOnly)) {
    return xml` time-only="${timeOnly.timeOnly}"`;
  }
  return "";
}

function editorialToXML(editorial: Editorial): string[] {
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
  let elements: string[] = [];
  if (defined(editorial.footnote) && !!editorial.footnote.text) {
    let footnoteEscaped = xml`${editorial.footnote.text}`;
    elements.push(dangerous`<footnote${textFormattingToXML(editorial.footnote)}>
            ${footnoteEscaped}</footnote>`);
  }
  if (defined(editorial.level) && !!editorial.level.text) {
    let levelEscaped = xml`${editorial.level.text}`;
    let attribs = "";
    if (defined(editorial.level.reference)) {
      attribs += yesNo` reference="${editorial.level.reference}"`;
    }
    attribs += levelDisplayToXML(editorial.level);
    elements.push(dangerous`<level${attribs}>${levelEscaped}</level>`);
  }
  return elements;
}

function editorialVoiceToXML(editorial: EditorialVoice): string[] {
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
  let elements = editorialToXML(editorial);

  // <!ELEMENT voice (#PCDATA)>
  if (defined(editorial.voice)) {
    elements.push(xml`<voice>${editorial.voice}</voice>`);
  }
  return elements;
}

let solidDashedDottedWavyToXML: { [key: number]: string } = {
  1: "dashed",
  2: "dotted",
  3: "wavy",
  0: "solid",
};

function lineTypeToXML(lineType: LineType): string {
  // <!ENTITY % line-type
  //     "line-type (solid | dashed | dotted | wavy) #IMPLIED">
  if (defined(lineType.lineType)) {
    return xml` line-type="${solidDashedDottedWavyToXML[lineType.lineType]}"`;
  }
  return "";
}

function startStopToXML(startStop: { type: StartStop }): string {
  // <!ENTITY % start-stop "(start | stop)">

  if (defined(startStop.type)) {
    return xml` type="${
      startStop.type === StartStop.Start ? "start" : "stop"
    }"`;
  }
  return "";
}

function startStopDiscontinueToXML(startStop: {
  type: StartStopDiscontinue;
}): string {
  // <!ENTITY % start-stop "(start | stop)">

  if (defined(startStop.type)) {
    return xml` type="${startStopDiscontinueTypeToXML[startStop.type]}"`;
  }
  return "";
}

function numberLevelToXML(numberLevel: { number?: number }): string {
  if (defined(numberLevel.number)) {
    return xml` number="${numberLevel.number}"`;
  }
  return "";
}

let startStopContinueSingleToXML: { [key: number]: string } = {
  0: "start",
  1: "stop",
  2: "continue",
  3: "single",
};

function startStopContinueToXML(startStopContinue: {
  type: StartStopContinue;
}): string {
  // <!ENTITY % start-stop-continue "(start | stop | continue)">

  if (defined(startStopContinue.type)) {
    return xml` type="${startStopContinueSingleToXML[startStopContinue.type]}"`;
  }

  return "";
}

function nameToXML(name: { name?: string }): string {
  if (defined(name.name)) {
    return xml` name="${name.name}"`;
  }
  return "";
}

function startStopSingleToXML(startStopSingle: {
  type: StartStopSingle;
}): string {
  // <!ENTITY % start-stop-single "(start | stop | single)">

  if (defined(startStopSingle.type)) {
    return xml` type="${startStopContinueSingleToXML[startStopSingle.type]}"`;
  }

  return "";
}

function dashedFormattingToXML(dashedFormatting: DashedFormatting): string {
  // <!ENTITY % dashed-formatting
  //     "dash-length   %tenths;  #IMPLIED
  //      space-length  %tenths;  #IMPLIED">
  let attribs = "";
  if (defined(dashedFormatting.dashLength)) {
    attribs += xml` dash-length="${dashedFormatting.dashLength}"`;
  }
  if (defined(dashedFormatting.spaceLength)) {
    attribs += xml` space-length="${dashedFormatting.spaceLength}"`;
  }
  return attribs;
}

let straightCurvedToXML: { [key: number]: string } = {
  1: "curved",
  0: "straight",
};

function lineShapeToXML(lineShape: LineShape): string {
  if (defined(lineShape.lineShape)) {
    return xml` line-shape="${straightCurvedToXML[lineShape.lineShape]}"`;
  }
  return "";
}

function positionToXML(pos: Position): string {
  // <!ENTITY % position
  //     "default-x     %tenths;    #IMPLIED
  //      default-y     %tenths;    #IMPLIED
  //      relative-x    %tenths;    #IMPLIED
  //      relative-y    %tenths;    #IMPLIED">
  let attribs = "";
  if (defined(pos.defaultX)) {
    attribs += xml` default-x="${pos.defaultX}"`;
  }
  if (defined(pos.defaultY)) {
    attribs += xml` default-y="${pos.defaultY}"`;
  }
  if (defined(pos.relativeX)) {
    attribs += xml` relative-x="${pos.relativeX}"`;
  }
  if (defined(pos.relativeY)) {
    attribs += xml` relative-y="${pos.relativeY}"`;
  }
  return attribs;
}

function placementToXML(placement: Placement): string {
  // <!ENTITY % placement
  //     "placement %above-below; #IMPLIED">
  if (placement.placement > AboveBelow.Unspecified) {
    return xml` placement="${
      placement.placement === AboveBelow.Above ? "above" : "below"
    }"`;
  }
  return "";
}

function orientationToXML(orientation: Orientation): string {
  // <!ENTITY % orientation
  //     "orientation (over | under) #IMPLIED">
  if (orientation.orientation > OverUnder.Unspecified) {
    return xml` orientation="${
      orientation.orientation === OverUnder.Over ? "over" : "under"
    }"`;
  }
  return "";
}

function bezierToXML(bezier: Bezier): string {
  // <!ENTITY % bezier
  //     "bezier-offset  CDATA     #IMPLIED
  //      bezier-offset2 CDATA     #IMPLIED
  //      bezier-x       %tenths;  #IMPLIED
  //      bezier-y       %tenths;  #IMPLIED
  //      bezier-x2      %tenths;  #IMPLIED
  //      bezier-y2      %tenths;  #IMPLIED">
  let attribs = "";
  if (defined(bezier.bezierOffset)) {
    attribs += xml` bezier-offset="${bezier.bezierOffset}"`;
  }
  if (defined(bezier.bezierOffset2)) {
    attribs += xml` bezier-offset2="${bezier.bezierOffset2}"`;
  }
  if (defined(bezier.bezierX)) {
    attribs += xml` bezier-x="${bezier.bezierX}"`;
  }
  if (defined(bezier.bezierY)) {
    attribs += xml` bezier-y="${bezier.bezierY}"`;
  }
  if (defined(bezier.bezierX2)) {
    attribs += xml` bezier-x2="${bezier.bezierX2}"`;
  }
  if (defined(bezier.bezierY2)) {
    attribs += xml` bezier-y2="${bezier.bezierY2}"`;
  }
  return attribs;
}

function fontToXML(font: Font): string {
  // <!ENTITY % font
  //     "font-family  CDATA  #IMPLIED
  //      font-style   CDATA  #IMPLIED
  //      font-size    CDATA  #IMPLIED
  //      font-weight  CDATA  #IMPLIED">
  let attribs = "";
  if (defined(font.fontFamily)) {
    attribs += xml` font-family="${font.fontFamily}"`;
  }
  if (defined(font.fontStyle)) {
    attribs += xml` font-style="${
      font.fontStyle === NormalItalic.Italic ? "italic" : "normal"
    }"`;
  }
  if (defined(font.fontSize)) {
    attribs += xml` font-size="${font.fontSize}"`;
  }
  if (defined(font.fontWeight)) {
    attribs += xml` font-weight="${
      font.fontWeight === NormalBold.Bold ? "bold" : "normal"
    }"`;
  }
  return attribs;
}

function printObjectToXML(printObject: PrintObject): string {
  // <!ENTITY % print-object
  //     "print-object  %yes-no;  #IMPLIED">
  if (defined(printObject.printObject)) {
    return yesNo` print-object="${printObject.printObject}"`;
  }
  return "";
}

function printSpacingToXML(printSpacing: PrintSpacing): string {
  // <!ENTITY % print-spacing
  //     "print-spacing %yes-no;  #IMPLIED">

  if (defined(printSpacing.printSpacing)) {
    return yesNo` print-spacing="${printSpacing.printSpacing}"`;
  }
  return "";
}

function textFormattingToXML(textFormatting: TextFormatting): string {
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
  return (
    "" +
    justifyToXML(textFormatting) +
    printStyleAlignToXML(textFormatting) +
    textDecorationToXML(textFormatting) +
    textRotationToXML(textFormatting) +
    letterSpacingToXML(textFormatting) +
    lineHeightToXML(textFormatting) +
    textDirectionToXML(textFormatting) +
    enclosureToXML(textFormatting)
  );
}

let leftCenterRightToXML: { [key: number]: string } = {
  1: "right",
  2: "center",
  0: "left",
};

function justifyToXML(justify: Justify): string {
  if (defined(justify.justify)) {
    return xml` justify="${leftCenterRightToXML[justify.justify]}"`;
  }
  return "";
}

function halignToXML(halign: Halign): string {
  if (defined(halign.halign)) {
    return xml` halign="${leftCenterRightToXML[halign.halign]}"`;
  }
  return "";
}

function valignToXML(valign: Valign): string {
  if (defined(valign.valign)) {
    return xml` valign="${topMiddleBottomBaselineToXML[valign.valign]}"`;
  }
  return "";
}

function printStyleAlignToXML(printStyleAlign: PrintStyleAlign): string {
  return (
    "" +
    printStyleToXML(printStyleAlign) +
    halignToXML(printStyleAlign) +
    valignToXML(printStyleAlign)
  );
}

function textDecorationToXML(textDecoration: TextDecoration): string {
  // <!ENTITY % text-decoration
  //     "underline  %number-of-lines;  #IMPLIED
  //      overline  %number-of-lines;   #IMPLIED
  //      line-through  %number-of-lines;   #IMPLIED">
  let attribs = "";
  if (defined(textDecoration.underline)) {
    attribs += xml` underline="${textDecoration.underline}"`;
  }
  if (defined(textDecoration.overline)) {
    attribs += xml` overline="${textDecoration.overline}"`;
  }
  if (defined(textDecoration.lineThrough)) {
    attribs += xml` line-through="${textDecoration.lineThrough}"`;
  }
  return attribs;
}

function textRotationToXML(textRotation: TextRotation): string {
  let attribs = "";
  if (defined(textRotation.rotation)) {
    attribs += xml` rotation="${textRotation.rotation}"`;
  }
  return attribs;
}

function letterSpacingToXML(letterSpacing: LetterSpacing): string {
  let attribs = "";
  if (defined(letterSpacing.letterSpacing)) {
    attribs += xml` letter-spacing="${letterSpacing.letterSpacing}"`;
  }
  return attribs;
}

function lineHeightToXML(lineHeight: LineHeight): string {
  let attribs = "";
  if (defined(lineHeight.lineHeight)) {
    attribs += xml` line-height="${lineHeight.lineHeight}"`;
  }
  return attribs;
}

let directionModeToXML: { [key: number]: string } = {
  0: "ltr",
  1: "rtl",
  2: "lro",
  3: "rlo",
};

function textDirectionToXML(textDirection: TextDirection): string {
  // <!ENTITY % text-direction
  //     "dir (ltr | rtl | lro | rlo) #IMPLIED">
  let attribs = "";
  if (defined(textDirection.dir)) {
    attribs += xml` dir="${directionModeToXML[textDirection.dir]}"`;
  }
  return attribs;
}

let enclosureShapeToXML: { [key: number]: string } = {
  3: "circle",
  4: "bracket",
  5: "triangle",
  6: "diamond",
  7: "none",
  1: "square",
  2: "oval",
  0: "rectangle",
};

function enclosureToXML(enclosure: Enclosure): string {
  let attribs = "";
  if (defined(enclosure.enclosure)) {
    attribs += xml` enclosure="${enclosureShapeToXML[enclosure.enclosure]}"`;
  }
  return attribs;
}

function levelDisplayToXML(levelDisplay: LevelDisplay): string {
  let attribs = "";
  if (defined(levelDisplay.bracket)) {
    attribs += yesNo` bracket="${levelDisplay.bracket}"`;
  }
  if (levelDisplay.size >= SymbolSize.Unspecified) {
    attribs += xml` size="${symbolSizeToXML[levelDisplay.size]}"`;
  }
  if (defined(levelDisplay.parentheses)) {
    attribs += yesNo` parentheses="${levelDisplay.bracket}"`;
  }
  return attribs;
}

function bendSoundToXML(bendSound: BendSound): string {
  let attribs = "";
  if (defined(bendSound.accelerate)) {
    attribs += yesNo` accelerate="${bendSound.accelerate}"`;
  }
  if (defined(bendSound.beats)) {
    attribs += xml` beats="${bendSound.beats}"`;
  }
  if (defined(bendSound.firstBeat)) {
    attribs += xml` first-beat="${bendSound.firstBeat}"`;
  }
  if (defined(bendSound.lastBeat)) {
    attribs += xml` last-beat="${bendSound.lastBeat}"`;
  }
  return attribs;
}

let upperMainBelowToXML: { [key: number]: string } = {
  1: "main",
  2: "below",
  0: "upper",
};

let wholeHalfUnisonToXML: { [key: number]: string } = {
  2: "unison",
  0: "whole",
  1: "half",
};

let wholeHalfNoneToXML: { [key: number]: string } = {
  3: "none",
  0: "whole",
  1: "half",
};

function trillSoundToXML(trillSound: TrillSound): string {
  // <!ENTITY % trill-sound
  //     "start-note    (upper | main | below)  #IMPLIED
  //      trill-step    (whole | half | unison) #IMPLIED
  //      two-note-turn (whole | half | none)   #IMPLIED
  //      accelerate    %yes-no; #IMPLIED
  //      beats         CDATA    #IMPLIED
  //      second-beat   CDATA    #IMPLIED
  //      last-beat     CDATA    #IMPLIED">
  let attribs = "";
  if (defined(trillSound.startNote)) {
    attribs += xml` start-note="${upperMainBelowToXML[trillSound.startNote]}"`;
  }
  if (defined(trillSound.trillStep)) {
    attribs += xml` trill-step="${wholeHalfUnisonToXML[trillSound.trillStep]}"`;
  }
  if (defined(trillSound.twoNoteTurn)) {
    attribs += xml` two-note-turn="${
      wholeHalfNoneToXML[trillSound.twoNoteTurn]
    }"`;
  }
  if (defined(trillSound.accelerate)) {
    attribs += yesNo` accelerate="${trillSound.accelerate}"`;
  }
  if (defined(trillSound.beats)) {
    attribs += xml` beats="${trillSound.beats}"`;
  }
  if (defined(trillSound.secondBeat)) {
    attribs += xml` second-beat="${trillSound.secondBeat}"`;
  }
  if (defined(trillSound.lastBeat)) {
    attribs += xml` last-beat="${trillSound.lastBeat}"`;
  }
  return attribs;
}

function slashToXML(slash: { slash?: boolean }): string {
  if (defined(slash.slash)) {
    return yesNo` slash="${slash.slash}"`;
  }
  return "";
}

function mordentSubsetToXML(mordent: Mordent): string {
  //     long %yes-no; #IMPLIED
  //     approach %above-below; #IMPLIED
  //     departure %above-below; #IMPLIED
  let attribs = "";
  if (defined(mordent.long)) {
    attribs += yesNo` long="${mordent.long}"`;
  }
  if (defined(mordent.approach)) {
    attribs += xml` approach="${
      mordent.approach === AboveBelow.Above ? "above" : "below"
    }"`;
  }

  if (defined(mordent.departure)) {
    attribs += xml` departure="${
      mordent.departure === AboveBelow.Above ? "above" : "below"
    }"`;
  }

  return attribs;
}

function upDownToXML(upDown: { type?: UpDown }): string {
  if (defined(upDown.type)) {
    return xml` type="${upDown.type ? "down" : "up"}"`;
  }
  return "";
}

function upDownDirectionToXML(direction: { direction?: UpDown }): string {
  if (defined(direction.direction)) {
    return xml` type="${direction.direction ? "down" : "up"}"`;
  }
  return "";
}

function topBottomToXML(topBottom: { type?: TopBottom }): string {
  if (defined(topBottom.type)) {
    return xml` type="${topBottom.type ? "bottom" : "top"}"`;
  }
  return "";
}

function colorToXML(color: Color): string {
  // <!ENTITY % color
  //     "color CDATA #IMPLIED">
  if (defined(color.color)) {
    return xml` color="${color.color}"`;
  }

  return "";
}
