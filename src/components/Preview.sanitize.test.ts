/**
 * Regression coverage for the DOMPurify sanitization path in Preview.tsx.
 *
 * Hacklily receives LilyPond's SVG output from the backend and injects it into
 * the preview iframe via `root.innerHTML = DOMPurify.sanitize(files.join(""), {
 *   ALLOW_UNKNOWN_PROTOCOLS: true,
 *   ADD_TAGS: ["use"],
 *   ADD_ATTR: ["pointer-events"],
 * })`. Additionally a module-level uponSanitizeAttribute hook strips any
 * href/xlink:href on <use> that isn't a #fragment.
 *
 * This test locks in the behaviors that matter for rendering so a future
 * DOMPurify bump or config change can't silently regress them:
 *
 *  1. LilyPond 2.26+ emits a <style> block whose CSS rule
 *     `tspan { white-space: pre; }` keeps multi-space text/lyrics aligned. The
 *     CDATA wrapper is dropped by DOMPurify (harmless), but the CSS rule must
 *     survive or lyrics collapse.
 *  2. The SVG body (notes, lines, glyphs) is preserved.
 *  3. LilyPond's `textedit:` note-click links survive (ALLOW_UNKNOWN_PROTOCOLS)
 *     so the editor can jump to the clicked note.
 *  4. LilyPond's `<use>` glyph references are preserved (ADD_TAGS).
 *  5. `pointer-events="all"` passes through (ADD_ATTR).
 *  6. Dangerous content DOMPurify must strip is stripped (<script>, event
 *     handlers, javascript: URIs, external https: on <use>), so the iframe
 *     (which is NOT sandboxed) stays safe.
 *
 * The `sanitizeSvg`-prefixed path adds:
 *  7. All `id` values get a controllable prefix for collision isolation.
 *  8. `<use>` fragment references are prefixed to match renamed ids.
 *  9. `url(#…)` references (clip-path, fill, mask, etc.) are prefixed.
 * 10. Per-page prefixing keeps multi-page score IDs isolated.
 * 11. The security hook (non-fragment use hrefs stripped) still fires
 *     before the prefix hook, so dangerous URIs are removed regardless.
 */

import DOMPurify from "dompurify";

