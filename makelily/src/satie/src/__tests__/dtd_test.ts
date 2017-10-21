/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

/**
 * @file part of Satie test suite
 */

import {forEach} from "lodash";
import * as child_process from "child_process";
import * as fs from "fs";

import Song from "../engine/song";

function readFile(file: string, onEnd: (s: string) => void) {
    fs.readFile(file, "utf8", function (err, data) {
        if (err) {
            throw err;
        }
        onEnd(data);
    });
}
function mkdirp(path: string) {
    try {
        fs.mkdirSync(path);
    } catch (e) {
        if (e.code !== "EEXIST") {
            throw e;
        }
    }
}

describe("Import/export tests", function() {
    const lilyRoot = "vendor/lilypond-regression";
    const lilyFiles = fs.readdirSync(lilyRoot); // needs to be setup before leaving 'describe'
    forEach(lilyFiles, file => {
        if (file.match(/[0-9]..\.xml$/)) {
            testFile(lilyRoot, file);
        }
    });

    const satieRoot = "vendor/satie-regression";
    const satieFiles = fs.readdirSync(satieRoot); // needs to be setup before leaving 'describe'
    forEach(satieFiles, file => {
        if (file.match(/\.xml$/)) {
            testFile(satieRoot, file);
        }
    });

    mkdirp("rendertest");
    mkdirp("rendertest/out");

    function testFile(root: string, file: string) {
       const outname = `${root.replace("/", "_").replace("-", "_")}_${file.replace("-", "_")}`
           .replace(".xml", ".svg");
       it(file, function(done) {
           readFile(root + "/" + file, function(musicXML) {
               let song = new Song({
                   baseSrc: musicXML,

                   onError: done,
                   onLoaded: () => {
                       try {
                            // HACK: Overwrite encoding date to always be the same, so test results don't change overnight.
                            // Note: this is not the correct way of modifying a document -- use patches!
                            song.header.identification.encoding.encodingDate = {
                                day: 1,
                                month: 1,
                                year: 2016,
                            };
                            // HACK: overwrite UUIDs, so test results don't change every time.
                            // Note: this is not the correct way of modifying a document -- use patches!
                            song.getDocument(null).measures.forEach((measure, idx) => {
                                measure.uuid = 42 + idx;
                            });
                            const page1Svg = song.toSVG();
                            fs.writeFile("rendertest/out/" + outname, page1Svg);

                            if (!process.env.SKIP_DTD_VALIDATION) {
                                let mxmlOut = song.toMusicXML();
                                let stdout: string;
                                let stderr: string;
                                let error: string;

                                let env = Object.create(process.env);
                                env.XML_CATALOG_FILES = "./vendor/musicxml-dtd/catalog.xml";
                                fs.writeFile("rendertest/out/" + outname + ".xml", mxmlOut);
                                let proc = child_process.spawnSync("xmllint",
                                        ["--valid", "--noout", "--nonet", "-"], {
                                    input: mxmlOut,
                                    env: env
                                });
                                stdout = String(proc.stdout);
                                stderr = String(proc.stderr);
                                error = "" + proc.error;
                                if (stdout || stderr) {
                                    done(new Error(stderr || stdout || error));
                                } else {
                                    done();
                                }
                            } else {
                                done();
                            }
                       } catch(err) {
                           done(err);
                           return;
                       }
                   },
               });
               song.run();
           });
       });
    }
});
