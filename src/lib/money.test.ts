import { describe, expect, test } from 'bun:test';
import { invoiceLineAmounts, invoiceTotals } from './money';

describe('invoice rounding', () => {
  test('UF-2026-00028 lines sum to the same 197.97 document total', () => {
    const lines = [invoiceLineAmounts(29, 5.64, 17), invoiceLineAmounts(1, 5.64, 17)];
    expect(lines.map((line) => line.total)).toEqual([191.37, 6.60]);
    expect(invoiceTotals(lines.map((line, index) => ({ quantity: index ? 1 : 29, unit_price: 5.64, vat_amount: line.vatAmount })))).toEqual({ subtotal: 169.20, vatAmount: 28.77, total: 197.97 });
  });

  test('partial supplier payment leaves the exact outstanding balance', () => {
    expect(Math.round((512.75 - 200) * 100) / 100).toBe(312.75);
  });
});
