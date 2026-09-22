/** Normalizes a user-typed URL so it can be opened (assumes https). */
export function withProtocol(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
