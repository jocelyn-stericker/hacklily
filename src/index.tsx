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

import App, { QUERY_PROP_KEYS, QueryProps, Song } from './App';
import { Auth, parseAuth } from './auth';
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
      colourScheme={localStorage.colourScheme || 'vs-dark'}
      setQuery={setQuery}
      editSong={editSong}
      markSongClean={markSongClean}
      setAuth={setAuth}
      setColourScheme={setColourScheme}
      setCSRF={setCSRF}
      isStandalone={process.env.REACT_APP_STANDALONE === 'yes'}
    />,
    document.getElementById('root'),
  );
}

/**
 * Gets query props from the URL.
 */
function getQueryProps(): QueryProps {
  const queryObj: { [key: string]: string } = parseQuery(window.location.search);
  const query: QueryProps = {};
  Object.keys(queryObj).forEach((key: string) => {
    const queryPropIdx: number = (QUERY_PROP_KEYS as string[]).indexOf(key);
    if (queryPropIdx === -1) {
      console.warn(
        `Warning: unknown query property ${key}. ` +
        'Please add it to QUERY_PROP_KEYS in App.tsx.',
      );

      return;
    }
    // Note: queryPropKey === key, just typed correctly
    const queryPropKey: keyof QueryProps = QUERY_PROP_KEYS[queryPropIdx];
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
  (Object.keys(queryUpdates) as (keyof QueryProps)[]).forEach((key: keyof QueryProps): void => {
    if (key in queryUpdates) {
      query[key] = queryUpdates[key];
    }
  });

  const base: string = location.href.split('?')[0];
  const queryString: string = toQueryString(query as { [key: string]: string });

  const newUrl: string = queryString.length ? `${base}?${queryString}` : base;

  if (replaceState) {
    history.replaceState(null, '', newUrl);
  } else {
    history.pushState(null, '', newUrl);
  }
  render();
}

function getDirtySongs(): { [key: string]: Song } {
  const songs: { [key: string]: Song } = {};
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
      songs[key.split('::')[1]] = JSON.parse(value);
    }
  }

  return songs;
}

function getAuth(): Auth | null {
  return parseAuth(localStorage.auth);
}

function editSong(songID: string, song: Song): void {
  localStorage[`dirtySong::${songID}`] = JSON.stringify(song);
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

function setColourScheme(colourScheme: 'vs-dark' | 'vs'): void {
  localStorage.colourScheme = colourScheme;
  document.location.reload();
}

function setCSRF(csrf: string | null): void {
  if (!csrf) {
    delete localStorage.csrf;
    delete localStorage.csrfQueryParams;
  } else {
    localStorage.csrf = csrf;
    localStorage.csrfQueryParams = JSON.stringify(getQueryProps(), null, 2);
  }
  render();
}

/*
 * Init Hacklily.
 */
window.addEventListener('popstate', (ev: PopStateEvent): void => {
  render();
});

// Add back query props during OAuth flow, if needed.
const queryProps: QueryProps = getQueryProps();
if (queryProps.state === localStorage.csrf && localStorage.csrf &&
    localStorage.csrfQueryParams) {
  // no need to render, because setQuery calls render.
  const newQuery: QueryProps = JSON.parse(localStorage.csrfQueryParams);
  setQuery(newQuery, true);
} else {
  render();
}
