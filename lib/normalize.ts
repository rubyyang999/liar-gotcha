export function normalizeAccount(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}
