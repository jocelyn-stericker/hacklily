// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

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
