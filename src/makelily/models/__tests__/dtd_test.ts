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
import invariant        = require("react/lib/invariant");
import yargs            = require("yargs");

import Models           = require("../models");

function readFile(file: string, onEnd: (s: string) => void) {
    fs.readFile(file, "utf8", function (err, data) {
        if (err) {
            throw err;
        }
        onEnd(data);
    });
}

describe("import/export dtd validation", function() {
    const root = "vendor/lilypond-regression";
    const files = fs.readdirSync(root); // needs to be setup before leaving 'describe'
    _.forEach(files, file => {
        if (file.match(/\.xml$/)) {
            if (file !== "01a.xml") {
                return;
            }
            describe(file, function() {
                let input: string;
                it("can be imported, exported, and validated", function(done) {
                    readFile(root + "/" + file, function(str) {
                        try {
                            let out = (<any>_).flow(Models.importXML, Models.exportXML)(str);
                            let env = Object.create(process.env);
                            let err = "";
                            env.XML_CATALOG_FILES = "./vendor/musicxml-dtd/catalog.xml";
                            let proc = (<any>child_process).spawnSync("xmllint",
                                    ["--valid", "--noout", "--nonet", "-"], {
                                input: out,
                                env: env
                            });
                            const stdout = proc.stdout + "";
                            const stderr = proc.stderr + "";
                            if (stdout || stderr) {
                                done(new Error(stderr || stdout || proc.error));
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
        }
    });
});
