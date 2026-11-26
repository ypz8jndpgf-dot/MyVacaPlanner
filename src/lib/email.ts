/** Normalize + validate an email address. Returns the cleaned address
 *  (trimmed, lowercased) or null when it isn't a plausible address.
 *  One validator for every surface that collects email (trip creation,
 *  join/claim, profile edits) so the rule never drifts. */
export function cleanEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s.length < 5 || s.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s;
}
