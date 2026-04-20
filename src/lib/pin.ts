export const PIN_PATTERN = /^\d{4,8}$/;

export function normalizePinInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function isValidPin(value: string): boolean {
  return PIN_PATTERN.test(value.trim());
}