/** Formats a card number as a zero-padded label, e.g. #047. */
export function formatCardNumber(n: number): string {
  return `#${String(n).padStart(3, '0')}`
}
