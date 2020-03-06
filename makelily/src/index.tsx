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

import * as React from "react";
import * as ReactDOM from "react-dom";
import App, { QUERY_PROP_KEYS, QueryProps } from "./App";

// http://stackoverflow.com/a/8648962
export function parseQuery(qstr: string): { [key: string]: string } {
  const query: { [key: string]: string } = {};
  const a: string[] = (qstr[0] === "?" ? qstr.substr(1) : qstr).split("&");
  for (const item of a) {
    if (!item) {
      continue;
    }
    const b: string[] = item.split("=");
    query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || "");
  }

  return query;
}

// http://stackoverflow.com/a/5505137
export function toQueryString(obj: { [key: string]: string }): string {
  const parts: string[] = [];
  for (const i of Object.keys(obj)) {
    if (obj[i] !== undefined) {
      parts.push(`${encodeURIComponent(i)}=${encodeURIComponent(obj[i])}`);
    }
  }

  return parts.join("&").replace(/%2F/g, "/"); // because we can, and it's less ugly.
}

/**
 * Renders Hacklily, with props set.
 */
function render(): void {
  ReactDOM.render(
    <App {...getQueryProps()} setQuery={setQuery} />,
    document.getElementById("root"),
  );
}

/**
 * Gets query props from the URL.
 */
function getQueryProps(): QueryProps {
  const queryObj: { [key: string]: string } = parseQuery(
    window.location.search,
  );
  const query: QueryProps = {};
  Object.keys(queryObj).forEach((key: string) => {
    const queryPropIdx: number = (QUERY_PROP_KEYS as string[]).indexOf(key);
    if (queryPropIdx === -1) {
      console.warn(
        `Warning: unknown query property ${key}. ` +
          "Please add it to QUERY_PROP_KEYS in App.tsx.",
      );

      return;
    }
    // Note: queryPropKey === key, just typed correctly
    const queryPropKey: keyof QueryProps = QUERY_PROP_KEYS[queryPropIdx];
    // @ts-ignore
    query[queryPropKey] = queryObj[key];
  });

  return query;
}

/**
 * Like React's setState, but for the URL query parameters.
 */
function setQuery(
  queryUpdates: Pick<QueryProps, keyof QueryProps>,
  replaceState: boolean = false,
): void {
  const query: QueryProps = getQueryProps();
  Object.keys(queryUpdates).forEach((key: keyof QueryProps): void => {
    if (key in queryUpdates) {
      // @ts-ignore
      query[key] = queryUpdates[key];
    }
  });

  const base: string = location.href.split("?")[0];
  const queryString: string = toQueryString(query as { [key: string]: string });

  const newUrl: string = queryString.length ? `${base}?${queryString}` : base;

  if (replaceState) {
    history.replaceState(null, "", newUrl);
  } else {
    history.pushState(null, "", newUrl);
  }
  render();
}

/*
 * Init Hacklily.
 */
window.addEventListener("popstate", (_ev: PopStateEvent): void => {
  render();
});

render();
