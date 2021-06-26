/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

import * as monacoEditor from "monaco-editor";

// Note: object literal order is meaningful to monarch in tokenizer!

const LILYPOND_MONARCH_PROVIDER: monacoEditor.languages.IMonarchLanguage = {
  tokenPostfix: ".ly",

  brackets: [
    {
      open: "\\(",
      close: "\\)",
      token: "bracket.parenthesis",
    },
    {
      open: "(",
      close: ")",
      token: "bracket.parenthesis",
    },
    {
      open: "{",
      close: "}",
      token: "bracket.curly",
    },
    {
      open: "[",
      close: "]",
      token: "bracket.square",
    },
    {
      open: "<<",
      close: ">>",
      token: "bracket.triangle",
    },
    {
      open: "<",
      close: ">",
      token: "bracket.triangle",
    },
  ],

  tokenizer: {
    root: [
      {
        regex: /#"/,
        action: {
          token: "string.d.delim",
          bracket: "@open",
          next: '@dstring.d."',
        },
      },
      {
        regex: /#.*/,
        action: {
          token: "constant",
        },
      },
      {
        regex:
          /\b((solx|soltcs|soltcb|solstqt|solss|solsqt|solsd|solsb|sols|solkk|solk|soldsd|soldd|sold|solcs|solcb|solbtqt|solbsb|solbqt|solbb|solb|sol|six|sitcs|sitcb|sistqt|siss|sisqt|sisd|sisb|sis|sikk|sik|sidsd|sidd|sid|sics|sicb|sibtqt|sibsb|sibqt|sibb|sib|si|rex|retcs|retcb|restqt|ress|resqt|resd|resb|res|rekk|rek|redsd|redd|red|recs|recb|rebtqt|rebsb|rebqt|rebb|reb|re|mix|mitcs|mitcb|mistqt|miss|misqt|misd|misb|mis|mikk|mik|midsd|midd|mid|mics|micb|mibtqt|mibsb|mibqt|mibb|mib|mi|lax|latcs|latcb|lastqt|lass|lasqt|lasd|lasb|las|lakk|lak|ladsd|ladd|lad|lacs|lacb|labtqt|labsb|labqt|labb|lab|la|hississ|hiss|hisis|hisih|his|hih|hessess|heses|heseh|h|gx|gtqs|gtqf|gss|gsharpsharp|gsharp|gs|gqs|gqf|gississ|giss|gisis|gisih|gis|gih|gflatflat|gflat|gff|gf|gessess|gess|geses|geseh|ges|geh|g|fx|ftqs|ftqf|fss|fsharpsharp|fsharp|fs|fqs|fqf|fississ|fiss|fisis|fisih|fis|fih|fflatflat|fflat|fff|ff|fessess|fess|feses|feseh|fes|feh|fax|fatcs|fatcb|fastqt|fass|fasqt|fasd|fasb|fas|fakk|fak|fadsd|fadd|fad|facs|facb|fabtqt|fabsb|fabqt|fabb|fab|fa|f|ex|etqs|etqf|essess|ess|esharpsharp|esharp|eses|eseh|es|eqs|eqf|eississ|eiss|eisis|eisih|eis|eih|eflatflat|eflat|eff|ef|eessess|eess|eeses|eeseh|ees|eeh|e|dx|dtqs|dtqf|dss|dsharpsharp|dsharp|ds|dqs|dqf|dox|dotcs|dotcb|dostqt|doss|dosqt|dosd|dosb|dos|dokk|dok|dodsd|dodd|dod|docs|docb|dobtqt|dobsb|dobqt|dobb|dob|do|dississ|diss|disis|disih|dis|dih|dflatflat|dflat|dff|df|dessess|dess|deses|deseh|des|deh|d|cx|ctqs|ctqf|css|csharpsharp|csharp|cs|cqs|cqf|cississ|ciss|cisis|cisih|cis|cih|cflatflat|cflat|cff|cf|cessess|cess|ceses|ceseh|ces|ceh|c|bx|btqs|btqf|bss|bsharpsharp|bsharp|bs|bqs|bqf|bisis|bisih|bis|bih|bflatflat|bflat|bff|bf|bess|beses|beseh|bes|beh|bb|b|ax|atqs|atqf|assess|ass|asharpsharp|asharp|ases|aseh|asas|asah|as|aqs|aqf|aississ|aiss|aisis|aisih|ais|aih|aflatflat|aflat|aff|af|aessess|aess|aeses|aeseh|aes|aeh|a|a)(\s*[=]?\s*(([,]\s*)|([']\s*)){0,4}\s*[?!]?)?|r|s|R|q)(?![A-Za-z])((128|64|32|16|8|4|2|1|\\breve|\\longa|\\maxima)(\s*[.]\s*)*((\s*\*\s*\d+(\/\d+)?)+)?)?(\s*[:](\s*(aug7|aug|dim|maj7|maj9|maj11|maj|m7\.5-|m7\+|m11|m9|m7|m6|m5|m|dim7|13\.11|13[-+]?|6[-+]?|9[-+]?|11[-+]?|sus2|sus4|sus|1[-+]?\.5[-+]?|1[-+]?\.5[-+]?\.8[-+]?|\d*[-+]?)((\s*[.]?\s*\d+[-+]?)|[-+])*)?)?(\s*\^\s*\d+(\s*\.\s*\d+)*)?(?![A-Za-z0-9])?/,
        action: {
          token: "string",
        },
      },
      {
        regex:
          /([-_^](\s*))?(((\\lyrics\s*)({))|((\\lyricmode\s*)({))|((\\addlyrics\s*)({))|((\\lyricsto\s*(".*")\s*)({))|(((\\lyricsto)\s*(\S*)\s*)({)))/,
        action: {
          token: "string.d.delim",
          bracket: "@open",
          next: "@lyricmode",
        },
      },
      {
        regex: /([-_^](\s*))?\\[a-zA-Z-.]*/,
        action: {
          token: "keyword",
        },
      },
      {
        regex:
          /\b(NullVoice|spacing|signature|routine|notes|handler|corrected|beams|arpeggios|Volta_engraver|Voice|Vertical_align_engraver|Vaticana_ligature_engraver|VaticanaVoice|VaticanaStaff|Tweak_engraver|Tuplet_engraver|Trill_spanner_engraver|Timing_translator|Time_signature_performer|Time_signature_engraver|Tie_performer|Tie_engraver|Text_spanner_engraver|Text_engraver|Tempo_performer|Tab_tie_follow_engraver|Tab_staff_symbol_engraver|Tab_note_heads_engraver|TabVoice|TabStaff|System_start_delimiter_engraver|Stem_engraver|Stanza_number_engraver|Stanza_number_align_engraver|Staff_symbol_engraver|Staff_performer|Staff_collecting_engraver|StaffGroup|Staff|Spanner_break_forbid_engraver|Span_bar_stub_engraver|Span_bar_engraver|Span_arpeggio_engraver|Spacing_engraver|Slur_performer|Slur_engraver|Slash_repeat_engraver|Separating_line_group_engraver|Script_row_engraver|Script_engraver|Script_column_engraver|Score|Rhythmic_column_engraver|RhythmicStaff|Rest_engraver|Rest_collision_engraver|Repeat_tie_engraver|Repeat_acknowledge_engraver|Pure_from_neighbor_engraver|Pitched_trill_engraver|Pitch_squash_engraver|Piano_pedal_performer|Piano_pedal_engraver|Piano_pedal_align_engraver|PianoStaff|Phrasing_slur_engraver|PetrucciVoice|PetrucciStaff|Percent_repeat_engraver|Part_combine_engraver|Parenthesis_engraver|Paper_column_engraver|Output_property_engraver|Ottava_spanner_engraver|Note_spacing_engraver|Note_performer|Note_name_engraver|Note_heads_engraver|Note_head_line_engraver|NoteNames|New_fingering_engraver|New_dynamic_engraver|Multi_measure_rest_engraver|Metronome_mark_engraver|Mensural_ligature_engraver|MensuralVoice|MensuralStaff|Mark_engraver|Lyrics|Lyric_performer|Lyric_engraver|Ligature_bracket_engraver|Ledger_line_engraver|Laissez_vibrer_engraver|KievanVoice|KievanStaff|Key_performer|Key_engraver|Keep_alive_together_engraver|Instrument_switch_engraver|Instrument_name_engraver|Hyphen_engraver|Hara_kiri_engraver|Grob_pq_engraver|GregorianTranscriptionVoice|GregorianTranscriptionStaff|GrandStaff|Grace_spacing_engraver|Grace_engraver|Grace_beam_engraver|Global|Glissando_engraver|Fretboard_engraver|FretBoards|Forbid_line_break_engraver|Footnote_engraver|Font_size_engraver|Fingering_engraver|Figured_bass_position_engraver|Figured_bass_engraver|FiguredBass|Extender_engraver|Episema_engraver|Dynamics|Dynamic_performer|Dynamic_align_engraver|Drum_notes_engraver|Drum_note_performer|DrumVoice|DrumStaff|Double_percent_repeat_engraver|Dots_engraver|Dot_column_engraver|Devnull|Default_bar_line_engraver|Custos_engraver|Cue_clef_engraver|CueVoice|Control_track_performer|Concurrent_hairpin_engraver|Collision_engraver|Cluster_spanner_engraver|Clef_engraver|Chord_tremolo_engraver|Chord_name_engraver|ChordNames|ChordNameVoice|ChoirStaff|Breathing_sign_engraver|Break_align_engraver|Bend_engraver|Beam_performer|Beam_engraver|Beam_collision_engraver|Bar_number_engraver|Bar_engraver|Axis_group_engraver|Auto_beam_engraver|Arpeggio_engraver|Accidental_engraver|Score|volta|unfold|percent|tremolo)\b/,
        action: {
          token: "constructor",
        },
      },
      // Cheat for chords :/
      {
        regex: /</,
        action: {
          token: "string",
        },
      },
      {
        regex: ">(128|64|32|16|8|4|2|1|\\breve|\\longa|\\maxima)?",
        action: {
          token: "string",
        },
      },
      {
        regex: /\d+\/\d+/,
        action: {
          token: "constant",
        },
      },
      {
        regex: /\d+/,
        action: {
          token: "constant",
        },
      },
      {
        regex: /[{}()[\]]/,
        action: {
          token: "@brackets",
        },
      },
      {
        regex: /"/,
        action: {
          token: "string.d.delim",
          bracket: "@open",
          next: '@dstring.d."',
        },
      },
      {
        regex: /\w+/,
        action: {
          token: "text",
        },
      },

      // whitespace
      {
        include: "@whitespace",
      },
    ],

    whitespace: [
      {
        regex: /[ \t\r\n]+/,
        action: {
          token: "white",
        },
      },
      {
        regex: /%{/,
        action: {
          token: "comment",
          next: "@comment",
        },
      },
      {
        regex: /%.*/,
        action: {
          token: "comment",
        },
      },
    ],

    comment: [
      {
        regex: /[^%{}]+/,
        action: {
          token: "comment",
        },
      },
      {
        regex: /%{/,
        action: {
          token: "comment",
          next: "@push",
        },
      }, // nested comment
      {
        regex: "%}",
        action: {
          token: "comment",
          next: "@pop",
        },
      },
      {
        regex: /%{/,
        action: {
          token: "comment",
        },
      },
      {
        regex: /%.*/,
        action: {
          token: "comment",
        },
      },
    ],

    lyricmode: [
      {
        regex: /{/,
        action: {
          token: "comment",
          next: "@push",
        },
      },
      {
        regex: /}/,
        action: {
          token: "comment",
          next: "@pop",
        },
      },
    ],

    // double quoted "string".
    // dstring.<kind>.<delim> where kind is 'd' (double quoted), 'x' (command), or 's' (symbol)
    // and delim is the ending delimiter (" or `)
    dstring: [
      {
        regex: /[^\\`"#]+/,
        action: {
          token: "string.$S2",
        },
      },
      {
        regex: /\\$/,
        action: {
          token: "string.$S2.escape",
        },
      },
      {
        regex: /\\./,
        action: {
          token: "string.$S2.escape.invalid",
        },
      },
      {
        regex: /[`"]/,
        action: {
          cases: {
            "$#==$S3": {
              token: "string.$S2.delim",
              bracket: "@close",
              next: "@pop",
            },
            "@default": "string.$S2",
          },
        },
      },
    ],
  },
};

export default LILYPOND_MONARCH_PROVIDER;
