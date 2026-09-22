/**
 * Formats Spanish phone numbers with space separators (600123456 ->
 * "600 12 34 56"). Anything else is returned trimmed and untouched.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.replace(/^(0034|34)(?=\d{9}$)/, "");
  if (/^[6789]\d{8}$/.test(local)) {
    return `${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
  }
  return raw.trim();
}
