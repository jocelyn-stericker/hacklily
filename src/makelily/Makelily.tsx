/**
 * @license
 * This file is part of Makelily.
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

import React from "react";

import { cn } from "../lib/utils";
import { parseClef, parseKeySig, parseTime } from "./parseLy";
import { Application, requireFont } from "./satie/src/satie";
import type { ToolProps } from "./tool";
import ToolError from "./ToolError";
import ToolNoteEdit from "./ToolNoteEdit";
import ToolNotFound from "./ToolNotFound";
import ToolSetClef from "./ToolSetClef";
import ToolSetKey from "./ToolSetKey";
import ToolSetTime from "./ToolSetTime";

export const satieApplication: Application = new Application({
  preloadedFonts: ["Alegreya", "Alegreya (bold)"],
  satieRoot: `${location.protocol}//${location.host}/vendor/`,
});

requireFont("Bravura", "root://bravura/otf/Bravura.otf");

interface InsertMode {
  Component: React.ComponentType<ToolProps>;
  key: string;
  name: string;
}

const modes: InsertMode[] = [
  {
    Component: ToolSetClef,
    key: "clef",
    name: "Set Clef",
  },
  {
    Component: ToolSetKey,
    key: "key",
    name: "Set Key Signature",
  },
  {
    Component: ToolSetTime,
    key: "time",
    name: "Set Time Signature",
  },
  {
    Component: ToolNoteEdit,
    key: "notes",
    name: "Insert Notes",
  },
  {
    Component: ToolError,
    key: "error",
    name: null,
  },
];

export interface Props {
  clef: string;
  defaultTool: string;
  keySig: string;
  singleTaskMode: boolean;
  time: string;
  onHide(): void;
  onInsertLy(ly: string): void;
}

export interface State {
  toolKey: string;
}

/**
 * A modal which provides UIs for inserting LilyPond.
 */
export default class Makelily extends React.Component<Props, State> {
  state: State = {
    toolKey: this.props.defaultTool || "clef",
  };

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.warn("Caught error", error, info);
    this.setState({
      toolKey: "error",
    });
  }

  componentDidMount(): void {
    document.addEventListener("keydown", this.handleDocumentKeyDown);
  }

  componentWillUnmount(): void {
    document.removeEventListener("keydown", this.handleDocumentKeyDown);
  }

  render(): JSX.Element {
    const modeElements: JSX.Element[] = modes
      .filter((mode: InsertMode) => mode.name !== null)
      .map((mode: InsertMode, i: number) => {
        const className: string = cn(
          styles.modeItem,
          i + 1 === modes.length && styles.modeItemLast,
          mode.key === this.state.toolKey && styles.modeItemSelected,
        );

        return (
          <li
            className={className}
            onClick={(): void => this.setState({ toolKey: mode.key })}
            role="button"
            key={mode.key}
          >
            {mode.name}
          </li>
        );
      });

    const activeMode: InsertMode = modes.find(
      (mode: InsertMode) => mode.key === this.state.toolKey,
    );
    const Tool: React.ComponentType<ToolProps> = activeMode
      ? activeMode.Component
      : ToolNotFound;

    let bar: JSX.Element | null;
    if (!this.props.singleTaskMode) {
      bar = (
        <div className={cn(styles.modeBar)}>
          <h2 className={cn(styles.heading)}>LilyPond Tools</h2>
          <ul className={cn(styles.modeList)}>{modeElements}</ul>
        </div>
      );
    }

    const contentClass: string = cn(
      styles.content,
      this.props.singleTaskMode && styles.contentNoBar,
    );

    return (
      <span>
        <div
          role="button"
          aria-label="close"
          className={cn(styles.modalBg)}
          onClick={this.props.onHide}
        />
        <div className={cn(styles.modal)}>
          {bar}
          <div className={contentClass}>
            <Tool
              clef={parseClef(this.props.clef)}
              keySig={parseKeySig(this.props.keySig)}
              time={parseTime(this.props.time)}
              onInsertLy={this.props.onInsertLy}
            />
          </div>
          <a
            href="#"
            onClick={this.props.onHide}
            role="button"
            className={cn(styles.close)}
          >
            {"\u00d7"}
          </a>
        </div>
      </span>
    );
  }

  private handleDocumentKeyDown = (e: KeyboardEvent): void => {
    if (e.keyCode === 27) {
      e.preventDefault();
      this.props.onHide();
    }
  };
}

const styles = {
  close:
    "text-[#6e6e6e] text-[22px] absolute right-[15px] no-underline top-[22px] hover:text-black",
  content: "absolute inset-y-0 left-[180px] right-0",
  contentNoBar: "left-0",
  heading: "cursor-default text-[18px] mb-0 mt-2 pb-4 pl-4 pt-4",
  modal:
    "bg-white border border-solid border-[grey] rounded-[4px] h-[600px] left-[calc(50%-1020px/2)] overflow-hidden fixed top-[calc((50%-600px/2)*2/3)] w-[1020px] z-[1001]",
  modalBg: "bg-black absolute inset-0 cursor-pointer opacity-40 fixed z-[1000]",
  modeBar: "bg-[#F6F7F7] absolute inset-y-0 left-0 w-[180px]",
  modeItem:
    "border-t border-[#D6D8DA] cursor-pointer text-[15px] px-4 py-2 hover:underline",
  modeItemLast: "border-b border-[#D6D8DA]",
  modeItemSelected:
    "cursor-default font-bold hover:text-black hover:no-underline",
  modeList: "list-none m-0 p-0",
} as const;
