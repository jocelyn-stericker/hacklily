// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Cookieless, privacy-first analytics via GoatCounter (https://www.goatcounter.com).
//
// What this collects: per-route pageviews and a small set of interaction
// events (see `track` call sites). GoatCounter stores nothing on the visitor's
// device -- no cookies, no localStorage -- and never retains raw IPs (it derives
// a salted, daily-rotating hash server-side to approximate unique visitors).
// Because nothing is stored on the device, this needs no cookie-consent banner.
// We deliberately collect no audio or anything derived from a specific voice.
//
// The numbers are public: https://stats.braat.app/ (see /privacy).
//
// We deliberately do NOT read Do Not Track / Global Privacy Control. Those
// signals are a poor fit here: their scope is ambiguous, almost nobody sets
// them (so honouring them mostly makes those few visitors *more* identifiable),
// and they were designed against cross-site behavioural tracking -- which this
// first-party, cookieless, anonymous count simply isn't. A visitor who wants to
// opt out can block GoatCounter with any content blocker. See the GoatCounter
// author's reasoning: https://www.arp242.net/dnt.html

const ENDPOINT = 'https://stats.braat.app/count'
const SCRIPT_SRC = 'https://gc.zgo.at/count.js'

interface GoatCounterVars {
  /** Route, or -- with `event: true` -- the event name. Must not start with `/`. */
  path?: string
  title?: string
  referrer?: string
  event?: boolean
}

interface GoatCounter {
  count?: (vars?: GoatCounterVars) => void
  no_onload?: boolean
  allow_local?: boolean
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

// count.js loads async, so calls made before it's ready are queued and flushed
// on load. Once it's ready we go straight through.
let enabled = false
let initialized = false
const pending: GoatCounterVars[] = []

function flush(): void {
  const count = window.goatcounter?.count
  if (!count) return
  for (const vars of pending) count(vars)
  pending.length = 0
}

function send(vars: GoatCounterVars): void {
  if (!enabled) return
  const count = window.goatcounter?.count
  if (count) count(vars)
  else pending.push(vars)
}

/**
 * Load GoatCounter and start counting. Idempotent. No-op in dev (the server
 * ignores localhost hits anyway).
 */
export function initAnalytics(): void {
  if (initialized) return
  initialized = true

  if (!import.meta.env.PROD) return

  enabled = true
  // Take over pageview counting ourselves so SPA route changes are recorded
  // (count.js's automatic on-load pageview would only fire once).
  window.goatcounter = { no_onload: true, allow_local: false }

  const script = document.createElement('script')
  script.async = true
  script.src = SCRIPT_SRC
  script.setAttribute('data-goatcounter', ENDPOINT)
  script.addEventListener('load', flush)
  document.head.appendChild(script)
}

/** Record a pageview. Defaults to the current location. */
export function trackPageview(path?: string, title?: string): void {
  send({
    path: path ?? location.pathname + location.search,
    title: title ?? document.title,
  })
}

/**
 * Record an interaction event. `name` is the event identifier shown in the
 * dashboard (GoatCounter requires it not begin with `/`). Keep names from a
 * small, fixed set -- avoid high-cardinality values like ids -- since every
 * distinct name is its own row.
 */
export function track(name: string, title?: string): void {
  send({ path: name.replace(/^\/+/, ''), title: title ?? name, event: true })
}
