// ─── Edit your block list here ─────────────────────────────────────────────
// Domains that are locked outside of your 3-hour access window.
// A domain also matches all of its subdomains, e.g. "reddit.com" blocks
// "www.reddit.com" and "old.reddit.com" too. Add or remove freely.
//
// Group domains in an array to make them aliases of one another — they then
// share a single visit. Opening any one spends the window for all of them,
// e.g. ["gmail.com", "mail.google.com"] treats both as the same site.
export const BLOCKED_DOMAINS = [
  ["gmail.com", "mail.google.com"],
  "linkedin.com",
];

// Length of each access window, in hours. Windows are anchored to local
// midnight, so with 3 they start at 00:00, 03:00, 06:00, 09:00, 12:00,
// 15:00, 18:00 and 21:00 in the machine's own time zone.
export const WINDOW_HOURS = 3;

// Normalize the block list into groups: { key, domains }. A bare string is a
// group of one; an array is a set of aliases. The first domain is the group's
// canonical key — used for storage and as the display name.
export function blockedGroups() {
  return BLOCKED_DOMAINS.map((entry) => {
    const domains = (Array.isArray(entry) ? entry : [entry]).map((d) =>
      d.toLowerCase()
    );
    return { key: domains[0], domains };
  });
}
