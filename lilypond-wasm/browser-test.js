// Headless-Chromium check for a wasm browser bundle.
// Usage: WEBDIR=/path/to/webdir node browser-test.js
//   PAGE=eval-test.html   page to load (default: the Guile eval test)
//   MATCH='guile version' console text that means PASS
// Requires playwright (npm install playwright && npx playwright install chromium).
// oxlint-disable-next-line import/no-commonjs
const { chromium } = require("playwright");
// oxlint-disable-next-line import/no-commonjs
const { spawn } = require("child_process");

const webdir = process.env.WEBDIR;
if (!webdir) {
  console.error("set WEBDIR");
  process.exit(2);
}
const port = process.env.PORT || 8643;
const pageName = process.env.PAGE || "eval-test.html";
const match = process.env.MATCH || "guile version";

void (async () => {
  const server = spawn("python3", ["-m", "http.server", String(port)], {
    cwd: webdir,
  });
  await new Promise((r) => setTimeout(r, 1500));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const lines = [];
  page.on("console", (msg) => {
    lines.push(msg.text());
    console.log("[console]", msg.text());
  });
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));

  let ok = false;
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
  await browser.close();
  server.kill();
  process.exit(ok ? 0 : 1);
})();
