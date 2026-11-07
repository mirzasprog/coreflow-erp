import { test, expect } from 'bun:test';
import { internalReturnTo } from './internalReturnTo';

test('login preserves the requested internal document including query and fragment', () => {
  expect(internalReturnTo('/finance/invoices/outgoing/123?audit=1#gl')).toBe('/finance/invoices/outgoing/123?audit=1#gl');
});
test('login cannot redirect to an external origin', () => {
  for (const path of ['//evil.invalid', '/\\evil.invalid', 'https://evil.invalid', '/auth']) expect(internalReturnTo(path)).toBe('/');
});