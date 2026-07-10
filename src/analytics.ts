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

import countScriptUrl from "./vendor/goatcounter-count.js?url";

// Cookieless, privacy-first analytics via GoatCounter (https://www.goatcounter.com).
//
// What this collects: a pageview per entry point (the editor, the MusicXML
// importer, the status page) and a small, fixed set of interaction events
// (see the `track` call sites). GoatCounter stores nothing on the visitor's
// device -- no cookies, no localStorage -- and never retains raw IPs (it
// derives a salted, daily-rotating hash server-side to approximate unique
// visitors). Because nothing is stored on the device, this needs no
// cookie-consent banner.
//
// Pageview and event *paths* are always a fixed, generic label (e.g.
// "/", "github/save") -- strip track names and such from URL. Real Hacklily URLs embed
// GitHub usernames, repo names, and filenames (e.g. ?edit=user/repo/song.ly),
// and the dashboard at stats.hacklily.org is public, so sending the actual
// location would leak who's editing what.
//
// We deliberately do NOT read Do Not Track / Global Privacy Control. Those
// signals are a poor fit here: their scope is ambiguous, almost nobody sets
// them (so honouring them mostly makes those few visitors *more*
// identifiable), and they were designed against cross-site behavioural
// tracking -- which this first-party, cookieless, anonymous count simply
// isn't. A visitor who wants to opt out can block GoatCounter with any
// content blocker. See the GoatCounter author's reasoning:
// https://www.arp242.net/dnt.html
//
// count.js is vendored (src/vendor/goatcounter-count.js, copied verbatim from
// https://github.com/arp242/goatcounter/blob/main/public/count.js under its
// ISC license -- see static/about-javascript.html) and imported here rather
// than loaded from gc.zgo.at, so it (a) doesn't depend on a third-party CDN
// being reachable/unblocked, (b) is covered by the JS license web labels page
// Hacklily already publishes for LibreJS, which a CDN-hosted script wouldn't
// be, and (c) flows through webpack's normal asset pipeline alongside our own
// code. webpack.config.js routes src/vendor/*.js through `asset/resource`
// (skipping babel and minification -- see the comment there) and emits it at
// a fixed, unhashed path (vendor/goatcounter-count.js) so it stays
// byte-identical to upstream and the about-javascript.html link stays valid
// across builds.

const ENDPOINT = "https://stats.hacklily.org/count";

interface GoatCounterVars {
  /** Route, or -- with `event: true` -- the event name. Must not start with `/`. */
  path?: string;
  title?: string;
  referrer?: string;
  event?: boolean;
  /**
   * Skip session deduplication so every call is its own hit. Without it,
   * GoatCounter counts at most one hit per path per 8-hour session, so
   * repeated events collapse to a unique-visitor count. We set this on all
   * events (we want totals) but not pageviews (where per-session visits are
   * what we want).
   */
  no_session?: boolean;
}

interface GoatCounter {
  count?(vars?: GoatCounterVars): void;
  /**
   * Builds the payload count.js sends for a hit. count.js defines this on
   * load; we wrap it (see scrubSensitiveData) to drop fields that would leak
   * the real URL.
   */
  get_data?(vars?: GoatCounterVars): Record<string, unknown>;
  no_onload?: boolean;
  allow_local?: boolean;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

// count.js loads async, so calls made before it's ready are queued and
// flushed on load. Once it's ready we go straight through. The queue is
// bounded: if count.js never loads (blocked by a content blocker, CSP, or an
// offline CDN-less build), events keep arriving -- Preview fires a render
// event per edit -- so an unbounded queue would leak memory over a long
// session. Past the cap we simply drop, since these hits are unrecoverable
// anyway.
const MAX_PENDING = 100;
let enabled = false;
let initialized = false;
const pending: GoatCounterVars[] = [];

function flush(): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const count = window.goatcounter?.count;
  if (!count) {
    return;
  }
  for (const vars of pending) {
    count(vars);
  }
  pending.length = 0;
}

function send(vars: GoatCounterVars): void {
  if (!enabled) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const count = window.goatcounter?.count;
  if (count) {
    count(vars);
  } else if (pending.length < MAX_PENDING) {
    pending.push(vars);
  }
}

// count.js sends the raw query string (`q: location.search`) and referrer on
// every hit, regardless of the fixed, generic `path` we pass -- overriding
// `path` alone does not neutralize them. Hacklily's query string embeds song
// source and GitHub identifiers (?edit=user/repo/song.ly, ?src=<lilypond>),
// and after a full page reload document.referrer is that same URL, so we wrap
// get_data to drop `q` and any same-origin referrer before anything is sent.
// This upholds the guarantee stated above (and in privacy-statement.html) that
// real URLs never leave the browser, without patching the vendored count.js.
function scrubSensitiveData(): void {
  const gc = window.goatcounter;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getData = gc?.get_data;
  if (!gc || !getData) {
    return;
  }
  gc.get_data = (vars) => {
    const data = getData(vars);
    delete data.q;
    if (typeof data.r === "string" && data.r.startsWith(location.origin)) {
      delete data.r;
    }
    return data;
  };
}

/**
 * Load GoatCounter and start counting. Idempotent. No-op outside production
 * builds (the server ignores localhost hits anyway).
 */
export function initAnalytics(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  if (process.env.NODE_ENV !== "production") {
    return;
  }

  enabled = true;
  // We drive pageviews ourselves (see trackPageview call sites) rather than
  // count.js's automatic on-load pageview, both so we control the path we
  // send (never the real, PII-bearing URL) and because some entry points
  // update the query string via history.pushState without a real navigation.
  window.goatcounter = { no_onload: true, allow_local: false };

  const script = document.createElement("script");
  script.async = true;
  script.src = countScriptUrl;
  script.setAttribute("data-goatcounter", ENDPOINT);
  script.addEventListener("load", () => {
    scrubSensitiveData();
    flush();
  });
  document.head.appendChild(script);
}

/**
 * Record a pageview. `path` should be a fixed, generic label like ""
 * -- never the real location, which can embed a GitHub username/repo/file.
 */
export function trackPageview(path: string, title?: string): void {
  send({
    path,
    title: title ?? path,
  });
}

/**
 * Record an interaction event. `name` is the event identifier shown in the
 * dashboard (GoatCounter requires it not begin with `/`). Keep names from a
 * small, fixed set -- avoid high-cardinality values like song ids -- since
 * every distinct name is its own dashboard row.
 *
 * Events use `no_session` so the dashboard shows total occurrences, not just
 * how many sessions performed the action at least once.
 */
export function track(name: string, title?: string): void {
  send({
    path: name.replace(/^\/+/, ""),
    title: title ?? name,
    event: true,
    no_session: true,
  });
}
