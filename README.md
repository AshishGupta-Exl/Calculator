# Calculator

A fast, keyboard-friendly web calculator. No frameworks, no build step, no dependencies —
just an ES module engine, a bit of DOM glue, and CSS.

## Getting started

```bash
npm start        # serves the app at http://localhost:4173
npm test         # runs the engine unit tests
npm run test:ui  # drives the real page in headless Chrome and saves screenshots
```

`npm test` needs nothing but Node 18+. `npm run test:ui` additionally needs a local Chrome or
Chromium binary; set `CHROME_PATH` if it is not in one of the usual locations.

`npm start` uses a small static server (`scripts/serve.js`) because browsers refuse to load
ES modules over `file://`. Any other static server works too.

## Features

- Immediate-execution arithmetic: `+`, `-`, `×`, `÷`, chained left to right, so `2 + 3 × 4 = 20`.
- Percent that follows calculator convention: `200 + 10% = 220`, while `200 × 10% = 20`.
- Repeat equals: `2 + 3 = =` gives `8`; `3 × 3 = = =` gives `81`.
- Sign toggle, decimals, backspace, clear entry and all-clear.
- Results rounded to 12 significant digits, so `0.1 + 0.2` shows `0.3` instead of `0.30000000000000004`.
- Division by zero and overflow surface as a readable message; the next digit you type recovers.
- Thousands separators, a display that shrinks to fit long results, and a pending-operator highlight.
- Dark and light themes, following the system preference and remembered in `localStorage`.
- Responsive layout, visible focus rings, ARIA live region on the display, reduced-motion support.

## Keyboard shortcuts

| Key                                | Action              |
| ---------------------------------- | ------------------- |
| `0`–`9`                            | Enter a digit       |
| `.` or `,`                         | Decimal point       |
| `+` `-` `*` `/` (also `x`)         | Choose an operator  |
| `Enter` or `=`                     | Evaluate            |
| `%`                                | Percent             |
| `Backspace`                        | Delete last digit   |
| `Esc`, `Delete` or `c`             | Clear everything    |
| `_`                                | Toggle sign         |

## Project layout

```
index.html            markup for the calculator shell
styles.css            theming, layout and key styles
src/calculator.js     the engine — pure state machine, no DOM
src/app.js            DOM bindings, keyboard handling, theme switching
test/calculator.test.js  engine unit tests (node:test)
scripts/serve.js      dependency-free static server for `npm start`
scripts/ui-check.mjs  headless-browser smoke test and screenshot capture
```

The engine in `src/calculator.js` is deliberately DOM-free: it exposes `inputDigit`,
`inputDecimal`, `chooseOperator`, `equals`, `percent`, `toggleSign`, `backspace`, `clearEntry`
and `clear`, plus `display` and `expression` getters for rendering. That keeps it easy to test
and reusable outside the browser.