// A representative slice of LilyPond 2.26+ SVG output: the <style>/CDATA
// whitespace rule plus a note glyph carrying a textedit: link.
const LILYPOND_SVG_226 = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.2" width="210.00mm" height="297.00mm" viewBox="0 0 119 169">
<style type="text/css">
<![CDATA[
tspan { white-space: pre; }
]]>
</style>
<a xlink:href="textedit:///tmp/hacklily.ly:2:1:3">
<g transform="translate(17.0717, 11.6906)">
<line stroke-linejoin="round" stroke-linecap="round" stroke-width="0.1000" stroke="currentColor" x1="0.0500" y1="0" x2="11.5372" y2="0"/>
</g>
</a>
<text><tspan>four  spaces  here</tspan></text>
</svg>`;

// The config Preview.tsx uses. Keep this in sync with src/Preview.tsx.
const PREVIEW_CONFIG = {
  ALLOW_UNKNOWN_PROTOCOLS: true,
  ADD_TAGS: ["use"],
  ADD_ATTR: ["pointer-events"] as string[],
};

// The module-level hook Preview.tsx registers: strip non-fragment href on use.
beforeAll(() => {
  DOMPurify.addHook(
    "uponSanitizeAttribute",
    function hacklily_use_fragment_only(node, hookEvent) {
      if (
        node.nodeName?.toLowerCase() === "use" &&
        (hookEvent.attrName === "href" || hookEvent.attrName === "xlink:href")
      ) {
        if (!hookEvent.attrValue.startsWith("#")) {
          hookEvent.keepAttr = false;
        }
      }
    },
  );
});

function sanitize(dirty: string): string {
  return DOMPurify.sanitize(dirty, PREVIEW_CONFIG);
}

describe("Preview DOMPurify sanitization", () => {
  test("preserves the LilyPond <style>/tspan white-space:pre rule", () => {
    const clean = sanitize(LILYPOND_SVG_226);
    // The CDATA markers are dropped by DOMPurify, but the <style> element and
    // the CSS rule must survive so multi-space lyrics keep their spacing.
    expect(clean).toContain("<style");
    expect(clean).toContain("tspan");
    expect(clean.toLowerCase()).toContain("white-space: pre");
  });

  test("preserves the SVG body (notes, lines, glyphs)", () => {
    const clean = sanitize(LILYPOND_SVG_226);
    expect(clean).toContain("<svg");
    expect(clean).toContain("</svg>");
    expect(clean).toContain("stroke-linejoin");
    expect(clean).toContain("currentColor");
  });

  test("preserves LilyPond textedit: note-click links", () => {
    const clean = sanitize(LILYPOND_SVG_226);
    // The editor's note-click handler reads xlink:href="textedit://...".
    expect(clean).toContain("textedit:");
    expect(clean).toContain("xlink:href");
  });

  test("preserves multi-space text content", () => {
    const clean = sanitize(LILYPOND_SVG_226);
    // The spaces in <tspan>four  spaces  here</tspan> must not be collapsed by
    // sanitization (the surviving white-space:pre rule then keeps them aligned
    // at render time).
    expect(clean).toContain("four  spaces  here");
  });

  test("strips <script> elements", () => {
    const dirty =
      LILYPOND_SVG_226 +
      `<script>alert("xss")</script><img src=x onerror="alert(1)">`;
    const clean = sanitize(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert");
    expect(clean.toLowerCase()).not.toContain("onerror");
  });

  test("strips inline event handlers", () => {
    const dirty = `<svg onload="alert(1)"><g onclick="alert(2)"><line x1="0" y1="0" x2="1" y2="0"/></g></svg>`;
    const clean = sanitize(dirty);
    expect(clean.toLowerCase()).not.toContain("onload");
    expect(clean.toLowerCase()).not.toContain("onclick");
    // The svg/line content is preserved.
    expect(clean).toContain("<svg");
    expect(clean).toContain("<line");
  });

  test("strips javascript: URIs", () => {
    const dirty = `<svg><a xlink:href="javascript:alert(1)"><rect width="1" height="1"/></a></svg>`;
    const clean = sanitize(dirty);
    expect(clean.toLowerCase()).not.toContain("javascript:");
    // But the textedit: protocol is kept via ALLOWED_URI_REGEXP.
    expect(sanitize(LILYPOND_SVG_226)).toContain("textedit:");
  });

  test("preserves <use> with #fragment hrefs", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="note"><circle cx="0" cy="0" r="3"/></g></defs><use href="#note"/></svg>`;
    const clean = sanitize(dirty);
    expect(clean).toContain("<use");
    expect(clean).toContain('href="#note"');
  });

  test("preserves <use> with xlink:href #fragments", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#glyph"/></svg>`;
    const clean = sanitize(dirty);
    expect(clean).toContain("<use");
    expect(clean).toContain('xlink:href="#glyph"');
  });

  test("strips external https: href on <use>", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.com/track.svg"/></svg>`;
    const clean = sanitize(dirty);
    expect(clean).toContain("<use");
    // The href attribute must be removed because https: doesn't match
    // the ALLOWED_URI_REGEXP.
    expect(clean).not.toContain("https://");
    expect(clean).not.toContain('href="');
  });

  test("strips javascript: href on <use>", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg"><use href="javascript:alert(1)"/></svg>`;
    const clean = sanitize(dirty);
    expect(clean).toContain("<use");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain('href="');
  });

  test("preserves pointer-events attribute", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg"><g pointer-events="all"><circle cx="5" cy="5" r="3"/></g></svg>`;
    const clean = sanitize(dirty);
    expect(clean).toContain('pointer-events="all"');
  });

  test("strips pointer-events when ADD_ATTR is removed (safety net)", () => {
    // Double-check that pointer-events is not in DOMPurify's default SVG attrs
    const clean = DOMPurify.sanitize(
      `<svg xmlns="http://www.w3.org/2000/svg"><g pointer-events="all"><circle cx="5" cy="5" r="3"/></g></svg>`,
    );
    expect(clean.toLowerCase()).not.toContain("pointer-events");
  });
});

// ─────────────────────────────────────────────────────────────
// ID-prefix sanitization
// ─────────────────────────────────────────────────────────────
/* eslint-disable import/first */

// Replicates the per-call hook setup in Preview.tsx's sanitizeSvg() so the
// real production code path is exercised, not a test double.

import { sanitizeSvg } from "./Preview";

