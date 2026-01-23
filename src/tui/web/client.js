// Purpose: Web HUD client for SSE + state fetch (seam: web_cockpit).
import { createRenderer } from "./renderer.js";

const statusPulse = document.getElementById("status-pulse");
const statusText = document.getElementById("connection-status");
const footerStatus = document.getElementById("footer-status");

const render = createRenderer();

let lastRevision = -1;
let pendingRevision = null;
let fetchInFlight = false;

let eventSource = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

function setStatus(state, detail) {
  const text = detail ? `${state}: ${detail}` : state;
  if (statusText) statusText.textContent = text;
  if (footerStatus) footerStatus.textContent = text;
  setPulseState(state);
}

function setPulseState(state) {
  if (!statusPulse) return;
  statusPulse.classList.remove("is-live", "is-error", "is-connecting");
  if (state === "live") statusPulse.classList.add("is-live");
  else if (state === "error" || state === "reconnecting") statusPulse.classList.add("is-error");
  else statusPulse.classList.add("is-connecting");
}

function scheduleFetch(revision) {
  if (typeof revision !== "number") return;
  if (revision <= lastRevision && pendingRevision === null) return;
  pendingRevision = Math.max(pendingRevision ?? 0, revision);
  if (!fetchInFlight) void fetchLatest();
}

async function fetchLatest() {
  if (pendingRevision === null) return;
  fetchInFlight = true;
  const targetRevision = pendingRevision;
  pendingRevision = null;

  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error(`State fetch failed: ${response.status}`);
    const state = await response.json();
    if (typeof state.revision === "number") {
      lastRevision = state.revision;
      render(state);
    } else if (targetRevision > lastRevision) {
      setStatus("error", "invalid state payload");
    }
  } catch (err) {
    setStatus("error", err instanceof Error ? err.message : "state fetch error");
  } finally {
    fetchInFlight = false;
    if (pendingRevision !== null && pendingRevision > lastRevision) void fetchLatest();
  }
}

function connect() {
  if (eventSource) eventSource.close();
  setStatus("connecting");

  eventSource = new EventSource("/api/events");
  eventSource.onopen = () => {
    reconnectDelay = 1000;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    setStatus("live");
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (typeof data.revision === "number") scheduleFetch(data.revision);
    } catch (err) {
      setStatus("error", "bad event payload");
    }
  };

  eventSource.onerror = () => {
    if (eventSource) eventSource.close();
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = reconnectDelay;
  setStatus("reconnecting", `${Math.ceil(delay / 1000)}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
  reconnectDelay = Math.min(Math.floor(reconnectDelay * 1.7), MAX_RECONNECT_DELAY);
}

function bootstrap() {
  scheduleFetch(0);
  connect();
}

bootstrap();
