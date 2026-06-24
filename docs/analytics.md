# Analytics

Braat collects anonymous, cookieless usage stats with
[GoatCounter](https://www.goatcounter.com). The goal is a rough sense of which
features get used — nothing that identifies a visitor. The numbers are public:
**https://stats.braat.app/**. The user-facing disclosure lives at
`/privacy` (`src/routes/privacy.tsx`).

## How it works

Everything goes through `src/lib/analytics.ts` — that's the single source of
truth. It loads GoatCounter's `count.js` and exposes two helpers:

- `trackPageview(path?, title?)` — records a pageview.
- `track(name, title?)` — records an interaction event. `name` is the event
  identifier (GoatCounter requires it not start with `/`).

`initAnalytics()` is called once from `src/client.tsx`. It:

1. No-ops unless `import.meta.env.PROD` (so dev never sends hits; GoatCounter
   ignores `localhost` server-side anyway).
2. Sets `window.goatcounter = { no_onload: true, allow_local: false }` so
   GoatCounter's automatic on-load pageview is disabled — **we** drive
   pageviews, because the app is an SPA and `count.js` would otherwise only fire
   once.
3. Injects `count.js` and flushes any calls that were queued before it loaded.

Pageviews are wired in `client.tsx` via `router.subscribe('onResolved', …)`,
deduped by pathname so re-resolves don't double-count and the initial load
counts exactly once.

## Event model and naming

GoatCounter events have **no properties** — an event is just a name (it reuses
the pageview `path` field; see
[arp242/goatcounter#55](https://github.com/arp242/goatcounter/issues/55)). Any
dimension has to be encoded into the event name, e.g. `practice-voice/af_heart`.
The author's own recommendation is exactly this manual encoding.

Because every distinct name is its own dashboard row, **keep names from a small,
fixed set** — never encode high-cardinality values (raw ids, free text). Slashes
are allowed inside the name (just not as the first character), so we use
`family/value` to group related rows.

### Events currently emitted

Analyzer (`src/routes/index.tsx`): `play`, `pause`, `record-start`,
`import-audio`, `export-audio`.

Practice (`src/routes/practice.tsx`):

- Actions: `practice-session-start`, `practice-take`, `practice-playback`,
  `practice-analyze-take`, `practice-analyze-reference`.
- Reference plays (every path collapses into one family): `practice-reference-play/<voice>`
  and `practice-reference-play/custom` (a pinned take used as the reference).
- Settings changes — which setting changed, not the value:
  `practice-setting-change/{text-size,passage,mode,randomize,auto-advance,voice,play-reference}`.

## Decisions worth knowing

- **No cookie banner.** Cookieless analytics that stores nothing on the device
  needs no consent banner. (Braat _does_ store settings + transcription models
  locally — unrelated to analytics; the `/privacy` page covers that.)
- **Do Not Track / GPC are intentionally ignored.** Their scope is ambiguous,
  almost nobody sets them (so honouring them mostly makes those visitors _more_
  identifiable), and they target cross-site tracking — which this first-party,
  anonymous count isn't. See https://www.arp242.net/dnt.html. Opt-out is any
  content blocker.
- **No audio, ever.** We never send audio or anything derived from a specific
  voice — that would be biometric data.
- **Cross-origin isolation is fine.** The app is COEP `require-corp`. Both
  `gc.zgo.at/count.js` and `stats.braat.app/count` send
  `Cross-Origin-Resource-Policy: cross-origin`, so the standard integration
  loads without a proxy.

## Operational notes

- Dashboard / settings: https://stats.braat.app/ (public dashboard
  enabled). The endpoint and script URL are constants at the top of
  `analytics.ts`.
- Verifying locally: analytics is gated to production builds, so use
  `npm run build && npm run preview` rather than `npm run dev`.
- Migrating off the hosted service later is low-effort: GoatCounter's CSV export
  re-imports into a self-hosted instance, and only the `data-goatcounter`
  endpoint constant changes.
