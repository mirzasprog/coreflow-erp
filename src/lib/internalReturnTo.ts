export function internalReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  const url = new URL(value, 'https://internal.invalid');
  if (url.origin !== 'https://internal.invalid' || url.pathname === '/auth') return '/';
  return url.pathname + url.search + url.hash;
}