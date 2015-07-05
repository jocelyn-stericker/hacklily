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

/**
 * @file part of Satie test suite
 */

"use strict";

import {forEach} from "lodash";
import child_process = require("child_process");
import fs = require("fs");

import {importXML, exportXML} from "../index";
import {renderDocument} from "../views";

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
    } catch(e) {
        if (e.code !== "EEXIST") {
            throw e;
        }
    }
}

describe("import/export dtd validation", function() {
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
        describe(file, function() {
            const outname = `${root.replace("/", "_").replace("-", "_")}_${file.replace("-", "_")}`
                .replace(".xml", ".svg");
            it("can be imported, exported, validated, and rendered", function(done) {
                readFile(root + "/" + file, function(str) {
                    importXML(str, (err, document) => {
                        if (err) {
                            done(err);
                            return;
                        }
                        try {
                            let page1Svg = renderDocument(document, 0);
                            fs.writeFile("rendertest/out/" + outname, page1Svg);

                            if (!process.env.SKIP_DTD_VALIDATION) {
                                exportXML(document, (err, mxmlOut) => {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
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
                                    error = proc.error;
                                    if (stdout || stderr) {
                                        done(new Error(stderr || stdout || error));
                                    } else {
                                        done();
                                    }
                                });
                            } else {
                                done();
                            }
                        } catch(err) {
                            done(err);
                            return;
                        }
                    });
                });
            });
        });
    }
});
