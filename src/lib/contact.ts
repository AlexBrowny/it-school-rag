/** Shared (client + server) contact format check: phone, email or @telegram handle. */
const CONTACT_PATTERNS: readonly RegExp[] = [/^\+?[\d\s()\-]{7,20}$/, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, /^@\w{4,32}$/];

export function isValidContact(value: string): boolean {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(value));
}
