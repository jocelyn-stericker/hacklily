// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable @typescript-eslint/prefer-for-of */

import { map, some, chain, maxBy } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import type { ReactElement } from "react";
import { Component } from "react";

import type { Note, Lyric, Text } from "#/musicxml-interfaces";
import { StemType } from "#/musicxml-interfaces";

import BeamView from "./implChord_beamView";
import type { IChordLayout } from "./implChord_chordModel";
import FlagView from "./implChord_flagView";
import LedgerLineView from "./implChord_ledgerLineView";
import { DEFAULT_LYRIC_SIZE, DEFAULT_FONT } from "./implChord_lyrics";
import NotationView from "./implChord_notationView";
import NoteView from "./implChord_noteView";
import RestView from "./implChord_restView";
import StemView from "./implChord_stemView";
import UnbeamedTupletView from "./implChord_unbeamedTupletView";
import { bboxes, bravura, getRight } from "./private_smufl";

const stemThickness: number = bravura.engravingDefaults.stemThickness * 10;

export interface IProps {
  layout: IChordLayout;
}

/**
 * Renders notes and their notations.
 */
export default class ChordView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): ReactElement<any> {
    const layout = this.props.layout;
    const spec = layout.model;

    const maxNotehead = maxBy(spec.noteheadGlyph, (glyph) => getRight(glyph));

    const anyVisible = some(spec, (note) => note.printObject !== false);

    if (!anyVisible) {
      return null;
    }

    let lyKey = 0;
    const lyrics = chain(spec as any as Note[])
      .map((n) => n.lyrics)
      .filter((l) => !!l)
      .flattenDeep()
      .filter((l) => !!l)
      .map((l: Lyric) => {
        const text: any[] = [];
        for (let i = 0; i < l.lyricParts.length; ++i) {
          switch (l.lyricParts[i]._class) {
            case "Syllabic":
              break;
            case "Text":
              {
                const textPt = l.lyricParts[i] as Text;
                const width = bboxes[maxNotehead][0] * 10;
                text.push(
                  <text
                    fontFamily={textPt.fontFamily || DEFAULT_FONT}
                    fontSize={textPt.fontSize || DEFAULT_LYRIC_SIZE}
                    key={++lyKey}
                    textAnchor={"middle"}
                    x={this.props.layout.x + width / 2}
                    y={this.context.originY + 60}
                  >
                    {textPt.data}
                  </text>,
                );
              }
              break;
            case "Extend":
              // TODO
              break;
            case "Elision":
              // TODO
              break;
            default:
              throw new Error(`Unknown class ${l.lyricParts[i]._class}`);
          }
        }
        return text;
      })
      .flatten()
      .value();

    if (spec[0].rest) {
      return (
        <RestView
          multipleRest={spec.satieMultipleRest}
          notehead={spec.noteheadGlyph[0]}
          spec={spec[0]}
        />
      );
    }

    const stemX = spec.stemX();
    return (
      <g>
        {map(spec, (_noteSpec: Note, idx: number) => {
          if (!spec[idx]) {
            return null;
          }
          return (
            <NoteView
              key={"n" + idx}
              noteheadGlyph={spec.noteheadGlyph[idx]}
              spec={spec[idx]}
              defaultX={spec[idx].defaultX}
            />
          );
        })}
        {layout.satieStem && (
          <StemView
            bestHeight={layout.satieStem.stemHeight}
            tremolo={layout.satieStem.tremolo}
            key="s"
            notehead={maxNotehead}
            spec={{
              color: spec[0].stem.color || "#000000",
              defaultX: stemX,
              defaultY: (layout.satieStem.stemStart - 3) * 10,
              type:
                layout.satieStem.direction === 1 ? StemType.Up : StemType.Down,
            }}
            width={stemThickness}
          />
        )}
        {map(spec.satieLedger, (lineNumber) => (
          <LedgerLineView
            key={"l" + lineNumber}
            notehead={maxNotehead}
            spec={{
              color: "#000000",
              defaultX: stemX,
              defaultY: (lineNumber - 3) * 10,
            }}
          />
        ))}
        {layout.satieFlag && layout.satieStem && (
          <FlagView
            key="f"
            notehead={maxNotehead}
            spec={{
              color: spec[0].stem.color || "$000000",
              defaultX: stemX,
              defaultY:
                (layout.satieStem.stemStart - 3) * 10 +
                (layout.satieStem.stemHeight - 7) * layout.satieStem.direction,
              direction: layout.satieStem.direction,
              flag: layout.satieFlag,
            }}
            stemHeight={layout.satieStem.stemHeight}
            stemWidth={stemThickness}
          />
        )}
        {this.props.layout.satieBeam && (
          <BeamView
            key="b"
            layout={this.props.layout.satieBeam}
            stemWidth={stemThickness}
            stroke="black"
          />
        )}
        {spec.satieUnbeamedTuplet && (
          <UnbeamedTupletView
            key="ut"
            layout={spec.satieUnbeamedTuplet}
            stemWidth={stemThickness}
            stroke="black"
          />
        )}
        {map(spec, (note, idx) =>
          map(note.notations, (notation, jdx) => (
            <NotationView
              key={`N${idx}_${jdx}`}
              layout={this.props.layout}
              defaultY={note.defaultY}
              spec={notation}
            />
          )),
        )}
        {lyrics}
      </g>
    );
  }
}
