/**
 * @file Utilities for reading MusicXML files.
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

import core.vararg;
import libxml2.encoding;
import libxml2.globals;
import libxml2.parser;
import libxml2.SAX2;
import libxml2.tree;
import libxml2.valid;
import libxml2.xmlIO;
import libxml2.xmlmemory;
import libxslt.transform;
import libxslt.xslt;
import libxslt.xsltInternals;
import libxslt.xsltUtils;
import std.algorithm;
import std.exception;
import std.range;
import std.stdio;
import std.string;
import std.utf;

/************************
 * I) General Utilities *
 ************************/

version(Windows) {
	xmlFreeFunc xmlFree;
	xmlMallocFunc xmlMalloc;
	xmlStrdupFunc xmlMemStrdup;
	xmlReallocFunc xmlRealloc;

    static this() {
        xmlMemGet(&xmlFree,&xmlMalloc,&xmlRealloc,null);
    }
}

/**
 * Converts a null or null-terminated string to a D string or character array.
 */
export auto toString(T)(inout(T)* cstr) {
    import core.stdc.string: strlen;
    return cstr ? cstr[0 .. strlen(cstr)] : "";
}

/**
 * Converts an XML document to a d string.
 */
export string toString(xmlDocPtr document) {
    int len;
    char* buffer;
    xmlDocDumpMemoryEnc(document, &buffer, &len, "UTF-8");

    string str = buffer[0..len].toUTF8();
    xmlFree(buffer);
    return str;
}


/********************
 * II) XML Utilites *
 ********************/


/**
 * Reads an XML document in from memory. The encoding is detected.
 *
 * You must free the document when you are done with it with 'xmlFreeDoc'.
 */
export xmlDocPtr toDocument(T)(in T indoc, in string filename) {
    assert(indoc);
    assert(filename);
    return xmlReadMemory(
            cast(const(char)*) indoc.ptr,
            cast(int) indoc.length,
            filename.toStringz(), null, 0);
}

/**
 * Reads a DTD document in from memory. The encoding is detected.
 *
 * You must free the dtd when you are done with it with 'xmlFreeDtd'.
 */
export xmlDtdPtr toDTD(T)(in T indoc, in string filename) {
    assert(indoc);
    assert(filename);
    auto buffer = indoc.toXMLBuffer(); // don't worry, xmlIOParseDTD clears buffer.
    return xmlIOParseDTD(null, buffer, xmlCharEncoding.XML_CHAR_ENCODING_NONE);
}

/**
 * Validates an XML document, given a DTD.
 *
 * Returns 'true' if the document is a valid XML document that passes
 * validation under the DTD, 'false' otherwise.
 */
export bool validatesUnderDTD(xmlDocPtr doc, xmlDtdPtr dtd) {
    assert(doc);
    assert(dtd);
    auto cvp = xmlNewValidCtxt(); 
        scope(exit) { xmlFreeValidCtxt(cvp); }
    extern(C) void noOpValid(void* ctx, const(char)* msg, ...) { }

    cvp.warning = &noOpValid;
    cvp.error = &noOpValid;

    if (!xmlValidateDocument(cvp, doc)) { return false; }
    if (!xmlValidateDtd(cvp, doc, dtd)) { return false; }
    return true;
}

export class NoElementFound : Throwable {
    this() { super("Expected an element."); }
}

template first(xmlElementType type) {
    export xmlNodePtr first(xmlNodePtr node) {
        while(node && node.type != type) {
            node = node.next;
        }
        return node;
    }
}

export alias firstElement = first!(xmlElementType.XML_ELEMENT_NODE);

template next(xmlElementType type) {
    export xmlNodePtr next(xmlNodePtr node) {
        do {
            node = node.next;
        } while(node && node.type != type);
        return node;
    }
}

export alias nextElement = next!(xmlElementType.XML_ELEMENT_NODE);


/**************************
 * III) MusicXML Utilites *
 **************************/

export class NotMusicXml : Throwable {
    this(string reason = "") { super("Expected a valid MusicXML document." ~ reason); }
}

export bool isPartwise(xmlDocPtr doc) {
    return doc.validatesUnderDTD(g_partwiseDtd);
}

export bool isTimewise(xmlDocPtr doc) {
    return doc.validatesUnderDTD(g_timewiseDtd);
}

