/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
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

import { css, StyleSheet } from "aphrodite";
import React from "react";

import Makelily from "./Makelily";

/**
 * Properties derived from URL.
 *
 * e.g., https://www.hacklily.org/makelily?clef=blah =>
 *   {
 *     clef: "blah",
 *   }
 *
 * NOTE: When you add a key here, also add it to QUERY_PROP_KEYS below.
 */
export interface QueryProps {
  clef?: string;
  defaultTool?: string;
  keySig?: string;
  singleTaskMode?: boolean;
  time?: string;
}

export const QUERY_PROP_KEYS: (keyof QueryProps)[] = [
  "clef",
  "defaultTool",
  "keySig",
  "singleTaskMode",
  "time",
];

export interface Props extends QueryProps {
  /**
   * Updates a field in the URL query.
   */
  setQuery<K extends keyof QueryProps>(
    updates: Pick<QueryProps, K>,
    replaceState?: boolean,
  ): void;
}

type ChgEv = React.ChangeEvent<HTMLInputElement>;

/**
 * This renders a SPA which demos the makelily modal.
 */
export default class App extends React.Component<Props> {
  render(): JSX.Element {
    const {
      clef,
      defaultTool,
      keySig,
      singleTaskMode,
      setQuery,
      time,
    } = this.props;

    return (
      <div className={css(styles.appRoot)}>
        <div className={css(styles.mockPreview)} />
        <div className={css(styles.mockHeader)} />
        <div className={css(styles.presets)}>
          Makelily sandbox.
          {" \u00a0"}
          \clef{" "}
          <input
            onChange={(ev: ChgEv): void =>
              setQuery({ clef: ev.target.value }, true)
            }
            value={clef || ""}
          />{" "}
          \key{" "}
          <input
            onChange={(ev: ChgEv): void =>
              setQuery({ keySig: ev.target.value }, true)
            }
            value={keySig || ""}
          />{" "}
          \time{" "}
          <input
            onChange={(ev: ChgEv): void =>
              setQuery({ time: ev.target.value }, true)
            }
            value={time || ""}
          />{" "}
          <input
            id="single-task-mode"
            onChange={(ev: ChgEv): void =>
              setQuery({ singleTaskMode: ev.target.checked }, true)
            }
            type="checkbox"
            checked={String(singleTaskMode) === "true"}
            aria-checked={singleTaskMode}
          />
          <label htmlFor="single-task-mode">Single task mode</label> default
          tool{" "}
          <input
            onChange={(ev: ChgEv): void =>
              setQuery({ defaultTool: ev.target.value }, true)
            }
            value={defaultTool || ""}
          />
        </div>
        <Makelily
          clef={clef || ""}
          defaultTool={defaultTool || ""}
          keySig={keySig || ""}
          time={time || ""}
          singleTaskMode={String(singleTaskMode) === "true"}
          onHide={(): void => window.location.reload()}
          onInsertLy={this.handleInsertLy}
        />
      </div>
    );
  }

  private handleInsertLy(ly: string): void {
    console.log(ly);
  }
}

const styles = StyleSheet.create({
  appRoot: {
    backgroundColor: "#1e1e1e",
    height: "100%",
    width: "100%",
  },
  mockHeader: {
    backgroundColor: "#efefef",
    borderBottom: "1px solid #000",
    height: 50,
    position: "absolute",
    top: 0,
    width: "100%",
  },
  mockPreview: {
    backgroundColor: "white",
    height: "100%",
    position: "absolute",
    right: 0,
    width: "50%",
  },
  presets: {
    color: "black",
    fontFamily: "monospace",
    left: 20,
    position: "absolute",
    top: 15,
    zIndex: 90000,
  },
});
