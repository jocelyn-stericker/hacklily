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

// The module keeps process-wide state (queue, "initialized" latch), so each
// test loads a fresh copy via jest.resetModules() + a fresh require().
function freshModule(): typeof import("./analytics") {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./analytics");
}

// count.js is never actually loaded in tests; simulate it becoming ready by
// assigning window.goatcounter.count and firing the script's load event.
function simulateCountJsLoaded(count: (vars: unknown) => void): void {
  window.goatcounter!.count = count;
  document.head
    .querySelector("script[data-goatcounter]")!
    .dispatchEvent(new Event("load"));
}

describe("analytics", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    document.head.innerHTML = "";
    delete (window as { goatcounter?: unknown }).goatcounter;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("queues events fired before count.js loads, then flushes them", () => {
    process.env.NODE_ENV = "production";
    const { initAnalytics, track } = freshModule();
    initAnalytics();

    // count.js not ready yet -> the event must be buffered, not dropped.
    track("render/stable");
    const count = jest.fn();
    simulateCountJsLoaded(count);

    expect(count).toHaveBeenCalledWith({
      path: "render/stable",
      title: "render/stable",
      event: true,
      no_session: true,
    });
  });

  it("sends straight through once count.js is ready", () => {
    process.env.NODE_ENV = "production";
    const { initAnalytics, track, trackPageview } = freshModule();
    initAnalytics();
    const count = jest.fn();
    simulateCountJsLoaded(count);

    track("midi-playback");
    trackPageview("/editor", "Hacklily");

    expect(count).toHaveBeenNthCalledWith(1, {
      path: "midi-playback",
      title: "midi-playback",
      event: true,
      no_session: true,
    });
    // Pageviews stay session-based (no no_session), so per-session visits are
    // counted rather than every navigation.
    expect(count).toHaveBeenNthCalledWith(2, {
      path: "/editor",
      title: "Hacklily",
    });
  });

  it("strips a leading slash from event names (GoatCounter rejects it)", () => {
    process.env.NODE_ENV = "production";
    const { initAnalytics, track } = freshModule();
    initAnalytics();
    const count = jest.fn();
    simulateCountJsLoaded(count);

    track("/github/save");

    expect(count).toHaveBeenCalledWith({
      path: "github/save",
      title: "/github/save",
      event: true,
      no_session: true,
    });
  });

  it("strips the query string and same-origin referrer from every hit", () => {
    process.env.NODE_ENV = "production";
    const { initAnalytics } = freshModule();
    initAnalytics();

    // Simulate count.js installing its get_data, which unconditionally puts
    // location.search in `q` and a referrer in `r`; echo the referrer we pass
    // so we can exercise same-origin vs external.
    window.goatcounter!.get_data = (vars) => ({
      p: "/editor",
      q: "?edit=user/repo/song.ly",
      r: vars?.referrer,
      s: 1920,
    });
    window.goatcounter!.count = jest.fn();
    document.head
      .querySelector("script[data-goatcounter]")!
      .dispatchEvent(new Event("load"));
    const getData = window.goatcounter!.get_data!;

    // The wrapper drops `q` (real, PII-bearing URL) and a same-origin referrer
    // (which after a full reload is that same URL) but keeps everything else.
    const sameOrigin = getData({
      referrer: `${location.origin}/?edit=user/repo/song.ly`,
    });
    expect(sameOrigin).not.toHaveProperty("q");
    expect(sameOrigin).not.toHaveProperty("r");
    expect(sameOrigin).toHaveProperty("s", 1920);

    // A genuine external referrer is analytics-relevant and not ours to
    // scrub, so it survives.
    const external = getData({ referrer: "https://example.com/" });
    expect(external).toHaveProperty("r", "https://example.com/");
  });

  it("does nothing outside production builds", () => {
    process.env.NODE_ENV = "test";
    const { initAnalytics, track } = freshModule();
    initAnalytics();
    track("render/stable");

    // No script injected and no global created -- fully inert.
    expect(document.head.querySelector("script[data-goatcounter]")).toBeNull();
    expect((window as { goatcounter?: unknown }).goatcounter).toBeUndefined();
  });
});
