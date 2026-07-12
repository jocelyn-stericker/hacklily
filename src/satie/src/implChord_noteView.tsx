// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { map } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Note } from "#/musicxml-interfaces";
import { NoteheadType } from "#/musicxml-interfaces";

import AccidentalView from "./implAttributes_accidentalView";
import NoteheadView from "./implChord_noteheadView";
import { getLeft, getRight } from "./private_smufl";
import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";

export interface IProps {
  spec: Note;
  noteheadGlyph: string;
  key?: string;
  defaultX?: number;
}

export default class NoteView extends Component<IProps, {}> {
  static childContextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;

    if (spec.printObject === false) {
      return null;
    }
    const defaultX = this.props.defaultX || spec.defaultX;

    const noteheadGlyph = this.props.noteheadGlyph;
    const right = getRight(noteheadGlyph);
    const left = getLeft(noteheadGlyph);

    const hasParens = spec.notehead && spec.notehead.parentheses;

    return (
      <g>
        {
          <NoteheadView
            key="h"
            notehead={noteheadGlyph}
            spec={{
              color: spec.color,
              defaultX,
              defaultY: 0,
              type: spec.notehead ? spec.notehead.type : NoteheadType.Normal,
            }}
          />
        }
        {spec.dots && spec.printDot !== false
          ? map(spec.dots, (dot, idx) => (
              <Dot
                fill={dot.color}
                key={"_1_" + idx}
                radius={2.4}
                x={defaultX + right + 6 + 6 * idx}
                y={
                  this.context.originY -
                  this.props.spec.defaultY -
                  (dot.defaultY + (dot.relativeY || 0))
                }
              />
            ))
          : null}
        {this.props.spec.accidental ? (
          <AccidentalView
            key="a"
            spec={this.props.spec.accidental}
            noteDefaultX={defaultX}
          />
        ) : null}
        {hasParens && (
          <Glyph
            glyphName="noteheadParenthesisRight"
            fill="black"
            y={this.context.originY - this.props.spec.defaultY}
            x={defaultX + right + 2}
          />
        )}
        {hasParens && (
          <Glyph
            glyphName="noteheadParenthesisLeft"
            fill="black"
            y={this.context.originY - this.props.spec.defaultY}
            x={defaultX + left - 5}
          />
        )}
      </g>
    );
  }

  getChildContext() {
    return {
      originY: this.context.originY - this.props.spec.defaultY,
    };
  }
}
