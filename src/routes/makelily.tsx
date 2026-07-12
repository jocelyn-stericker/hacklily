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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import Makelily from "#/components/Makelily";

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
  singleTaskMode?: string;
  time?: string;
}

export const QUERY_PROP_KEYS: (keyof QueryProps)[] = [
  "clef",
  "defaultTool",
  "keySig",
  "singleTaskMode",
  "time",
];

export const Route = createFileRoute("/makelily")({
  component: MakelilyRoute,
  validateSearch: (search: Record<string, string | undefined>): QueryProps => ({
    clef: search.clef,
    defaultTool: search.defaultTool,
    keySig: search.keySig,
    singleTaskMode: search.singleTaskMode === "true" ? "true" : "false",
    time: search.time,
  }),
});

type ChgEv = React.ChangeEvent<HTMLInputElement>;

/**
 * This renders a SPA which demos the makelily modal.
 */
function MakelilyRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const setQuery = useCallback(
    <K extends keyof QueryProps>(
      updates: Pick<QueryProps, K>,
      replaceState: boolean = false,
    ): void => {
      void navigate({
        replace: replaceState,
        to: ".",
        search: { ...search, ...updates },
      });
    },
    [navigate, search],
  );

  const { clef, defaultTool, keySig, singleTaskMode, time } = search;

  const handleInsertLy = useCallback(function handleInsertLy(ly: string): void {
    console.log(ly);
  }, []);

  return (
    <div className="bg-[#1e1e1e] h-full w-full">
      <div className="bg-white h-full absolute right-0 w-1/2" />
      <div className="bg-[#efefef] border-b border-black h-12.5 absolute top-0 w-full" />
      <div className="text-black font-mono left-5 absolute top-3.75 z-90000">
        Makelily sandbox.
        {" \u00a0"}
        \clef{" "}
        <input
          className="border border-foreground"
          onChange={(ev: ChgEv): void =>
            setQuery({ clef: ev.target.value }, true)
          }
          value={clef || ""}
        />{" "}
        \key{" "}
        <input
          className="border border-foreground"
          onChange={(ev: ChgEv): void =>
            setQuery({ keySig: ev.target.value }, true)
          }
          value={keySig || ""}
        />{" "}
        \time{" "}
        <input
          className="border border-foreground"
          onChange={(ev: ChgEv): void =>
            setQuery({ time: ev.target.value }, true)
          }
          value={time || ""}
        />{" "}
        <input
          id="single-task-mode"
          onChange={(ev: ChgEv): void =>
            setQuery(
              { singleTaskMode: ev.target.checked ? "true" : "false" },
              true,
            )
          }
          className="border border-foreground"
          type="checkbox"
          checked={String(singleTaskMode) === "true"}
          aria-checked={singleTaskMode}
        />
        <label htmlFor="single-task-mode">Single task mode</label>:{" "}
        <input
          onChange={(ev: ChgEv): void =>
            setQuery({ defaultTool: ev.target.value }, true)
          }
          className="border border-foreground"
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
        // eslint-disable-next-line @typescript-eslint/unbound-method
        onInsertLy={handleInsertLy}
      />
    </div>
  );
}
