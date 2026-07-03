# Once Every 3 Hours

A Chrome extension for self-discipline. Distracting sites get **one visit every
three hours, each site tracked on its own**. When a site is locked you get a
blank reminder page instead:

> Focus. Put the effort in. That's the only way.

## How it works

- The day is split into **3-hour windows** anchored to local midnight:
  `00–03, 03–06, 06–09, 09–12, 12–15, 15–18, 18–21, 21–24` (your machine's own
  time zone).
- Each blocked site gets **its own one visit per window** — visiting reddit
  doesn't touch your gmail or facebook allowance.
- Your first visit to a site in a fresh window unlocks it. While you're
  browsing, **time is not counted** — stay as long as you want. It's up to you
  to decide when to stop.
- The visit ends when you **close (or navigate away from) the tabs you opened
  during it**. After that, opening a blocked site again in the *same* window
  shows the Focus page until the next 3-hour boundary. Only your visit's own
  tabs count — a blocked tab you left open from before doesn't keep the window
  unlocked.
- Leave a visit tab open and the session stays alive — the extension trusts
  you; it never forces you out.

## Editing the block list

Open [`config.js`](./config.js) and edit `BLOCKED_DOMAINS`. A domain matches all
of its subdomains, so `reddit.com` also covers `www.reddit.com`. You can also
change `WINDOW_HOURS` (e.g. `2` or `6`) — windows always stay anchored to
midnight.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Pin the toolbar icon — the popup lists every blocked site and whether it's
   available, in a visit, or locked (with the next unlock time).

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (Manifest V3) |
| `config.js` | **Block list** and window length |
| `background.js` | Service worker — per-site window logic and locking |
| `blocked.html` / `blocked.css` | The Focus reminder page |
| `popup.html` / `popup.js` | Toolbar status popup |
| `fonts/` | Bundled Literata (SIL OFL 1.1), same face [`blank`](https://github.com/georgismitev/blank) uses |
| `icons/` | Toolbar icon (paper tile + 3-hour clock wedge) |

The Focus page and popup share [`blank`](https://github.com/georgismitev/blank)'s exact look: the warm `#f8f8f6` paper,
`#121212` ink, and the bundled **Literata** book serif.
