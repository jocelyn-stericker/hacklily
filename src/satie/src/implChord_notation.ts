// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { forEach } from "lodash";

import type {
  Articulations,
  Placement,
  Notations,
  PrintStyle,
  Note,
  Technical,
} from "#/musicxml-interfaces";
import { AboveBelow, UprightInverted, StemType } from "#/musicxml-interfaces";

import type { IChordLayout } from "./implChord_chordModel";
import type { IBoundingRect } from "./private_boundingRect";
import { bboxes, getLeft, getRight } from "./private_smufl";

const PADDING = 1.5;

export function articulationDirectionMatters(model: Articulations): boolean {
  return !model.breathMark && !model.caesura;
}

export function articulationGlyph(
  model: Articulations,
  direction: string,
): string {
  if (model.accent) {
    return `articAccent${direction}`;
  }
  if (model.breathMark) {
    return `breathMarkComma`;
  }
  if (model.caesura) {
    return `caesura`;
  }
  if (model.detachedLegato) {
    return `articTenutoStaccato${direction}`;
  }
  if (model.doit) {
    return null;
  }
  if (model.falloff) {
    return null;
  }
  if (model.plop) {
    return null;
  }
  if (model.scoop) {
    return null;
  }
  if (model.spiccato) {
    return `articStaccatissimoWedge${direction}`;
  }
  if (model.staccatissimo) {
    return `articStaccatissimo${direction}`;
  }
  if (model.staccato) {
    return `articStaccato${direction}`;
  }
  if (model.stress) {
    return `articStress${direction}`;
  }
  if (model.strongAccent) {
    return `articMarcato${direction}`;
  }
  if (model.tenuto) {
    return `articTenuto${direction}`;
  }
  if (model.unstress) {
    return `articUnstress${direction}`;
  }
  console.warn("Unknown articulation...");
  return null;
}

export function technicalGlyph(model: Technical, direction: string): string {
  if (model.arrow) {
    return "arrowBlackDownRight";
  }
  if (model.bend) {
    return "brassBend";
  }
  if (model.doubleTongue) {
    return `doubleTongue${direction}`;
  }
  if (model.downBow) {
    if (direction === "Below") {
      return "stringsDownBowTurned";
    } else {
      return "stringsDownBow";
    }
  }
  if (model.fingering) {
    return `fingering${model.fingering.finger}`;
  }
  if (model.fingernails) {
    return "pluckedWithFingernails";
  }
  if (model.fret) {
    console.warn("fret not implemented");
    return null;
  }
  if (model.hammerOn) {
    console.warn("hammerOn not implemented");
    return null;
  }
  if (model.handbell) {
    console.warn("handbell not implemented");
    return null;
  }
  if (model.harmonic) {
    return "stringsHarmonic";
  }
  if (model.heel) {
    return "stringsDownBow";
  }
  if (model.hole) {
    return "windClosedHole";
  }
  if (model.openString) {
    return "stringsHarmonic";
  }
  if (model.pluck) {
    console.warn("pluck not implemented");
    return null;
  }
  if (model.pullOff) {
    console.warn("pullOff not implemented");
    return null;
  }
  if (model.snapPizzicato) {
    return `pluckedSnapPizzicato${direction}`;
  }
  if (model.stopped) {
    return "pluckedLeftHandPizzicato";
  }
  if (model.string) {
    console.warn("string not implemented");
    return null;
  }
  // TODO: stringMute is a direction in musicxml!
  if (model.tap) {
    console.warn("tap not implemented");
    return null;
  }
  if (model.thumbPosition) {
    return "stringsThumbPosition";
  }
  if (model.toe) {
    return "keyboardPedalToe1";
  }
  if (model.tripleTongue) {
    return `tripleTongue${direction}`;
  }
  if (model.upBow) {
    if (direction === "Below") {
      return "stringsUpBowTurned";
    } else {
      return "stringsUpBow";
    }
  }
  console.warn("Unknown technical", model);
  return null;
}

export interface IGeneralNotation extends PrintStyle, Placement {
  _snapshot?: IGeneralNotation;
}

