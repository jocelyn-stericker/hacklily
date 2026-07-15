// Headless-Chromium check for a wasm browser bundle.
// Usage: WEBDIR=/path/to/webdir node browser-test.js
//   PAGE=eval-test.html   page to load (default: the Guile eval test)
//   MATCH='guile version' console text that means PASS
//   PORT=8643             override the port (default: 0 = OS-chosen ephemeral,
//                         so a leaked server from a previous crashed run can't
//                         collide with this one)
// Requires playwright (npm install playwright && npx playwright install --with-deps chromium).
// oxlint-disable-next-line import/no-commonjs
const { chromium } = require("playwright");
// oxlint-disable-next-line import/no-commonjs
const { spawn } = require("child_process");

const webdir = process.env.WEBDIR;
if (!webdir) {
  console.error("set WEBDIR");
  process.exit(2);
}
// 0 = let the OS pick a free port (parsed from the server's startup line).
// Collisions with a leaked http.server from a prior crashed run are then
// impossible; a fixed PORT only matters if something external needs to reach it.
const wantPort = process.env.PORT ? String(process.env.PORT) : "0";
const pageName = process.env.PAGE || "eval-test.html";
const match = process.env.MATCH || "guile version";

void (async () => {
  const server = spawn(
    "python3",
    // -u: unbuffered stdout so node sees the "Serving HTTP ... port NNNN"
    // line immediately (python block-buffers piped stdout otherwise).
    ["-u", "-m", "http.server", wantPort, "--bind", "127.0.0.1"],
    { cwd: webdir },
  );

  // Always reap the server, even on early exit / unhandled throw — a leaked
  // python holding a port is exactly what makes a *re*-run after a crash fail
  // with ERR_EMPTY_RESPONSE against a half-dead process.
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

  // python prints "Serving HTTP on 127.0.0.1 port NNNN"; the stream differs
  // by version (3.11+ stdout, older stderr), so watch both. Parse the real
  // bound port (equals wantPort when set, OS-chosen when 0).
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
      reject(
        new Error(
          `http.server exited (code ${code}) — bad WEBDIR or port in use?`,
        ),
      );
    });
  });

  let ok = false;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const lines = [];
    page.on("console", (msg) => {
      lines.push(msg.text());
      console.log("[console]", msg.text());
    });
    page.on("pageerror", (err) => console.log("[pageerror]", err.message));

    try {
      await page.goto(`http://localhost:${port}/${pageName}`);
      const msg = await page.waitForEvent("console", {
        predicate: (m) => m.text().includes(match),
        timeout: 120000,
      });
      if (msg.text().includes("FAIL")) throw new Error(msg.text());
      ok = true;
      console.log("BROWSER TEST: PASS");
    } catch (e) {
      console.log("BROWSER TEST: FAIL");
      console.log("collected:", lines.join("\n"));
      console.log(e);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    reap();
  }
  process.exit(ok ? 0 : 1);
})();
