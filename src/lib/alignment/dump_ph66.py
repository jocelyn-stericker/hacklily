#!/usr/bin/env python3
"""
Regenerate ph66Data.ts from the upstream BFA ph66 mapper.

Usage (run from the BFA repo root so the upstream package is importable):

    python dump_ph66.py \
        --mapper bournemouth_aligner/ipamappers/ph66_mapper.py \
        --out ph66Data.ts

This dumps the data tables verbatim so the TypeScript port stays byte-faithful
to the Python source. Part of the BFA TypeScript port (AGPL-3.0-or-later);
upstream BFA (C) Tabahi <tabahi@duck.com>, GPLv3.
"""
import argparse
import importlib.util
import json
import os
import sys


def load_mapper(path):
    spec = importlib.util.spec_from_file_location("ph66_mapper", path)
    mod = importlib.util.module_from_spec(spec)
    # ph66_mapper.py is self-contained for the data tables we need.
    sys.modules["ph66_mapper"] = mod
    spec.loader.exec_module(mod)
    return mod


def js(obj):
    # ensure_ascii=True keeps non-ASCII as \uXXXX escapes -> safe TS source.
    return json.dumps(obj, ensure_ascii=True, separators=(",", ":"))


HEADER = """/*
 * AUTO-GENERATED — do not edit by hand.
 * Source: bournemouth_aligner/ipamappers/ph66_mapper.py  (BFA v1.1.4)
 * Regenerate with dump_ph66.py.
 *
 * Part of a TypeScript port of the Bournemouth Forced Aligner (BFA).
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.
 * Copyright (C) Tabahi <tabahi@duck.com>.
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE at the repository root and ATTRIBUTION.md.
 */

/* eslint-disable */
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mapper", required=True, help="path to ph66_mapper.py")
    ap.add_argument("--out", required=True, help="output ph66Data.ts path")
    args = ap.parse_args()

    m = load_mapper(os.path.abspath(args.mapper))

    pm = dict(m.phoneme_mapping)                                    # str -> str (raw)
    cm = {k: list(v) for k, v in m.compound_phoneme_mapping.items()}  # str -> [str] (raw)
    pmap = {k: (v if isinstance(v, str) else list(v)) for k, v in m.phoneme_mapper.items()}
    cmap = {k: (v if isinstance(v, str) else list(v)) for k, v in m.compound_mapper.items()}
    idx = dict(m.phoneme_mapped_index)
    gmap = {str(k): v for k, v in m.phoneme_groups_mapper.items()}
    gidx = dict(m.phoneme_groups_index)

    out = HEADER
    out += "\n/** [upstream: ph66_mapper.py:3 phoneme_mapped_index] */\n"
    out += "export const phonemeMappedIndex: Record<string, number> = " + js(idx) + ";\n"
    out += "\n/** [upstream: ph66_mapper.py:103 phoneme_groups_mapper] */\n"
    out += "export const phonemeGroupsMapper: Record<string, number> = " + js(gmap) + ";\n"
    out += "\n/** [upstream: ph66_mapper.py:106 phoneme_groups_index] */\n"
    out += "export const phonemeGroupsIndex: Record<string, number> = " + js(gidx) + ";\n"
    out += "\n/** Raw IPA->base-phoneme table (non-normalized keys), used by getCompoundPhonemeMapping.\n *  [upstream: ph66_mapper.py:230 phoneme_mapping] */\n"
    out += "export const phonemeMappingRaw: Record<string, string> = " + js(pm) + ";\n"
    out += "\n/** Raw compound IPA->[base...] decompositions (non-normalized keys).\n *  [upstream: ph66_mapper.py:114 compound_phoneme_mapping] */\n"
    out += "export const compoundPhonemeMappingRaw: Record<string, string[]> = " + js(cm) + ";\n"
    out += "\n/** NFC-normalized phoneme mapper (membership tests in the phonemizer).\n *  [upstream: ph66_mapper.py:1030 via create_normalized_mapping:1019] */\n"
    out += "export const phonemeMapper: Record<string, string> = " + js(pmap) + ";\n"
    out += "\n/** NFC-normalized compound mapper (membership tests in the phonemizer).\n *  [upstream: ph66_mapper.py:1031 via create_normalized_mapping:1019] */\n"
    out += "export const compoundMapper: Record<string, string[]> = " + js(cmap) + ";\n"

    with open(args.out, "w") as f:
        f.write(out)
    print(f"wrote {args.out}  (phoneme_mapping={len(pm)}, compound={len(cm)})")


if __name__ == "__main__":
    main()
