// Crash-containment test for a wasm segfault in the warm worker.
// Usage: WEBDIR=/path/to/webdir node crash-test.js
//   PORT=8644            override the port (default 0 = OS-chosen ephemeral)
// Requires playwright (npm install playwright && npx playwright install --with-deps chromium).
//
// A real wasm trap (out-of-bounds memory access from an FFI pointer deref)
// crashes the renderer, so unlike browser-test.js (one page that checks its
// own console) this test drives TWO pages: page1 dispatches the segfault and
// is expected to crash; page2 (a fresh renderer/worker) must still render a
// clean score — proving the crash was contained to page1 and the browser
// recovers.  Prints "LILY CRASH: PASS" / "LILY CRASH: FAIL".
// oxlint-disable-next-line import/no-commonjs
const { chromium } = require("playwright");
// oxlint-disable-next-line import/no-commonjs
const { spawn } = require("child_process");

const webdir = process.env.WEBDIR;
if (!webdir) {
  console.error("set WEBDIR");
  process.exit(2);
}
const wantPort = process.env.PORT ? String(process.env.PORT) : "0";

void (async () => {
  process.on("unhandledRejection", (e) =>
    console.log("[unhandledRejection]", (e && e.message) || e),
  );
  const server = spawn(
    "python3",
    ["-u", "-m", "http.server", wantPort, "--bind", "127.0.0.1"],
    { cwd: webdir },
  );
  const reap = () => {
    try {
      server.kill();
    } catch {
      /* already dead */
    }
  };
  process.on("exit", reap);
  process.on("SIGTERM", () => {
    reap();
    process.exit(1);
  });
  process.on("SIGINT", () => {
    reap();
    process.exit(1);
  });

  const port = await new Promise((resolve, reject) => {
    const to = setTimeout(
      () => reject(new Error("http.server did not report a port")),
      10000,
    );
    const ondata = (d) => {
      const m = d.toString().match(/port (\d+)/);
      if (m) {
        clearTimeout(to);
        resolve(Number(m[1]));
      }
    };
    server.stdout.on("data", ondata);
    server.stderr.on("data", ondata);
    server.on("exit", (code) => {
      clearTimeout(to);
      reject(new Error(`http.server exited (code ${code})`));
    });
  });

  let ok = false;
  let browser;
  try {
    browser = await chromium.launch();
    console.log("LILY CRASH: launched");

    // --- page1: dispatch the segfault, expect the renderer to crash -------
    const page1 = await browser.newPage();
    let crashed = false;
    page1.on("crash", () => {
      crashed = true;
    });
    page1.on("pageerror", (err) =>
      console.log("[page1 pageerror]", err.message),
    );
    page1.on("console", (msg) => console.log("[page1 console]", msg.text()));
    // The renderer may crash *during* navigation (the worker traps shortly
    // after load), so goto / waitForFunction can reject with "Target crashed" —
    // that itself is the crash signal, not an error to abort on.
    try {
      await page1.goto(`http://localhost:${port}/lily-crash.html`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (e) {
      console.log("[page1 goto]", e.message);
    }
    // Confirm the segfault render was actually dispatched before the crash.
    await page1
      .waitForFunction(() => window.__sent, { timeout: 10000 })
      .catch(() => {});
    // Wait up to 20s for the wasm OOB trap to crash the renderer.  We rely
    // on playwright's `crash` event rather than polling page.evaluate,
    // because a crashed renderer can leave evaluate hanging instead of
    // rejecting — the event + a hard timeout guarantees termination.
    if (!crashed) {
      await new Promise((resolve) => {
        const to = setTimeout(resolve, 20000);
        page1.once("crash", () => {
          clearTimeout(to);
          resolve();
        });
      });
    }
    console.log(`page1 crashed=${crashed}`);
    try {
      await page1.close();
    } catch {
      /* already gone */
    }
    if (!crashed) throw new Error("segfault did not crash page1 renderer");

    // --- page2: a FRESH renderer/worker must render cleanly ---------------
    // The crash must be contained to page1; the browser process and a new
    // renderer survive, so a clean score still engraves.
    const page2 = await browser.newPage();
    page2.on("console", (msg) => console.log("[page2 console]", msg.text()));
    page2.on("pageerror", (err) =>
      console.log("[page2 pageerror]", err.message),
    );
    await page2.goto(`http://localhost:${port}/lily-browser.html`);
    const msg = await page2.waitForEvent("console", {
      predicate: (m) => m.text().includes("LILY BROWSER:"),
      timeout: 120000,
    });
    if (msg.text().includes("FAIL")) throw new Error(msg.text());
    console.log("LILY CRASH: PASS");
    ok = true;
  } catch (e) {
    console.log("LILY CRASH: FAIL");
    console.log(e && e.message ? e.message : e);
  } finally {
    if (browser) await browser.close().catch(() => {});
    reap();
  }
  process.exit(ok ? 0 : 1);
})();
