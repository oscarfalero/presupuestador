/**
 * Only same-origin paths survive: rejects absolute URLs,
 * protocol-relative (`//evil`) and backslash tricks. Pure for tests.
 */
export function resolveNextParam(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/account";
  }
  return raw;
}
