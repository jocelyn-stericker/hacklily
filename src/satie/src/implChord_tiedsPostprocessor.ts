// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import invariant from "invariant";
import { forEach, times, find } from "lodash";

import type { Tied } from "#/musicxml-interfaces";
import { StartStopContinue } from "#/musicxml-interfaces";

import type { ILayout } from "./document";
import { Type } from "./document";
import type NoteImpl from "./implChord_noteImpl";
import { notationObj } from "./private_chordUtil";
import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";

interface IMutableTied {
  number: number;
  elements: ILayout[];
  initial: Tied;
}

type TiedSet = {
  [id: number]: IMutableTied;
  [id: string]: IMutableTied; // For Dictionary!
};

/**
 * Lays out measures within a bar & justifies.
 *
 * @returns new end of line
 */
function tied(
  options: ILayoutOptions,
  bounds: ILineBounds,
  measures: IMeasureLayout[],
): IMeasureLayout[] {
  forEach(measures, (measure) => {
    // Note that the `number` property of beams does NOT differentiate between sets of beams,
    // as it does with e.g., ties. See `note.mod`.
    const activeTieds: TiedSet = {};
    // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
    times(measure.elements[0].length, (i) => {
      forEach(measure.elements, (elements) => {
        const layout = elements[i];
        const model = layout.model;
        if (!model || layout.renderClass !== Type.Chord) {
          return;
        }
        const chord: ArrayLike<NoteImpl> = model as any;
        const noteWithTieds = find(chord, (el) => {
          const notations = notationObj(el);
          return notations && notations.tieds && notations.tieds.length > 0;
        });

        if (noteWithTieds && noteWithTieds.grace) {
          // TODO: grace notes
          return;
        }
        if (!noteWithTieds) {
          return;
        }
        const notations = notationObj(noteWithTieds);
        const tieds = notations.tieds;
        forEach(tieds, (tied) => {
          invariant(
            isFinite(tied.number) && tied.number !== null,
            "Tieds must have an ID (tied.number)",
          );
          const currTied = activeTieds[tied.number];
          if (currTied) {
            if (tied.type === StartStopContinue.Start) {
              console.warn(
                'Found "Start" Tied that continues an existing Tied:',
                currTied,
              );
            }
            currTied.elements.push(layout);
            terminateTied$(activeTieds, tied);
          }

          if (tied.type !== StartStopContinue.Stop) {
            activeTieds[tied.number] = {
              number: tied.number,
              elements: [layout],
              initial: tied,
            };
          }
        });
      });
    });
    forEach<IMutableTied>(activeTieds as any, (tied, idx) => {
      console.warn(
        "Tied %s was not closed before the end of the measure " +
          "(this will be implemented later!)",
        idx,
      );
    });
  });
  return measures;
}

function terminateTied$(activeTieds: TiedSet, tied: Tied) {
  (<any>activeTieds[tied.number].initial).satieTieTo =
    activeTieds[tied.number].elements[1];
  delete activeTieds[tied.number];
}

export default tied;
