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

import _                = require("lodash");
import fs               = require("fs");
import yargs            = require("yargs");

import Models           = require("./models");
import Views            = require("./views");

function readStdin(onEnd: (s: string) => void) {
    var content = "";
    process.stdin.resume();
    process.stdin.on("data", function(buf: Buffer) {
        content += buf.toString();
    });
    process.stdin.on("end", function() {
        onEnd(content);
    });
}

function readFile(file: string, onEnd: (s: string) => void, onErr: (err: any) => void) {
    fs.readFile(file, "utf8", function (err, data) {
        if (err) {
            onErr(err);
        }
        onEnd(data);
    });
}

function cannotRead(err: any) {
    console.error("Fatal. Cannot read '%s'.", err.path);
    process.exit(1);
}

(function main() {
    var args = yargs
        .wrap(100)
        .usage("Usage: $0 <command> [options]")

        .example("$0 init -x file.xml", "print initialized MusicXML")
        .example("$0 init", "initialize from stdin")

        .example("$0 diff -x old.xml -x new.xml", "print a patch from old to new")
        .example("$0 diff -x old.xml", "print a patch from old to stdin")

        .example("$0 patch -x old.xml -p p.mdiff", "print p.mdiff applied to old.xml")
        .example("$0 patch -p p.mdiff", "print p.mdiff applied to stdin")

        .example("$0 render -x in.xml", "prints multiple svgs concatenated")
        .example("$0 render -x in.xml --as out", "writes out001.svg, out002.svg, ...")

        .demand(1)
        .alias("x", "xml")
        .describe("x", "Specify a MusicXML input")
        .default("xml", ["<stdin>"])

        .describe("v", "Be verbose")

        .alias("p", "patch")
        .describe("p", "Specify a patch generated with 'satie diff'")

        .help("h")
        .alias("h", "help")
        .check(function(argv) {
            if (argv["_"].length > 1) {
                throw "Unexpected string '" + argv["_"][1] + "'.";
            }
            switch (argv["_"][0]) {
                case "init":
                case "render":
                    if (argv["xml"].length > 1) {
                        throw "Too many files specified.";
                    }
                    break;
                case "diff":
                    throw argv["_"][0] + " is not implemented, yet.";
                case "patch":
                    throw argv["_"][0] + " is not implemented, yet.";
            }
            return true;
        })
        .strict();

    // Some of the type definitions are lacking.
    var argv = (<any>args)
        .command("init", "adds revision tracking and layout information to a MusicXML file")
        .command("diff", "generate a patch between two initialized MusicXML files")
        .command("patch", "applies patch from 'satie diff' to an initialized MusicXML file")
        .command("render", "converts a MusicXML file to one or more SVGs page-by-page")
        .array("xml")
        .epilog("(C) Copyright Josh Netterfield 2015")

        .argv;

    const verbose = argv.v;

    let log = console.log.bind(console);

    switch (argv._[0]) {
        case "init":
            if (verbose) {
                console.warn("Reading from %s", argv.xml[0]);
            }
            if (argv.xml[0] === "<stdin>") {
                readStdin((<any>_).flow(Models.importXML, Models.exportXML, log));
            } else {
                readFile(argv.xml[0], (<any>_).flow(Models.importXML, Models.exportXML, log), cannotRead);
            }
            break;
        case "diff":
            throw "not implemented";
        case "patch":
            throw "not implemented";
        case "render":
            if (verbose) {
                console.warn("Reading from %s", argv.xml[0]);
            }
            const render = _.partialRight(Views.render, 1);
            if (argv.xml[0] === "<stdin>") {
                readStdin((<any>_).flow(Models.importXML, render, log));
            } else {
                readFile(argv.xml[0], (<any>_).flow(Models.importXML, render, log), cannotRead);
            }
            break;
    }
}());

