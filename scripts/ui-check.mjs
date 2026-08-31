/**
 * End-to-end smoke test: drives the real page in headless Chrome, asserts the
 * rendered output, and writes screenshots of the dark, light and error states.
 *
 * Usage: `npm run test:ui` (set CHROME_PATH if Chrome lives somewhere unusual).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const PORT = Number(process.env.PORT) || 4319;
const ORIGIN = `http://localhost:${PORT}/`;
const OUT = process.env.OUT ?? '/tmp/calculator-screenshots';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findChrome() {
  const found = CHROME_CANDIDATES.find((path) => path && existsSync(path));
  if (!found) throw new Error('No Chrome binary found. Set CHROME_PATH to one.');
  return found;
}

async function waitForServer(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(ORIGIN);
      if (response.ok) return;
    } catch {
      // Server is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start on ${ORIGIN}`);
}

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, [fileURLToPath(new URL('serve.js', import.meta.url))], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  await waitForServer();

  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 760, deviceScaleFactor: 2 });

  const problems = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));

  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(ORIGIN, { waitUntil: 'networkidle0' });

  const read = () => page.$eval('#display', (el) => el.textContent);
  const readExpression = () => page.$eval('#expression', (el) => el.textContent);
  const theme = () => page.$eval('html', (el) => el.dataset.theme);

  async function click(selector) {
    await page.click(selector);
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  const digit = (value) => click(`[data-digit="${value}"]`);
  const operator = (value) => click(`[data-operator="${value}"]`);
  const action = (value) => click(`[data-action="${value}"]`);
  const type = async (keys) => {
    for (const key of keys) await page.keyboard.press(key);
  };

  assert.equal(await theme(), 'dark', 'should follow the system colour scheme');

  // Clicking through 1234 x 56 = 69,104.
  for (const value of '1234') await digit(value);
  assert.equal(await read(), '1,234', 'thousands separators');

  await operator('*');
  assert.equal(await readExpression(), '1,234 \u00d7', 'pending expression line');
  assert.equal(
    await page.$eval('[data-operator="*"]', (el) => el.getAttribute('aria-pressed')),
    'true',
    'pending operator is highlighted',
  );

  for (const value of '56') await digit(value);
  await action('equals');
  assert.equal(await read(), '69,104');
  assert.equal(await readExpression(), '', 'expression clears after equals');

  // The tinted keys must keep their colour while hovered (the cursor is on `=`).
  assert.match(
    await page.$eval('.key--equals', (el) => getComputedStyle(el).backgroundImage),
    /gradient/,
    'equals key lost its gradient while hovered',
  );

  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${OUT}/screenshot_calculator_dark.png` });

  // Keyboard input, with floating point noise rounded away.
  await page.keyboard.press('Escape');
  await type(['.', '1', '+', '.', '2', 'Enter']);
  assert.equal(await read(), '0.3');

  await page.keyboard.press('Escape');
  await type(['2', '0', '0', '+', '1', '0', '%', 'Enter']);
  assert.equal(await read(), '220', 'percent is relative to the pending value');

  await page.keyboard.press('Escape');
  await type(['9', '8', '7', '6', 'Backspace']);
  assert.equal(await read(), '987');

  // Division by zero reports an error and recovers on the next digit.
  await page.keyboard.press('Escape');
  await type(['8', '/', '0', 'Enter']);
  assert.equal(await read(), 'Cannot divide by zero');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${OUT}/screenshot_calculator_error.png` });

  await page.keyboard.press('4');
  assert.equal(await read(), '4', 'typing recovers from the error state');

  // Theme toggle, and the choice surviving a reload.
  await click('#theme-toggle');
  assert.equal(await theme(), 'light');

  await page.keyboard.press('Escape');
  await type(['8', '5', '*', '4', '2', 'Enter']);
  assert.equal(await read(), '3,570');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${OUT}/screenshot_calculator_light.png` });

  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await theme(), 'light', 'theme is remembered');

  assert.deepEqual(problems, [], `console or page errors: ${problems.join('\n')}`);
  console.log(`UI checks passed. Screenshots in ${OUT}`);
} finally {
  await browser.close();
  server.kill();
}
