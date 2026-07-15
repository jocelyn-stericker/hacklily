// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { redirect, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { QueryProps } from "#/components/App";
import { useColourScheme } from "#/components/useColourScheme";
import type { Auth } from "#/lib/auth";
import { parseAuth } from "#/lib/auth";
import {
  editSong,
  getDirtySongs,
  getHideUnstableNotification,
  markSongClean,
  setHideUnstableNotification,
  subscribeToLocalStorage,
} from "#/lib/localStorage";
import { parseQuery, toQueryString } from "#/lib/queryString";

/**
 * Validate + normalize the URL search params (with a hash fallback for long
 * URLs, used by ?src=) into a typed QueryProps object.
 *
 * Shared by every Hacklily route (/ and /wasm) so they interpret the URL
 * identically.
 */
export function validateHacklilySearch(
  search: Record<string, string | undefined>,
): QueryProps {
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
}

/**
 * beforeLoad hook shared by every Hacklily route.
 *
 * Handles the return from the GitHub OAuth flow (merging back the query
 * context stashed before the redirect) and tidies the garbage
 * ?src=%3Curl URL that Google sometimes indexes. Should only act on `enter`.
 */
export function hacklilyBeforeLoad({
  search,
  cause,
}: {
  search: QueryProps;
  cause: string;
}): void {
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
}

/**
 * Assemble the non-URL props for <App> from localStorage/sessionStorage and
 * router context. `search` (the validated URL params) is passed in because
 * `Route.useSearch()` is bound to a specific route; the hook itself stays
 * route-agnostic so / and /wasm can share it.
 */
export function useHacklilyAppProps(search: QueryProps) {
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
    subscribeToLocalStorage,
    getDirtySongs,
    () => ({}),
  );
  const auth = getAuth();
  const [csrf, setLatestCsrf] = useState(sessionStorage.csrf || null);
  const hideUnstableNotification = useSyncExternalStore(
    subscribeToLocalStorage,
    getHideUnstableNotification,
    () => false,
  );

  const setAuth = useCallback((newAuth: Auth | null): void => {
    if (!newAuth) {
      delete localStorage.auth;
    } else {
      localStorage.auth = JSON.stringify(newAuth);
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

  return {
    dirtySongs,
    auth,
    csrf,
    colourScheme,
    hideUnstableNotification,
    setQuery,
    editSong,
    markSongClean,
    setAuth,
    setCSRF,
    setHideUnstableNotification,
  };
}

function getAuth(): Auth | null {
  return parseAuth(localStorage.auth);
}
