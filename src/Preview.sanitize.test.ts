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
