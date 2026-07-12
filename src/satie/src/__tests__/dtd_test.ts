// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import * as child_process from "child_process";
import * as fs from "fs";

import { forEach } from "lodash";

import SongImpl from "../engine_songImpl";

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

describe("Import/export tests", function () {
  const lilyRoot = "static/satie/lilypond-regression";
  const lilyFiles = fs.readdirSync(lilyRoot); // needs to be setup before leaving 'describe'
  forEach(lilyFiles, (file) => {
    if (file.match(/[0-9]..\.xml$/)) {
      testFile(lilyRoot, file);
    }
  });

  const satieRoot = "src/satie/vendor/satie-regression";
  const satieFiles = fs.readdirSync(satieRoot); // needs to be setup before leaving 'describe'
  forEach(satieFiles, (file) => {
    if (file.match(/\.xml$/)) {
      testFile(satieRoot, file);
    }
  });

  mkdirp("src/satie/rendertest");
  mkdirp("src/satie/rendertest/out");

  function testFile(root: string, file: string) {
    const outname =
      `${root.replace(/^.*(vendor|satie)\//, "vendor_").replace("-", "_")}_${file.replace(
        "-",
        "_",
      )}`.replace(".xml", ".svg");
    it(file, async function () {
      const musicXML = await new Promise<string>((resolve, _reject) => {
        readFile(root + "/" + file, (data) => resolve(data));
      });
      await new Promise<void>((resolve, reject) => {
        let countedErr = false;
        const song = new SongImpl({
          baseSrc: musicXML,

          onError: (err) => {
            reject(err);
            countedErr = true;
          },
          onLoaded: () => {
            if (countedErr) {
              return;
            }

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
              fs.writeFileSync("src/satie/rendertest/out/" + outname, page1Svg);

              if (!process.env.SKIP_DTD_VALIDATION) {
                const mxmlOut = song.toMusicXML();
                const env = Object.create(process.env);
                env.XML_CATALOG_FILES =
                  "src/satie/vendor/musicxml-dtd/catalog.xml";
                fs.writeFileSync(
                  "src/satie/rendertest/out/" + outname + ".xml",
                  mxmlOut,
                );
                const proc = child_process.spawnSync(
                  "xmllint",
                  ["--valid", "--noout", "--nonet", "-"],
                  {
                    input: mxmlOut,
                    env: env,
                  },
                );
                const stdout = String(proc.stdout);
                const stderr = String(proc.stderr);
                const error = "" + proc.error;
                if (proc.error) {
                  // xmllint not available; skip validation
                  resolve();
                } else if (stdout || stderr) {
                  reject(new Error(stderr || stdout || error));
                } else {
                  resolve();
                }
              } else {
                resolve();
              }
            } catch (err) {
              reject(err);
              return;
            }
          },
        });
        song.run();
      });
    });
  }
});
