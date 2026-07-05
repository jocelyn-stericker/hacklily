// Headless-Chromium check for the Guile.wasm browser bundle.
// Usage: WEBDIR=/path/to/dir-with-eval-test.html node browser-test.js
// Requires playwright (npm install playwright && npx playwright install chromium).
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const webdir = process.env.WEBDIR;
if (!webdir) { console.error('set WEBDIR'); process.exit(2); }
const port = process.env.PORT || 8643;

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(port)], { cwd: webdir });
  await new Promise((r) => setTimeout(r, 1500));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const lines = [];
  page.on('console', (msg) => { lines.push(msg.text()); console.log('[console]', msg.text()); });
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  let ok = false;
  try {
    await page.goto(`http://localhost:${port}/eval-test.html`);
    await page.waitForEvent('console', {
      predicate: (m) => m.text().includes('guile version'),
      timeout: 120000,
    });
    ok = true;
    console.log('BROWSER TEST: PASS');
  } catch (e) {
    console.log('BROWSER TEST: FAIL');
    console.log('collected:', lines.join('\n'));
  }
  await browser.close();
  server.kill();
  process.exit(ok ? 0 : 1);
})();
