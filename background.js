import { blockedGroups, WINDOW_HOURS } from "./config.js";

// The reminder page shown when a site is locked.
const FOCUS_PAGE = chrome.runtime.getURL("blocked.html");

// ─── URL / window helpers ───────────────────────────────────────────────────

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Returns the canonical key of the blocked group this http(s) url belongs to,
// or null. A domain also matches its subdomains (reddit.com ⇒ www.reddit.com),
// and every alias in a group resolves to the same key so they share a visit.
function matchedDomain(url) {
  if (!url || !/^https?:/i.test(url)) return null;
  const host = hostOf(url);
  for (const { key, domains } of blockedGroups()) {
    for (const d of domains) {
      if (host === d || host.endsWith("." + d)) return key;
    }
  }
  return null;
}

// A key that is unique per 3-hour window per day, e.g. "2026-07-03#3" for 09:00.
// Anchored to local midnight, so windows fall on 00, 03, 06, 09, ... local time.
function currentWindowKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const index = Math.floor(now.getHours() / WINDOW_HOURS);
  return `${y}-${m}-${d}#${index}`;
}

// ─── Persisted state (survives the service worker sleeping) ──────────────────
// Everything is tracked PER DOMAIN, so each site has its own visit per window.
//   used     – { [domain]: windowKey }  windows whose visit is already spent.
//   sessions – { [domain]: { window, tabs:[tabId] } }  visits in progress.

function getState() {
  return chrome.storage.local.get({ used: {}, sessions: {} });
}

// Bring persisted state in line with reality. Runs before every decision and
// whenever the worker wakes, so a window boundary or a browser that didn't
// close cleanly can't leave stale state behind.
//   1. Clean slate each window: drop anything not tagged with this window.
//   2. Heal orphans: a same-window session keeps only tabs that still exist and
//      are still on the site. If none survive the visit is over — the worker
//      may have slept through the tab closing, so onRemoved never fired.
async function pruneState() {
  const wk = currentWindowKey();
  const liveTab = new Map((await chrome.tabs.query({})).map((t) => [t.id, t]));
  const { used, sessions } = await getState();
  let changed = false;

  for (const domain of Object.keys(used)) {
    if (used[domain] !== wk) {
      delete used[domain];
      changed = true;
    }
  }

  for (const domain of Object.keys(sessions)) {
    const sess = sessions[domain];
    if (sess.window !== wk) {
      delete sessions[domain]; // earlier window → clean slate, fresh visit later
      changed = true;
      continue;
    }
    const live = sess.tabs.filter((id) => {
      const t = liveTab.get(id);
      return t && matchedDomain(t.url) === domain;
    });
    if (live.length === sess.tabs.length) continue;
    changed = true;
    if (live.length === 0) {
      console.log(`[3h] heal — ${domain} visit orphaned, tabs gone → locking`);
      used[domain] = wk;
      delete sessions[domain];
    } else {
      sess.tabs = live;
    }
  }

  if (changed) await chrome.storage.local.set({ used, sessions });
}

async function redirectToFocus(tabId) {
  try {
    await chrome.tabs.update(tabId, { url: FOCUS_PAGE });
  } catch {
    // Tab may have closed mid-navigation; nothing to do.
  }
}

// Decide what happens when a tab tries to open a blocked site.
async function handleBlockedNavigation(tabId, url) {
  const domain = matchedDomain(url);
  if (!domain) return;

  // Reconcile first, so any prior-window or orphaned session is already gone.
  await pruneState();

  const wk = currentWindowKey();
  const { used, sessions } = await getState();
  const sess = sessions[domain]; // pruneState guarantees this is the current window

  // Already inside this domain's visit for this window → allow, track the tab.
  if (sess) {
    if (!sess.tabs.includes(tabId)) {
      sess.tabs.push(tabId);
      await chrome.storage.local.set({ sessions });
    }
    console.log(`[3h] allow — ${domain} visit in progress`);
    return;
  }

  if (used[domain] === wk) {
    console.log(`[3h] LOCK — ${domain} already used this window → Focus page`);
    await chrome.storage.local.set({ used, sessions });
    await redirectToFocus(tabId);
    return;
  }

  // Fresh window for this domain: spend the visit and open the session. Browse
  // as long as you like across as many tabs — time is deliberately not counted.
  console.log(`[3h] grant — first ${domain} visit of this window`);
  sessions[domain] = { window: wk, tabs: [tabId] };
  await chrome.storage.local.set({ used, sessions });
}

// A tab was closed or moved to a non-blocked page. If it belonged to a domain's
// visit and no tabs of that visit remain, that domain locks for the window.
async function releaseTab(tabId) {
  const { used, sessions } = await getState();
  let changed = false;

  for (const domain of Object.keys(sessions)) {
    const sess = sessions[domain];
    if (!sess.tabs.includes(tabId)) continue;

    sess.tabs = sess.tabs.filter((id) => id !== tabId);
    changed = true;
    if (sess.tabs.length === 0) {
      console.log(`[3h] visit over — ${domain} now locked for this window`);
      used[domain] = sess.window;
      delete sessions[domain];
    }
  }

  if (changed) await chrome.storage.local.set({ used, sessions });
}

// ─── Wiring ──────────────────────────────────────────────────────────────────

// Intercept top-level navigations toward a blocked site as early as possible.
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // main frame only
  if (!matchedDomain(details.url)) return;
  handleBlockedNavigation(details.tabId, details.url);
});

// A visit tab that moves to a non-blocked page has left that visit.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (matchedDomain(details.url)) return;
  releaseTab(details.tabId);
});

// A visit tab that is closed has left that visit.
chrome.tabs.onRemoved.addListener((tabId) => {
  releaseTab(tabId);
});

// Self-heal on every worker wake and browser start: if the worker slept through
// a window boundary or the browser didn't close cleanly, stale state is cleared
// before it can affect a decision.
chrome.runtime.onStartup.addListener(pruneState);
pruneState();