describe("sanitizeSvg ID prefixing", () => {
  test("prefixes id attributes", () => {
    const dirty = `<svg><g id="note"/></svg>`;
    const clean = sanitizeSvg(dirty, "p1-");
    expect(clean).toContain('id="p1-note"');
  });

  test("prefixes <use href=#fragment> references", () => {
    const dirty = `<svg><use href="#glyph-0"/></svg>`;
    const clean = sanitizeSvg(dirty, "x-");
    expect(clean).toContain('href="#x-glyph-0"');
  });

  test("prefixes <use xlink:href=#fragment> references", () => {
    const dirty = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#glyph-0"/></svg>`;
    const clean = sanitizeSvg(dirty, "x-");
    expect(clean).toContain('xlink:href="#x-glyph-0"');
  });

  test("does not double-prefix already-prefixed ids", () => {
    const dirty = `<svg><g id="p1-note"/></svg>`;
    const clean = sanitizeSvg(dirty, "p1-");
    // Count occurrences — should be exactly one "p1-" before note.
    expect(clean).toContain('id="p1-note"');
    expect(clean).not.toContain('id="p1-p1-note"');
  });

  test("prefixes url(#…) in styling attributes", () => {
    const dirty = `<svg><path clip-path="url(#clip1)" fill="url(#grad1)"/></svg>`;
    const clean = sanitizeSvg(dirty, "r-");
    expect(clean).toContain('clip-path="url(#r-clip1)"');
    expect(clean).toContain('fill="url(#r-grad1)"');
  });

  test("prefixes url(#…) in inline style", () => {
    const dirty = `<svg><path style="clip-path: url(#clip2); fill: url(#g2)"/></svg>`;
    const clean = sanitizeSvg(dirty, "s-");
    expect(clean).toContain("clip-path: url(#s-clip2)");
    expect(clean).toContain("fill: url(#s-g2)");
  });

  test("still strips non-fragment href on <use> (security hook fires first)", () => {
    const dirty = `<svg><use href="javascript:alert(1)"/></svg>`;
    const clean = sanitizeSvg(dirty, "p-");
    expect(clean).toContain("<use");
    expect(clean.toLowerCase()).not.toContain("javascript:");
    expect(clean).not.toContain('href="');
  });

  test("prefix is controllable — different prefixes produce different output", () => {
    const dirty = `<svg><defs><g id="glyph"/></defs><use href="#glyph"/></svg>`;
    const a = sanitizeSvg(dirty, "a-");
    const b = sanitizeSvg(dirty, "b-");
    expect(a).toContain('id="a-glyph"');
    expect(a).toContain('href="#a-glyph"');
    expect(b).toContain('id="b-glyph"');
    expect(b).toContain('href="#b-glyph"');
    expect(a).not.toContain('href="#b-glyph"');
    expect(b).not.toContain('href="#a-glyph"');
  });

  test("does not prefix non-fragment URI attributes (textedit: survives)", () => {
    const dirty = `<svg><a xlink:href="textedit:///tmp/hacklily.ly:2:1:3"><rect/></a></svg>`;
    const clean = sanitizeSvg(dirty, "p-");
    expect(clean).toContain("textedit:");
    // The xlink:href value starts with "textedit:", not "#" — no prefix added.
    expect(clean).toContain('xlink:href="textedit:///tmp/hacklily.ly:2:1:3"');
  });

  test("per-page prefixes isolate pages in a multi-page score", () => {
    const page1 = `<svg><defs><g id="glyph-0"/></defs><use href="#glyph-0"/></svg>`;
    const page2 = `<svg><defs><g id="glyph-0"/></defs><use href="#glyph-0"/></svg>`;
    const prefixed1 = sanitizeSvg(page1, "r-pg0-");
    const prefixed2 = sanitizeSvg(page2, "r-pg1-");
    // Each page's IDs are isolated from the other.
    expect(prefixed1).toContain('id="r-pg0-glyph-0"');
    expect(prefixed1).toContain('href="#r-pg0-glyph-0"');
    expect(prefixed2).toContain('id="r-pg1-glyph-0"');
    expect(prefixed2).toContain('href="#r-pg1-glyph-0"');
    // Neither page references the other's prefixed id.
    expect(prefixed1).not.toContain('href="#r-pg1-');
    expect(prefixed2).not.toContain('href="#r-pg0-');
  });

  test("prefix hook does not leak between sanitizeSvg calls", () => {
    // The hook is registered and removed per call.  This call should not
    // affect a subsequent ordinary sanitize.
    sanitizeSvg(`<svg><g id="tmp"/></svg>`, "leak-");
    const clean = DOMPurify.sanitize(
      `<svg><g id="tmp"/></svg>`,
      PREVIEW_CONFIG,
    );
    expect(clean).toContain('id="tmp"');
    expect(clean).not.toContain('id="leak-');
  });
});
