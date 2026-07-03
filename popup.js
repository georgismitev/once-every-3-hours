import { BLOCKED_DOMAINS, WINDOW_HOURS } from "./config.js";

function currentWindowKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const index = Math.floor(now.getHours() / WINDOW_HOURS);
  return `${y}-${m}-${d}#${index}`;
}

// Start of the next window, formatted as local HH:MM.
function nextWindowTime(now = new Date()) {
  const next = new Date(now);
  const nextHour = (Math.floor(now.getHours() / WINDOW_HOURS) + 1) * WINDOW_HOURS;
  next.setHours(nextHour, 0, 0, 0); // hour 24 rolls into tomorrow 00:00
  return next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function render() {
  const wk = currentWindowKey();
  const { used, sessions } = await chrome.storage.local.get({
    used: {},
    sessions: {},
  });

  const next = nextWindowTime();
  const list = document.getElementById("list");
  list.replaceChildren();

  for (const domain of BLOCKED_DOMAINS) {
    let state = "available";
    let label = "available";
    if (sessions[domain]?.window === wk) {
      state = "open";
      label = "in a visit";
    } else if (used[domain] === wk) {
      state = "locked";
      label = `locked · ${next}`;
    }

    const row = document.createElement("div");
    row.className = "row";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = domain;
    const tag = document.createElement("span");
    tag.className = `tag ${state}`;
    tag.textContent = label;
    row.append(name, tag);
    list.append(row);
  }
}

render();
