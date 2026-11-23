import { describe, expect, it } from 'vitest';
import { billableItems, hasLineItems, lineTotal, roundMoney, totalsOf } from '../src/lib/invoice-math.js';
import { wrapText } from '../src/lib/text.js';

const invoice = (overrides = {}) => ({
  items: [{ quantity: 1, rate: 100 }],
  taxRate: 0,
  discount: 0,
  shipping: 0,
  ...overrides,
});

describe('invoice rounding', () => {
  it('rounds half cents to whole cents', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds tax, discount and shipping to two decimals', () => {
    const totals = totalsOf(
      invoice({ items: [{ quantity: 3, rate: 33.333 }], taxRate: 7.375, discount: 10.005, shipping: 4.999 }),
    );
    expect(totals.subtotal).toBe(100);
    expect(totals.discount).toBe(10.01);
    expect(totals.tax).toBe(6.64);
    expect(totals.shipping).toBe(5);
    expect(totals.total).toBe(101.63);
  });

  it('rounds every amount it returns to two decimals', () => {
    const totals = totalsOf(invoice({ items: [{ quantity: 1, rate: 0.335 }], taxRate: 19.99 }));
    Object.values(totals).forEach((value) => {
      // Every amount is a whole number of cents (allow for float noise).
      expect(Math.abs(value * 100 - Math.round(value * 100))).toBeLessThan(1e-6);
    });
  });
});

describe('invoice edge cases', () => {
  it('ignores negative and zero quantities', () => {
    expect(lineTotal({ quantity: -5, rate: 20 })).toBe(0);
    expect(lineTotal({ quantity: 0, rate: 20 })).toBe(0);
    expect(totalsOf(invoice({ items: [{ quantity: -2, rate: 10 }] })).total).toBe(0);
  });

  it('handles no line items without NaN', () => {
    const totals = totalsOf(invoice({ items: [] }));
    expect(totals).toEqual({ subtotal: 0, discount: 0, taxable: 0, tax: 0, shipping: 0, total: 0 });
    expect(hasLineItems(invoice({ items: [] }))).toBe(false);
    expect(hasLineItems(invoice({ items: [{ quantity: 0, rate: 0 }] }))).toBe(false);
    expect(hasLineItems(invoice())).toBe(true);
  });

  it('prints only rows that carry data', () => {
    const items = [
      { description: '', quantity: 1, rate: 0 },
      { description: '  ', quantity: 0, rate: 0 },
      { description: 'Design', quantity: 2, rate: 50 },
    ];
    expect(billableItems({ items }).map((item) => item.description)).toEqual(['Design']);
  });

  it('caps the discount at the subtotal', () => {
    const totals = totalsOf(invoice({ discount: 500, taxRate: 10 }));
    expect(totals.discount).toBe(100);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
  });

  it('survives missing or non-numeric state', () => {
    expect(totalsOf(undefined).total).toBe(0);
    expect(totalsOf(invoice({ taxRate: 'abc', shipping: null })).total).toBe(100);
  });
});

describe('wrapText', () => {
  // One unit per character keeps the assertions readable.
  const measure = (value) => value.length;

  it('wraps long descriptions at word boundaries', () => {
    const lines = wrapText('Design and development of the annual report', measure, 20);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(20));
  });

  it('hard-splits a word longer than the column instead of overflowing', () => {
    const lines = wrapText('supercalifragilisticexpialidocious', measure, 10);
    expect(lines.join('')).toBe('supercalifragilisticexpialidocious');
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(10));
  });

  it('returns one empty line for empty text', () => {
    expect(wrapText('', measure, 10)).toEqual(['']);
  });

  it('keeps Arabic text in order', () => {
    expect(wrapText('فاتورة', measure, 20)).toEqual(['فاتورة']);
  });
});
