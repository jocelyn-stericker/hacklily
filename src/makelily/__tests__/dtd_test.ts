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

import _                = require("lodash");
import child_process    = require("child_process");
import fs               = require("fs");

import Models           = require("../models");
import Views            = require("../views");

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
    _.forEach(lilyFiles, file => {
        if (file.match(/01.\.xml$/)) {
            testFile(lilyRoot, file);
        }
    });

    const satieRoot = "vendor/satie-regression";
    const satieFiles = fs.readdirSync(satieRoot); // needs to be setup before leaving 'describe'
    _.forEach(satieFiles, file => {
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
                    try {
                        let score = Models.importXML(str);
                        let mxmlOut = Models.exportXML(score);

                        let env = Object.create(process.env);
                        env.XML_CATALOG_FILES = "./vendor/musicxml-dtd/catalog.xml";
                        let proc = (<any>child_process).spawnSync("xmllint",
                                ["--valid", "--noout", "--nonet", "-"], {
                            input: mxmlOut,
                            env: env
                        });
                        const stdout = proc.stdout + "";
                        const stderr = proc.stderr + "";
                        if (stdout || stderr) {
                            done(new Error(stderr || stdout || proc.error));
                        } else {
                            let page1Svg = Views.renderDocument(score, 0);
                            fs.writeFile("rendertest/out/" + outname, page1Svg);
                            done();
                        }
                    } catch(err) {
                        done(err);
                        return;
                    }
                });
            });
        });
    }
});
