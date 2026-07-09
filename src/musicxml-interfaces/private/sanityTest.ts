import {
  serializeNote,
  MxmlAccidental,
  BeamType,
  AccelRitNone,
} from "../index";
import { buildNote, buildAccidental, patchNote, buildBeam } from "../builders";

const acc = buildAccidental((builder) =>
  builder.accidental(MxmlAccidental.Sharp),
);

const note1 = buildNote((builder) => builder.accidental(acc));

const note2 = buildNote((builder) =>
  builder.accidental((builder) => builder.accidental(MxmlAccidental.Sharp)),
);

const note3 = buildNote((builder) =>
  builder
    .accidental((builder) => builder.accidental(MxmlAccidental.Sharp))
    .beamsAt(0, (builder) => builder.number(1).type(BeamType.Begin)),
);

const p3 = patchNote(null, (builder) =>
  builder
    .accidental((builder) => builder.accidental(MxmlAccidental.Sharp))
    .beamsAt(0, (builder) => builder.number(1).type(BeamType.Begin)),
);

const p4 = patchNote(note3, (builder) =>
  builder
    .beamsAt(0, (builder) =>
      builder.number(1).type(BeamType.Begin).repeater(true),
    )
    .beamsAt(1, (builder) =>
      builder.number(1).type(BeamType.Begin).repeater(false),
    ),
);

const p5 = patchNote(note3, (builder) =>
  builder.beamsSplice(
    0,
    1,
    buildBeam((beam) =>
      beam.number(1).type(BeamType.Begin).fan(AccelRitNone.Accel),
    ),
  ),
);

console.log(serializeNote(note1));
console.log(serializeNote(note2));
console.log(serializeNote(note3));
console.log(p3);
console.log(p4);
console.log(p5);
