/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
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

// http://stackoverflow.com/a/8648962
export function parseQuery(qstr: string): { [key: string]: string } {
  const query: { [key: string]: string } = {};
  const a: string[] = (qstr[0] === '?' ? qstr.substr(1) : qstr).split('&');
  for (const item of a) {
    if (!item) {
      continue;
    }
    const b: string[] = item.split('=');
    query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
  }
  return query;
}

// http://stackoverflow.com/a/5505137
export function toQueryString(obj: {[key: string]: string}): string {
  const parts: string[] = [];
  for (const i of Object.keys(obj)) {
    if (obj[i] !== undefined) {
      parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]));
    }
  }

  return parts.join('&')
    .replace(/%2F/g, '/'); // because we can, and it's less ugly.
}
