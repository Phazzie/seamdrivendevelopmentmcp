/**
 * Purpose: Test ViewModel transformation logic (tui seam).
 */
import assert from "node:assert";
import test from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveViewModel } from "../../src/tui/logic/view_model.js";
import { TuiConfig, TuiInputState } from "../../contracts/tui.contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, "../../../fixtures/tui/chat_simulation.json");

const config: TuiConfig = {
  paneAgents: { left: "Gemini", right: "Codex" },
  leaderPane: "left",
  defaultTarget: "left",
  broadcastHeader: "BROADCAST -> ALL",
  enforceLeaderWait: true,
};

const input: TuiInputState = {
  target: "left",
};

test("deriveViewModel - idle scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.idle;

  const vm = deriveViewModel(config, input, history, health);

  assert.strictEqual(vm.panes.left.agentId, "Gemini");
  assert.strictEqual(vm.panes.left.messages.length, 1);
  assert.strictEqual(vm.panes.right.messages.length, 1);
  assert.strictEqual(vm.health.persistence.status, "healthy");
});

test("deriveViewModel - broadcast_waiting scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.broadcast_waiting;

  const vm = deriveViewModel(config, input, history, health);

  assert.strictEqual(vm.panes.left.role, "leader");
  assert.strictEqual(vm.panes.right.role, "follower");
  assert.strictEqual(vm.panes.right.waitingForAgentId, "Gemini");
  assert.ok(vm.panes.left.messages.some((msg) => msg.target === "broadcast"));
  assert.ok(vm.panes.right.messages.some((msg) => msg.target === "broadcast"));
});

test("deriveViewModel - dual_pane_history scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.dual_pane_history;

  const vm = deriveViewModel(config, input, history, health);

  assert.strictEqual(vm.panes.left.messages.length, 25);
  assert.strictEqual(vm.panes.right.messages.length, 25);
  assert.strictEqual(vm.health.telemetry.status, "degraded");
});

test("deriveViewModel - leader_response scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.leader_response;

  const vm = deriveViewModel(config, input, history, health);

  // Leader responded, so follower should no longer be waiting
  assert.strictEqual(vm.panes.right.waitingForAgentId, undefined);
  assert.strictEqual(vm.panes.left.role, "leader");
  assert.strictEqual(vm.panes.right.role, "follower");
});

test("deriveViewModel - stale_state scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.stale_state;

  const vm = deriveViewModel(config, input, history, health);

  assert.strictEqual(vm.health.state.status, "stale");
  assert.strictEqual(vm.health.state.driftMs, 18500);
});

test("deriveViewModel - panic_mode scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.panic_mode;

  const vm = deriveViewModel(config, input, history, health);

  assert.strictEqual(vm.health.command.status, "failed");
  assert.strictEqual(vm.health.command.lastError, "PANIC_MODE");
  assert.ok(vm.panes.left.messages.some((msg) => msg.target === "broadcast"));
  assert.ok(vm.panes.right.messages.some((msg) => msg.target === "broadcast"));
});

test("deriveViewModel - command_error scenario", () => {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  const { history, health } = fixtures.command_error;

  const vm = deriveViewModel(config, input, history, health);

  assert.strictEqual(vm.health.command.status, "failed");
  assert.strictEqual(vm.health.command.lastError, "SERVER_OFFLINE");
  assert.strictEqual(vm.panes.left.messages.length, 1);
});