export bool isMusicXML(xmlDocPtr doc) {
    return doc.isPartwise || doc.isTimewise;
}

/**
 * Converts a partwise MusicXML document to a timewise MusicXML document.
 * Keeps a timewise MusicXML document as it is.
 * 
 * Throws a NotMusicXml exception if the document is not a MusicXML document.
 * Frees the old document, even on failure.
 */
export xmlDocPtr toTimewise(xmlDocPtr musicxmlDoc) {
    scope(exit) { xmlFreeDoc(musicxmlDoc); }

    if (musicxmlDoc.isTimewise) { return musicxmlDoc; }
    enforce(musicxmlDoc.isPartwise, new NotMusicXml("Failed DTD validation"));
    auto newDoc = xsltApplyStylesheet(g_parttimeStylesheet, musicxmlDoc, null);
    enforce(!!newDoc, new NotMusicXml("Could not transform to timewise MusicXML"));
    return newDoc;
} unittest {
    // Test conversion from partwise to timewise.
    string simplePartwise = import("helloWorldPartwise.xml");
    auto timewise = simplePartwise.toDocument("simplePartwise.xml").toTimewise();
        scope(exit) { timewise.xmlFreeDoc(); }

    auto timewiseStr = timewise.toString;
    assert(timewiseStr.indexOf("<measure") < timewiseStr.indexOf("<part "));
} unittest {
    // Test conversion from timewise to timewise.
    string simplePartwise = import("helloWorldPartwise.xml");
    auto timewise = simplePartwise.toDocument("simplePartwise.xml").toTimewise();
        scope(exit) { timewise.xmlFreeDoc(); }

    auto timewiseStr = timewise.toString;
    assert(timewiseStr.indexOf("<measure") < timewiseStr.indexOf("<part "));
} unittest {
    // Test invalid
    string invalid = "<invalid />";
    assertThrown!NotMusicXml(invalid.toDocument("invalid.xml").toTimewise());
}

/**
 * Converts a timewise MusicXML document to a partwise MusicXML document.
 * Keeps a timewise MusicXML document as it is.
 *
 * Throws a NotMusicXml exception if the document is not a MusicXML document.
 * Frees the old document, even on failure.
 */
export xmlDocPtr toPartwise(xmlDocPtr musicxmlDoc) {
    scope(exit) { xmlFreeDoc(musicxmlDoc); }

    if (musicxmlDoc.isPartwise) { return musicxmlDoc; }
    enforce(musicxmlDoc.isTimewise, new NotMusicXml("Failed DTD validation"));
    auto newDoc = xsltApplyStylesheet(g_timepartStylesheet, musicxmlDoc, null);
    enforce(!!newDoc, new NotMusicXml("Could not transform to timewise MusicXML"));
    return newDoc;
} unittest {
    // Test conversion from timewise to partwise.
    string simplePartwise = import("helloWorldTimewise.xml");
    auto timewise = simplePartwise.toDocument("simpleTimewise.xml").toPartwise();
        scope(exit) { timewise.xmlFreeDoc(); }

    auto timewiseStr = timewise.toString;
    assert(timewiseStr.indexOf("<measure") > timewiseStr.indexOf("<part "));
}

static this() {
    xmlSetExternalEntityLoader(&musicDtdExternalEntityLoader); 

    g_parttimeStylesheet = parttime_xsl.toDocument("parttime.xsl").xsltParseStylesheetDoc;
    g_timepartStylesheet = timepart_xsl.toDocument("timepart.xsl").xsltParseStylesheetDoc;

    g_midixmlDtd = midixml_dtd.toDTD("midixml.dtd");
    g_opusDtd = opus_dtd.toDTD("opus.dtd");
    g_partwiseDtd = partwise_dtd.toDTD("partwise.dtd");
    g_soundsDtd = sounds_dtd.toDTD("sounds.dtd");
    g_timewiseDtd = timewise_dtd.toDTD("timewise.dtd");
}

static ~this() {
    xsltFreeStylesheet(g_parttimeStylesheet);
    xsltFreeStylesheet(g_timepartStylesheet);
    xmlFreeDtd(g_midixmlDtd);
    xmlFreeDtd(g_opusDtd);
    xmlFreeDtd(g_partwiseDtd);
    xmlFreeDtd(g_soundsDtd);
    xmlFreeDtd(g_timewiseDtd);
    xsltCleanupGlobals();
    xmlCleanupParser();
}





