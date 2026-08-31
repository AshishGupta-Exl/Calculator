import test from 'node:test';
import assert from 'node:assert/strict';

import { Calculator, formatDisplay, MAX_DIGITS } from '../src/calculator.js';

/** Drives the calculator with a compact key string, e.g. `"12+3="`. */
function press(keys, calculator = new Calculator()) {
  for (const key of keys) {
    if (/[0-9]/.test(key)) calculator.inputDigit(key);
    else if (key === '.') calculator.inputDecimal();
    else if (key === '=') calculator.equals();
    else if (key === '%') calculator.percent();
    else if (key === 'c') calculator.clear();
    else if (key === 'e') calculator.clearEntry();
    else if (key === '<') calculator.backspace();
    else if (key === '~') calculator.toggleSign();
    else calculator.chooseOperator(key);
  }
  return calculator;
}

test('starts at zero', () => {
  assert.equal(new Calculator().display, '0');
});

test('typed digits replace the leading zero', () => {
  assert.equal(press('0123').display, '123');
});

test('evaluates the four basic operations', () => {
  assert.equal(press('12+34=').display, '46');
  assert.equal(press('50-8=').display, '42');
  assert.equal(press('6*7=').display, '42');
  assert.equal(press('9/4=').display, '2.25');
});

test('chains operations left to right without precedence', () => {
  assert.equal(press('2+3*4=').display, '20');
});

test('shows the running total while chaining', () => {
  const calculator = press('2+3*');
  assert.equal(calculator.display, '5');
  assert.equal(calculator.expression, '5 \u00d7');
});

test('replacing an operator keeps the pending operand', () => {
  assert.equal(press('8+*2=').display, '16');
});

test('equals repeats the last operation', () => {
  assert.equal(press('2+3==').display, '8');
  assert.equal(press('3*3===').display, '81');
});

test('equals reapplies the last operation to a freshly typed number', () => {
  assert.equal(press('2+3=10=').display, '13');
});

test('equals without an operator is a no-op', () => {
  assert.equal(press('7=').display, '7');
});

test('hides binary floating point noise', () => {
  assert.equal(press('.1+.2=').display, '0.3');
  assert.equal(press('1.1*3=').display, '3.3');
});

test('accepts a single decimal point', () => {
  assert.equal(press('1.2.5').display, '1.25');
  assert.equal(press('.5').display, '0.5');
});

test('toggles sign and ignores zero', () => {
  assert.equal(press('5~').display, '-5');
  assert.equal(press('5~~').display, '5');
  assert.equal(press('0~').display, '0');
  assert.equal(press('7~+2=').display, '-5');
});

test('percent is relative to the pending value for plus and minus', () => {
  assert.equal(press('200+10%=').display, '220');
  assert.equal(press('200-10%=').display, '180');
});

test('percent is a plain division by 100 elsewhere', () => {
  assert.equal(press('50%').display, '0.5');
  assert.equal(press('200*10%=').display, '20');
});

test('backspace removes the last character', () => {
  assert.equal(press('123<').display, '12');
  assert.equal(press('123<<<').display, '0');
  assert.equal(press('5<<').display, '0');
  assert.equal(press('5~<').display, '0');
});

test('backspace after equals clears the entry', () => {
  assert.equal(press('2+3=<').display, '0');
});

test('clear entry keeps the pending operation', () => {
  assert.equal(press('9+5e4=').display, '13');
});

test('clear resets everything', () => {
  const calculator = press('9+5c');
  assert.equal(calculator.display, '0');
  assert.equal(calculator.expression, '');
  assert.equal(press('2=', calculator).display, '2');
});

test('reports division by zero and recovers on the next input', () => {
  const calculator = press('8/0=');
  assert.equal(calculator.display, 'Cannot divide by zero');
  assert.equal(calculator.expression, '');

  calculator.inputDigit('4');
  assert.equal(calculator.display, '4');
});

test('ignores operators, equals and percent while in an error state', () => {
  const calculator = press('8/0=');

  for (const key of ['+', '=', '%', '~']) {
    press(key, calculator);
    assert.equal(calculator.display, 'Cannot divide by zero');
  }
});

test('reports overflow instead of Infinity', () => {
  const calculator = new Calculator();
  calculator.entry = '1e308';
  calculator.overwrite = false;
  press('*9=', calculator);
  assert.equal(calculator.display, 'Out of range');
});

test('caps the number of typed digits', () => {
  const typed = '1'.repeat(MAX_DIGITS + 5);
  assert.equal(press(typed).display.replace(/,/g, ''), '1'.repeat(MAX_DIGITS));
});

test('formats thousands separators', () => {
  assert.equal(formatDisplay('1234567'), '1,234,567');
  assert.equal(formatDisplay('-1234.5678'), '-1,234.5678');
  assert.equal(formatDisplay('1.'), '1.');
  assert.equal(formatDisplay('1e+30'), '1e+30');
  assert.equal(press('9999*9999=').display, '99,980,001');
});
