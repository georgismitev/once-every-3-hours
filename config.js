// ─── Edit your block list here ─────────────────────────────────────────────
// Domains that are locked outside of your 3-hour access window.
// A domain also matches all of its subdomains, e.g. "reddit.com" blocks
// "www.reddit.com" and "old.reddit.com" too. Add or remove freely.
export const BLOCKED_DOMAINS = [
  "mail.google.com",
  "gmail.com",
  "linkedin.com",
];

// Length of each access window, in hours. Windows are anchored to local
// midnight, so with 3 they start at 00:00, 03:00, 06:00, 09:00, 12:00,
// 15:00, 18:00 and 21:00 in the machine's own time zone.
export const WINDOW_HOURS = 3;
