// UPC-A (12 digits, US/Canada) is the same code as EAN-13 with a leading zero.
// Scanners report either form, so store and compare everything as EAN-13.
export function normalizeEan(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.length === 12 ? `0${digits}` : digits;
}
