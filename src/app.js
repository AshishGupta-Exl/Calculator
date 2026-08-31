import { Calculator } from './calculator.js';

const calculator = new Calculator();

const displayElement = document.getElementById('display');
const expressionElement = document.getElementById('expression');
const keypad = document.getElementById('keypad');
const themeToggle = document.getElementById('theme-toggle');

const THEME_KEY = 'calculator:theme';
const PRESS_FEEDBACK_MS = 120;

const KEYBOARD_MAP = {
  '+': { operator: '+' },
  '-': { operator: '-' },
  '*': { operator: '*' },
  x: { operator: '*' },
  X: { operator: '*' },
  '/': { operator: '/' },
  '=': { action: 'equals' },
  Enter: { action: 'equals' },
  '.': { action: 'decimal' },
  ',': { action: 'decimal' },
  '%': { action: 'percent' },
  Backspace: { action: 'backspace' },
  Delete: { action: 'clear' },
  Escape: { action: 'clear' },
  c: { action: 'clear' },
  C: { action: 'clear' },
  _: { action: 'toggle-sign' },
};

const ACTIONS = {
  clear: () => calculator.clear(),
  backspace: () => calculator.backspace(),
  percent: () => calculator.percent(),
  decimal: () => calculator.inputDecimal(),
  equals: () => calculator.equals(),
  'toggle-sign': () => calculator.toggleSign(),
};

/** Shrinks the result text so long numbers stay on one line. */
function displayFontSize(length) {
  if (length <= 9) return '3.25rem';
  if (length <= 12) return '2.6rem';
  if (length <= 16) return '2.1rem';
  return '1.75rem';
}

function render() {
  const value = calculator.display;

  displayElement.textContent = value;
  displayElement.dataset.error = String(Boolean(calculator.error));
  displayElement.style.setProperty('--display-size', displayFontSize(value.length));
  expressionElement.textContent = calculator.expression;

  for (const key of keypad.querySelectorAll('[data-operator]')) {
    key.setAttribute('aria-pressed', String(key.dataset.operator === calculator.operator));
  }
}

function flash(button) {
  if (!button) return;
  button.dataset.pressed = 'true';
  setTimeout(() => delete button.dataset.pressed, PRESS_FEEDBACK_MS);
}

function run({ digit, operator, action }) {
  if (digit !== undefined) calculator.inputDigit(digit);
  else if (operator !== undefined) calculator.chooseOperator(operator);
  else if (action !== undefined) ACTIONS[action]?.();
  render();
}

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  run(button.dataset);
});

document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const command = /^[0-9]$/.test(event.key) ? { digit: event.key } : KEYBOARD_MAP[event.key];
  if (!command) return;

  event.preventDefault();
  run(command);

  const selector = command.digit
    ? `[data-digit="${command.digit}"]`
    : command.operator
      ? `[data-operator="${CSS.escape(command.operator)}"]`
      : `[data-action="${command.action}"]`;
  flash(keypad.querySelector(selector));
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage can be unavailable in private browsing; the theme still applies.
  }
});

function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Ignore and fall back to the system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

applyTheme(initialTheme());
render();
