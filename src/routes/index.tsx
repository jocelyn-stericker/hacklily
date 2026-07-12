/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
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

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useColourScheme } from "#/components/useColourScheme";
import {
  editSong,
  getDirtySongs,
  markSongClean,
  subscribeToDirtySongs,
} from "#/lib/localStorage.ts";

import type { QueryProps } from "../App";
import App from "../App";
import type { Auth } from "../auth";
import { parseAuth } from "../auth";
import { parseQuery, toQueryString } from "../util/queryString";

export const Route = createFileRoute("/")({
  component: HacklilyApp,
  pendingComponent: () => {
    return (
      <div className="App" style={{ zIndex: -2 }}>
        <div className="header" />
        <div className="content" style={{ width: "50%" }}>
          <div className="monaco" />
        </div>
      </div>
    );
  },
  validateSearch: (search: Record<string, string | undefined>): QueryProps => {
    // Also read from hash as fallback for long URLs (src param).
    const hash = window.location.hash.slice(1);
    const hashParams = hash ? parseQuery(hash) : {};

    const rawState = search.state ?? hashParams.state;

    return {
      "404": search["404"] || hashParams["404"],
      about: search.about || hashParams.about,
      code: search.code || hashParams.code,
      edit: search.edit || hashParams.edit,
      saveAs: search.saveAs || hashParams.saveAs,
      src:
        search.src === "<url" || hashParams.src === "<url"
          ? undefined
          : search.src || hashParams.src,
      // Normalized to string (TanStack uses JSON.parse, so this can be a number)
      state: rawState == null ? undefined : String(rawState),
    };
  },
  beforeLoad: ({ search, cause }): void => {
    // Returning from the GitHub OAuth flow
    if (cause !== "enter") {
      return;
    }

    // Google sometimes indexes/send people to ?src=%3Curl (a garbage URL).
    // validateSearch already hides the bogus src from the editor; here we also
    // tidy the URL bar.
    if (parseQuery(window.location.search).src === "<url") {
      throw redirect({ replace: true, search: { ...search } as any, to: "." });
    }

    const savedParams: string | null = sessionStorage.csrfQueryParams;
    if (!search.state || search.state !== sessionStorage.csrf || !savedParams) {
      return;
    }
    let saved: QueryProps;
    try {
      saved = JSON.parse(savedParams);
    } catch {
      delete sessionStorage.csrfQueryParams;
      return;
    }
    delete sessionStorage.csrfQueryParams;
    throw redirect({
      replace: true,
      search: { ...search, ...saved } as any,
      to: ".",
    });
  },
});

function HacklilyApp() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const colourScheme = useColourScheme();

  // Track the last hash value so we can detect hash changes (for the long-URL
  // fallback used by ?src=).
  const lastHashRef = useRef(window.location.hash);

  // Listen for hashchange events (the long-URL fallback uses hash instead of
  // search params) and re-render by navigating in place.
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash !== lastHashRef.current) {
        lastHashRef.current = hash;
        // Re-run validateSearch by navigating to the same location.
        void navigate({ replace: true, to: ".", search: {} as any });
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [navigate]);

  const setQuery = useCallback(
    <K extends keyof QueryProps>(
      updates: Pick<QueryProps, K>,
      replaceState: boolean = false,
    ): void => {
      const currentSearch = search;
      const merged: QueryProps = { ...currentSearch, ...updates };

      // Build the query string and decide whether to use hash fallback.
      const queryString = toQueryString(merged as Record<string, string>);
      const base = window.location.pathname;
      const connector = base.length + queryString.length + 1 > 1024 ? "#" : "?";

      if (connector === "#") {
        // Use hash fallback for long URLs.
        window.location.hash = queryString.length ? `#${queryString}` : "";
        // Navigate to clear search params since we're using hash now.
        void navigate({
          replace: replaceState,
          to: ".",
          search: {} as any,
        });
      } else {
        // Normal case: use search params.
        void navigate({
          replace: replaceState,
          to: ".",
          search: merged as any,
        });
      }
    },
    [navigate, search],
  );

  // Read localStorage state (same as current index.tsx).
  const dirtySongs = useSyncExternalStore(
    subscribeToDirtySongs,
    getDirtySongs,
    () => ({}),
  );
  const auth = getAuth();
  const [csrf, setLatestCsrf] = useState(sessionStorage.csrf || null);
  const hideUnstableNotification = getHideUnstableNotification();

  const setAuth = useCallback((newAuth: Auth | null): void => {
    if (!newAuth) {
      delete localStorage.auth;
    } else {
      localStorage.auth = JSON.stringify(newAuth);
    }
  }, []);

  const setHideUnstableNotification = useCallback((hide: boolean): void => {
    if (hide) {
      localStorage.hideUnstableNotification = true;
    } else {
      delete localStorage.hideUnstableNotification;
    }
  }, []);

  const setCSRF = useCallback(
    (newCSRF: string | null): void => {
      if (!newCSRF) {
        delete sessionStorage.csrf;
        delete sessionStorage.csrfQueryParams;
        setLatestCsrf(null);
      } else {
        sessionStorage.csrf = newCSRF;
        // Stash the user's current query context for OAuth flow.
        const context: QueryProps = { ...search };
        delete context.code;
        delete context.state;
        sessionStorage.csrfQueryParams = JSON.stringify(context);
        setLatestCsrf(newCSRF);
      }
    },
    [search],
  );

  return (
    <App
      {...search}
      dirtySongs={dirtySongs}
      auth={auth}
      csrf={csrf}
      colourScheme={colourScheme}
      hideUnstableNotification={hideUnstableNotification}
      setQuery={setQuery}
      editSong={editSong}
      markSongClean={markSongClean}
      setAuth={setAuth}
      setCSRF={setCSRF}
      setHideUnstableNotification={setHideUnstableNotification}
    />
  );
}

function getAuth(): Auth | null {
  return parseAuth(localStorage.auth);
}

function getHideUnstableNotification(): boolean {
  return localStorage.hideUnstableNotification || false;
}
