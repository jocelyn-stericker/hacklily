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

import React from 'react';
import ReactDOM from 'react-dom';

import App, { QUERY_PROP_KEYS, QueryProps } from './App';
import { Auth, parseAuth } from './ConnectToGitHub';
import { parseQuery, toQueryString } from './util/queryString';

/**
 * Renders Hacklily, with props set.
 */
function render(): void {
  ReactDOM.render(
    <App
      {...getQueryProps()}
      dirtySongs={getDirtySongs()}
      auth={getAuth()}
      csrf={localStorage.csrf || null}
      setQuery={setQuery}
      editSong={editSong}
      markSongClean={markSongClean}
      setAuth={setAuth}
      setCSRF={setCSRF}
    />,
    document.getElementById('root'),
  );
}

/**
 * Gets query props from the URL.
 */
function getQueryProps(): QueryProps {
  const queryObj: {[key: string]: string} = parseQuery(window.location.search);
  const queryProps: QueryProps = {};
  Object.keys(queryObj).forEach((key: string) => {
    const queryPropIdx: number = (QUERY_PROP_KEYS as string[]).indexOf(key);
    if (queryPropIdx) {
      console.warn(
        `Warning: unknown query property ${key}. ` +
        'Please add it to QUERY_PROP_KEYS in App.tsx.',
      );
    }
    // Note: queryPropKey === key, just typed correctly
    const queryPropKey: keyof QueryProps = QUERY_PROP_KEYS[queryPropIdx];
    queryProps[queryPropKey] = queryObj[key];
  });
  return queryProps;
}

/**
 * Like React's setState, but for the URL query parameters.
 */
function setQuery<K extends keyof QueryProps>(
  queryUpdates: Pick<QueryProps, K>,
  replaceState: boolean = false,
) : void {

  const query: QueryProps = getQueryProps();
  Object.keys(queryUpdates).forEach((key: keyof QueryProps): void => {
    query[key] = queryUpdates[key];
  });

  const base: string = location.href.split('?')[0];
  const queryString: string = toQueryString(query as {[key: string]: string});

  const newUrl: string = queryString.length ? `${base}?${queryString}` : base;

  if (replaceState) {
    history.replaceState(null, '', newUrl);
  } else {
    history.pushState(null, '', newUrl);
  }
  render();
}

function getDirtySongs(): {[key: string]: string} {
  const songs: {[key: string]: string} = {};
  for (let i: number = 0; i < localStorage.length; i = i + 1) {
    const key: string | null = localStorage.key(i);
    if (!key) {
      continue;
    }
    const value: string | null = localStorage.getItem(key);
    if (!value) {
      continue;
    }
    if (key.startsWith('dirtySong::')) {
      songs[key.split('::')[1]] = value;
    }
  }
  return songs;
}

function getAuth(): Auth | null {
  return parseAuth(localStorage.auth);
}

function editSong(song: string, src: string): void {
  localStorage[`dirtySong::${song}`] = src;
  render();
}

function markSongClean(song: string): void {
  delete localStorage[`dirtySong::${song}`];
  render();
}

function setAuth(auth: Auth | null): void {
  if (!auth) {
    delete localStorage.auth;
  } else {
    localStorage.auth = JSON.stringify(auth);
  }
  render();
}

function setCSRF(csrf: string | null): void {
  if (!csrf) {
    delete localStorage.csrf;
  } else {
    localStorage.csrf = csrf;
  }
  render();
}

/*
 * Init Hacklily.
 */
window.addEventListener('popstate', (ev: PopStateEvent): void => {
  render();
});

render();
