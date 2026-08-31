/**
 * Immediate-execution calculator engine: operators are applied as soon as the
 * next one is pressed, so `2 + 3 x 4` evaluates to 20 rather than 14.
 */

export const MAX_DIGITS = 15;

export const OPERATORS = ['+', '-', '*', '/'];

const OPERATOR_SYMBOLS = {
  '+': '+',
  '-': '\u2212',
  '*': '\u00d7',
  '/': '\u00f7',
};

/** Significant digits kept after each operation, to hide binary rounding noise. */
const PRECISION = 12;

function apply(left, right, operator) {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

function round(value) {
  if (!Number.isFinite(value) || value === 0) return value;
  return Number(value.toPrecision(PRECISION));
}

function toEntry(value) {
  const rounded = round(value);
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function countDigits(entry) {
  return entry.replace(/[^0-9]/g, '').length;
}

/**
 * Adds thousands separators to the integer part while leaving a partially
 * typed entry (`"1."`, `"0.50"`) exactly as the user typed it.
 */
export function formatDisplay(entry) {
  if (/[e]/i.test(entry)) return entry;

  const negative = entry.startsWith('-');
  const unsigned = negative ? entry.slice(1) : entry;
  const [integer, fraction] = unsigned.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = fraction === undefined ? grouped : `${grouped}.${fraction}`;

  return negative ? `-${body}` : body;
}

export class Calculator {
  constructor() {
    this.clear();
  }

  /** Full reset (AC). */
  clear() {
    this.entry = '0';
    this.accumulator = null;
    this.operator = null;
    this.error = null;
    /** Next digit starts a fresh entry instead of appending. */
    this.overwrite = true;
    this.lastOperator = null;
    this.lastOperand = null;
    return this;
  }

  /** Clears the current entry only, keeping any pending operation (CE). */
  clearEntry() {
    if (this.error) return this.clear();
    this.entry = '0';
    this.overwrite = true;
    return this;
  }

  get value() {
    return Number(this.entry);
  }

  get display() {
    return this.error ?? formatDisplay(this.entry);
  }

  /** Secondary line showing the pending left-hand side, e.g. `"12 x"`. */
  get expression() {
    if (this.error || this.accumulator === null || this.operator === null) return '';
    return `${formatDisplay(toEntry(this.accumulator))} ${OPERATOR_SYMBOLS[this.operator]}`;
  }

  inputDigit(digit) {
    const character = String(digit);
    if (!/^[0-9]$/.test(character)) return this;
    if (this.error) this.clear();

    if (this.overwrite) {
      this.entry = character;
      this.overwrite = false;
      return this;
    }

    if (countDigits(this.entry) >= MAX_DIGITS) return this;

    this.entry = this.entry === '0' ? character : this.entry + character;
    return this;
  }

  inputDecimal() {
    if (this.error) this.clear();

    if (this.overwrite) {
      this.entry = '0.';
      this.overwrite = false;
    } else if (!this.entry.includes('.')) {
      this.entry += '.';
    }
    return this;
  }

  toggleSign() {
    if (this.error) return this;
    if (this.value === 0) return this;

    this.entry = this.entry.startsWith('-') ? this.entry.slice(1) : `-${this.entry}`;
    return this;
  }

  backspace() {
    if (this.error) return this.clear();
    if (this.overwrite) return this.clearEntry();

    const trimmed = this.entry.slice(0, -1);
    if (trimmed === '' || trimmed === '-') {
      this.entry = '0';
      this.overwrite = true;
    } else {
      this.entry = trimmed;
    }
    return this;
  }

  /**
   * Percent is relative to the pending left-hand side for `+`/`-`
   * (`200 + 10% = 220`) and a plain division by 100 otherwise.
   */
  percent() {
    if (this.error) return this;

    const relative =
      this.accumulator !== null && (this.operator === '+' || this.operator === '-');
    const result = relative ? (this.accumulator * this.value) / 100 : this.value / 100;

    this.entry = toEntry(result);
    this.overwrite = true;
    return this;
  }

  chooseOperator(operator) {
    if (!OPERATORS.includes(operator)) return this;
    if (this.error) return this;

    if (this.operator !== null && this.accumulator !== null && !this.overwrite) {
      const result = this.#evaluate(this.accumulator, this.value, this.operator);
      if (this.error) return this;
      this.accumulator = result;
      this.entry = toEntry(result);
    } else if (this.accumulator === null || this.operator === null) {
      this.accumulator = this.value;
    }

    this.operator = operator;
    this.overwrite = true;
    this.lastOperator = null;
    this.lastOperand = null;
    return this;
  }

  /** Repeats the previous operation when pressed again, e.g. `2 + 3 = = -> 8`. */
  equals() {
    if (this.error) return this;

    let result;
    if (this.operator !== null && this.accumulator !== null) {
      this.lastOperator = this.operator;
      this.lastOperand = this.value;
      result = this.#evaluate(this.accumulator, this.lastOperand, this.lastOperator);
    } else if (this.lastOperator !== null) {
      result = this.#evaluate(this.value, this.lastOperand, this.lastOperator);
    } else {
      result = this.value;
    }

    this.accumulator = null;
    this.operator = null;
    if (this.error) return this;

    this.entry = toEntry(result);
    this.overwrite = true;
    return this;
  }

  #evaluate(left, right, operator) {
    const result = apply(left, right, operator);
    if (!Number.isFinite(result)) {
      this.error = operator === '/' && right === 0 ? 'Cannot divide by zero' : 'Out of range';
      this.entry = '0';
      this.accumulator = null;
      this.operator = null;
      this.lastOperator = null;
      this.lastOperand = null;
      this.overwrite = true;
      return 0;
    }
    return round(result);
  }
}
