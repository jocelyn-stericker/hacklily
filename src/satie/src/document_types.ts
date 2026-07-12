// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

enum Type {
  START_OF_LAYOUT_ELEMENTS = 0,
  Print = 10,
  Grouping = 30,
  FiguredBass = 40,
  END_OF_LAYOUT_ELEMENTS = 99,

  START_OF_STAFF_ELEMENTS = 100,
  Attributes = 110,
  Sound = 120,
  Direction = 130,
  Harmony = 140,
  Proxy = 150, // Does not implement a MusicXML API
  Spacer = 160, // Does not implement a MusicXML API
  END_OF_STAFF_ELEMENTS = 199,

  START_OF_VOICE_ELEMENTS = 200,
  Chord = 220, // Implements Note[]
  END_OF_VOICE_ELEMENTS = 299,

  VisualCursor = 398,
  Barline = 399, // Also deals with warning attributes
}

// Notes and chords are treated as the same type.
(Type as any)["Note"] = Type.Chord;

export default Type;