export function getBoundingRects(
  model: Notations,
  note: Note,
  chord: IChordLayout,
): { bb: IBoundingRect[]; n: Notations } {
  const boxes: IBoundingRect[] = [];
  const origModel = model;
  model = Object.create(model);
  Object.keys(origModel).forEach((m) => {
    (model as any)[m] =
      typeof (model as any)[m] === "object"
        ? Object.create((model as any)[m])
        : model;
  });

  forEach(model.accidentalMarks, (_accidentalMark) => {
    // TODO
  });

  forEach(model.arpeggiates, (_arpeggiate) => {
    // TODO
  });

  forEach(model.articulations, (articulation, idx) => {
    articulation = model.articulations[idx] = Object.create(articulation);
    forEach(
      [
        "accent",
        "breathMark",
        "caesura",
        "detachedLegato",
        "doit",
        "falloff",
        "plop",
        "scoop",
        "spiccato",
        "staccatissimo",
        "staccato",
        "stress",
        "strongAccent",
        "tenuto",
        "unstress",
      ],
      (type) => {
        // TODO: Could this be done any less efficiently?
        if ((model.articulations[idx] as any)[type]) {
          const thisArticulation: Placement = Object.create(
            (<any>model.articulations[idx])[type],
          );
          const { placement } = thisArticulation;
          const isBelow = placement === AboveBelow.Below;
          const glyph = articulationGlyph(
            articulation,
            isBelow ? "Below" : "Above",
          );
          if (!glyph) {
            console.warn(
              Object.keys(articulation)[0],
              "not implented in chord/notation.ts",
            );
            return;
          }
          let y: number;
          const noteheadGlyph = chord.model.noteheadGlyph[0];

          if (!bboxes[glyph] || !bboxes[noteheadGlyph]) {
            console.warn("no bbox for", glyph, noteheadGlyph);
            return;
          }
          const center =
            (getLeft(noteheadGlyph) + getRight(noteheadGlyph)) / 2 -
            (getLeft(glyph) + getRight(glyph)) / 2 -
            0.5;
          if (
            !chord.satieStem ||
            (note.stem.type === StemType.Up) === isBelow
          ) {
            y = note.defaultY + (isBelow ? -9 : 9);
            if (-note.defaultY % 10 === 0) {
              y += isBelow ? -5 : 5;
            }
          } else {
            y =
              note.defaultY + chord.satieStem.stemHeight + (isBelow ? -12 : 12);
            if (-note.defaultY % 10 === 0) {
              y += isBelow ? -5 : 5;
            }
          }
          (<any>model.articulations[idx])[type] = push(
            glyph,
            thisArticulation,
            center,
            y,
          );
        }
      },
    );
  });

  forEach(model.dynamics, (_dynamic) => {
    // TODO
  });

  forEach(model.fermatas, (fermata, idx) => {
    fermata = model.fermatas[idx] = Object.create(fermata);
    if (fermata.type === UprightInverted.Inverted) {
      (<any>fermata).placement = AboveBelow.Below;
    } else {
      (<any>fermata).placement = AboveBelow.Above;
    }
    model.fermatas[idx] = <any>push("fermataAbove", fermata);
  });

  forEach(model.glissandos, (_glissando) => {
    // TODO
  });

  forEach(model.nonArpeggiates, (_nonArpeggiate) => {
    // TODO
  });

  forEach(model.ornaments, (ornament, idx) => {
    ornament = model.ornaments[idx] = Object.create(ornament);
    if (ornament.tremolo) {
      chord.satieStem.tremolo = ornament.tremolo;
    }
    // TODO
  });

  forEach(model.slides, (_slide) => {
    // TODO
  });

  forEach(model.slurs, (_slur) => {
    // TODO
  });

  forEach(model.technicals, (technical, idx) => {
    technical = model.technicals[idx] = Object.create(technical);

    forEach(
      [
        "arrow",
        "bend",
        "doubleTongue",
        "downBow",
        "fingering",
        "fingernails",
        "fret",
        "hammerOn",
        "handbell",
        "harmonic",
        "heel",
        "hole",
        "openString",
        "pluck",
        "pullOff",
        "snapPizzicato",
        "stopped",
        "string",
        "tap",
        "thumbPosition",
        "toe",
        "tripleTongue",
        "upBow",
      ],
      (type) => {
        // TODO: Could this be done any less efficiently?
        if ((model.technicals[idx] as any)[type]) {
          const thisTechnical: Placement = Object.create(
            (<any>model.technicals[idx])[type],
          );
          const { placement } = thisTechnical;
          const isBelow = placement === AboveBelow.Below;
          const glyph = technicalGlyph(technical, isBelow ? "Below" : "Above");
          if (!glyph) {
            console.warn(
              Object.keys(technical)[0],
              "not implented in chord/notation.ts",
            );
            return;
          }
          let y: number;
          const noteheadGlyph = chord.model.noteheadGlyph[0];

          if (!bboxes[glyph] || !bboxes[noteheadGlyph]) {
            return;
          }

          const center =
            (getLeft(noteheadGlyph) + getRight(noteheadGlyph)) / 2 -
            (getLeft(glyph) + getRight(glyph)) / 2 -
            0.5;
          if (
            !chord.satieStem ||
            (note.stem.type === StemType.Up) === isBelow
          ) {
            y = note.defaultY + (isBelow ? -9 : 9);
            if (-note.defaultY % 10 === 0) {
              y += isBelow ? -5 : 5;
            }
          } else {
            y =
              note.defaultY + chord.satieStem.stemHeight + (isBelow ? -12 : 12);
            if (-note.defaultY % 10 === 0) {
              y += isBelow ? -5 : 5;
            }
          }
          (<any>model.technicals[idx])[type] = push(
            glyph,
            thisTechnical,
            center,
            y,
          );
        }
      },
    );
  });

  forEach(model.tieds, (_tied) => {
    // TODO
  });

  forEach(model.tuplets, (_tuplet) => {
    // TODO
  });

  function push(
    glyphName: string,
    notation: IGeneralNotation,
    defaultX = 0,
    defaultY: number = NaN,
  ): IGeneralNotation {
    const box = bboxes[glyphName];
    if (!box) {
      console.warn("Unknown glyph", glyphName);
      return null;
    }

    if (isNaN(defaultY)) {
      if (notation.placement === AboveBelow.Below) {
        defaultY = -30 + box[3] * 10 * PADDING;
      } else if (notation.placement === AboveBelow.Above) {
        defaultY = 60 + box[3] * 10 * PADDING;
      } else {
        console.warn("TODO: Set default above/below");
        // above: "fermata", "breathMark", "caesura", "strings"
        // below: "dynamic"
        defaultY = 0;
      }
    }

    const printStyle: PrintStyle | IBoundingRect = Object.create(notation);
    const boundingRect = printStyle as IBoundingRect;

    boundingRect.top = box[3] * 10;
    boundingRect.bottom = box[1] * 10;
    boundingRect.left = box[2] * 10;
    boundingRect.right = box[0] * 10;
    boundingRect.defaultX = defaultX;
    boundingRect.defaultY = defaultY;

    boxes.push(printStyle as IBoundingRect);

    return printStyle;
  }

  return {
    bb: boxes,
    n: model,
  };
}
