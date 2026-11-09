export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function invoiceLineAmounts(quantity: number, unitPrice: number, vatRate: number) {
  const subtotal = roundMoney(quantity * unitPrice);
  const vatAmount = roundMoney(subtotal * vatRate / 100);
  return { subtotal, vatAmount, total: roundMoney(subtotal + vatAmount) };
}

export function invoiceTotals(lines: { quantity: number; unit_price: number; vat_amount: number }[]) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.quantity * line.unit_price), 0));
  const vatAmount = roundMoney(lines.reduce((sum, line) => sum + line.vat_amount, 0));
  return { subtotal, vatAmount, total: roundMoney(subtotal + vatAmount) };
}
