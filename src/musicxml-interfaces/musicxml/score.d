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
module musicxml.score;

import xml;
import types;

import libxml2.tree;
import std.conv;
import std.exception;
import std.stdio;
import vibejson.json;

export struct Score {
    @disable this();
    private types.ScoreTimewise _score;

    this(string musicXml, string filename = "import.xml") {
        auto doc = musicXml.toDocument(filename).toTimewise();
        scope(exit) { doc.xmlFreeDoc(); }
        enforce(doc, new NotMusicXml("Failed DTD validation"));
        // Now that we've passed DTD validation, we should no longer throw exceptions.
        // Any errors we make now are our own.

        _score = new types.ScoreTimewise(doc.xmlDocGetRootElement);
    }
    ScoreTimewise representation() {
        return _score;
    }
    // There's no toJson method because this isn't compatibile with external Json libraries. 
    string toJsonString() {
        return _score.serializeToJson.toPrettyString;
    }
}

unittest {
    string simplePartwise = import("helloWorldPartwise.xml");
    Score score = simplePartwise;
    score.toJsonString.writeln;
}

unittest {
    string simplePartwise = import("generic1.xml");
    Score score = simplePartwise;
    score.toJsonString.writeln;
}