private enum parttime_xsl = import("parttime.xsl");
private enum timepart_xsl = import("timepart.xsl");

private enum midievents_dtd = import("MidiEvents10.dtd" );
private enum midixml_dtd = import("midixml.dtd" );
private enum opus_dtd = import("opus.dtd" );
private enum partwise_dtd = import("partwise.dtd" );
private enum sounds_dtd = import("sounds.dtd" );
private enum timewise_dtd = import("timewise.dtd" );

private enum attributes_mod = import("attributes.mod");
private enum barline_mod = import("barline.mod");
private enum common_mod = import("common.mod");
private enum direction_mod = import("direction.mod");
private enum identity_mod = import("identity.mod");
private enum layout_mod = import("layout.mod");
private enum link_mod = import("link.mod");
private enum note_mod = import("note.mod");
private enum score_mod = import("score.mod");

private extern(C) xmlParserInputPtr xmlNewStringInputStream (xmlParserCtxtPtr, const(char)*); // parserInternals.h

/**
    * Creates a parser buffer from memory. The encoding is detected.
    *
    * You must close the buffer by parsing it to a function which closes it,
    * such as toDTD.
    */
private xmlParserInputBufferPtr toXMLBuffer(T)(in T indoc) {
    // Can be cleared with xmlOutputBufferClose.
    return xmlParserInputBufferCreateMem(
            cast(const(char)*) indoc.ptr,
            cast(int) indoc.length,
            xmlCharEncoding.XML_CHAR_ENCODING_NONE);
}

private extern(C) xmlParserInputPtr musicDtdExternalEntityLoader(
        const(char)* cURL, const(char)* cID, xmlParserCtxtPtr ctxt) { 

    auto url = cURL.toString;
    auto id = cID.toString;

    if (url == "parttime.xsl") { return xmlNewStringInputStream(ctxt, parttime_xsl); }
    if (url == "timepart.xsl") { return xmlNewStringInputStream(ctxt, timepart_xsl); }

    if (id == "-//MIDI Manufacturers Association//DTD MIDIEvents 1.0//EN" ) {
        return xmlNewStringInputStream(ctxt, midievents_dtd);
    }

    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 MIDI//EN" ) {
        return xmlNewStringInputStream(ctxt, midixml_dtd);
    }

    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Opus//EN" ) {
        return xmlNewStringInputStream(ctxt, opus_dtd);
    }

    if (id == "-//Recordare//DTD MusicXML 3.0 Partwise//EN" ) {
        return xmlNewStringInputStream(ctxt, partwise_dtd);
    }

    if (id == "-//Recordare//DTD MusicXML 3.0 Sounds//EN" ) {
        return xmlNewStringInputStream(ctxt, sounds_dtd);
    }

    if (id == "-//Recordare//DTD MusicXML 3.0 Timewise//EN" ) {
        return xmlNewStringInputStream(ctxt, timewise_dtd);
    }

    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Attributes//EN" ) {
        return xmlNewStringInputStream(ctxt, attributes_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Barline//EN" ) {
        return xmlNewStringInputStream(ctxt, barline_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Common//EN" ) {
        return xmlNewStringInputStream(ctxt, common_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Direction//EN" ) {
        return xmlNewStringInputStream(ctxt, direction_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Identity//EN" ) {
        return xmlNewStringInputStream(ctxt, identity_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Layout//EN" ) {
        return xmlNewStringInputStream(ctxt, layout_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Link//EN" ) {
        return xmlNewStringInputStream(ctxt, link_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Note//EN" ) {
        return xmlNewStringInputStream(ctxt, note_mod); 
    }
    if (id == "-//Recordare//ELEMENTS MusicXML 3.0 Score//EN" ) {
        return xmlNewStringInputStream(ctxt, score_mod); 
    }

    writeln("Unknown in-memory reference: ", url, " (which is ", id, " )");
    return null;
}

private xsltStylesheetPtr g_parttimeStylesheet;
private xsltStylesheetPtr g_timepartStylesheet;

private xmlDtdPtr g_midixmlDtd;
private xmlDtdPtr g_opusDtd;
private xmlDtdPtr g_partwiseDtd;
private xmlDtdPtr g_soundsDtd;
private xmlDtdPtr g_timewiseDtd;
