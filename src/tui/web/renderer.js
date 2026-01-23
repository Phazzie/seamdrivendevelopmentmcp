// Purpose: Render Web HUD state updates with rAF throttling (seam: web_cockpit).
const MAX_LOG_LINES = 120;
const MAX_AUDIT_LINES = 160;
const MAX_LIST_ITEMS = 12;

export function createRenderer() {
  const dom = {
    revision: document.getElementById("revision-display"),
    lastUpdate: document.getElementById("last-update"),
    panic: document.getElementById("panic-status"),
    leftLog: document.getElementById("left-log"),
    rightLog: document.getElementById("right-log"),
    locks: document.getElementById("locks-list"),
    gates: document.getElementById("gates-list"),
    agents: document.getElementById("agents-list"),
    stats: {
      agents: document.getElementById("stat-agents"),
      tasks: document.getElementById("stat-tasks"),
      messages: document.getElementById("stat-messages"),
      events: document.getElementById("stat-events"),
      gates: document.getElementById("stat-gates"),
      locks: document.getElementById("stat-locks"),
      ideas: document.getElementById("stat-ideas"),
      adrs: document.getElementById("stat-adrs"),
      notifications: document.getElementById("stat-notifications"),
    },
  };

  let lastRevision = null;
  let scheduled = null;
  let pendingState = null;
  let pendingForce = false;

  return function render(state, options = {}) {
    if (!state || typeof state.revision !== "number") return;
    if (!options.force && state.revision === lastRevision) return;

    pendingState = state;
    pendingForce = pendingForce || !!options.force;
    if (scheduled) return;

    scheduled = requestAnimationFrame(() => {
      scheduled = null;
      const nextState = pendingState;
      const force = pendingForce;
      pendingState = null;
      pendingForce = false;
      if (!nextState) return;
      if (!force && nextState.revision === lastRevision) return;

      paint(nextState, dom);
      lastRevision = nextState.revision;
    });
  };
}

function paint(state, dom) {
  setText(dom.revision, String(state.revision));
  setText(dom.lastUpdate, formatClock(Date.now()));
  updatePanic(dom.panic, !!state.panic_mode);

  const messages = Array.isArray(state.messages) ? state.messages : [];
  const audit = Array.isArray(state.audit) ? state.audit : [];
  const locks = Array.isArray(state.locks) ? state.locks : [];
  const gates = Array.isArray(state.review_gates) ? state.review_gates : [];
  const agents = Array.isArray(state.agents) ? state.agents : [];

  renderLogs(dom.leftLog, messages.slice(-MAX_LOG_LINES), formatMessage);
  renderLogs(dom.rightLog, audit.slice(-MAX_AUDIT_LINES), formatAudit);
  renderList(dom.locks, locks.slice(0, MAX_LIST_ITEMS), formatLock, "No active locks");
  renderList(dom.gates, gates.slice(0, MAX_LIST_ITEMS), formatGate, "No review gates");
  renderList(dom.agents, agents.slice(0, MAX_LIST_ITEMS), formatAgent, "No active agents");

  updateStat(dom.stats.agents, agents.length);
  updateStat(dom.stats.tasks, countArray(state.tasks));
  updateStat(dom.stats.messages, messages.length);
  updateStat(dom.stats.events, countArray(state.events));
  updateStat(dom.stats.gates, gates.length);
  updateStat(dom.stats.locks, locks.length);
  updateStat(dom.stats.ideas, countArray(state.ideas));
  updateStat(dom.stats.adrs, countArray(state.adrs));
  updateStat(dom.stats.notifications, countArray(state.notifications));
}

function updatePanic(element, isPanic) {
  if (!element) return;
  element.classList.toggle("warn", isPanic);
  element.classList.toggle("ok", !isPanic);
  element.textContent = isPanic ? "panic: on" : "panic: off";
}

function renderLogs(container, items, formatter) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    const ts = document.createElement("span");
    ts.className = "ts";
    ts.textContent = formatClock(item.timestamp || item.createdAt || Date.now());
    const text = document.createElement("span");
    text.textContent = formatter(item);
    entry.append(ts, text);
    fragment.appendChild(entry);
  }
  container.replaceChildren(fragment);
  container.scrollTop = container.scrollHeight;
}

function renderList(container, items, formatter, emptyLabel) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "list-item";
    empty.textContent = emptyLabel;
    fragment.appendChild(empty);
  } else {
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "list-item";
      row.appendChild(formatter(item));
      fragment.appendChild(row);
    }
  }
  container.replaceChildren(fragment);
}

function formatMessage(message) {
  const sender = safeText(message.sender || "unknown");
  const channel = message.channelId ? `#${safeText(message.channelId)}` : "#general";
  const content = safeText(message.content || "");
  return `${sender} ${channel}: ${content}`;
}

function formatAudit(event) {
  const agentId = safeText(event.agentId || "system");
  const tool = safeText(event.tool || "tool");
  const result = safeText(event.resultSummary || "");
  return `${agentId} -> ${tool} ${result ? `| ${result}` : ""}`.trim();
}

function formatLock(lock) {
  const wrapper = document.createElement("div");
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "lock";
  const main = document.createElement("div");
  const owner = safeText(lock.ownerId || "unknown");
  const resource = safeText(lock.resource || "unknown");
  const expires = lock.expiresAt ? formatClock(lock.expiresAt) : "n/a";
  main.textContent = `${resource} (${owner}) exp ${expires}`;
  wrapper.append(label, main);
  return wrapper;
}

function formatGate(gate) {
  const wrapper = document.createElement("div");
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = gate.status || "pending";
  const main = document.createElement("div");
  const resources = Array.isArray(gate.affectedResources) ? gate.affectedResources.length : 0;
  main.textContent = `${safeText(gate.planId || "plan")} | ${resources} resources`;
  wrapper.append(label, main);
  return wrapper;
}

function formatAgent(agent) {
  const wrapper = document.createElement("div");
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = safeText(agent.name || "agent");
  const main = document.createElement("div");
  const id = safeText(agent.id || "");
  const lastSeen = agent.lastSeenAt ? formatClock(agent.lastSeenAt) : "n/a";
  main.textContent = `${id.slice(0, 8)} | last ${lastSeen}`;
  wrapper.append(label, main);
  return wrapper;
}

function updateStat(element, value) {
  if (!element) return;
  element.textContent = String(value || 0);
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value;
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function safeText(value) {
  return String(value || "");
}

function formatClock(timestamp) {
  if (!timestamp || Number.isNaN(Number(timestamp))) return "--:--:--";
  const date = new Date(Number(timestamp));
  return date.toISOString().slice(11, 19);
}
