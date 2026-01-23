# MCP Collaboration Server (V1.1.4 Liquid Sword)

A hardened, stateful Model Context Protocol (MCP) server for autonomous multi-agent coordination. Built with **Async Sovereignty**, **Sharded Persistence**, and **Physical Security Jailing**.

## 🚀 The Core Philosophy: Seam-Driven Development (SDD)
This project is not a prototype; it is an infrastructure-grade fortress. We follow the **Red Proof** protocol:
1.  **Contract:** Define the law (Zod Schema).
2.  **Probe:** Capture the reality (Fixtures).
3.  **Mock:** Mirror the reality (Path-Blind).
4.  **Test:** Prove the contract (Failure & Success).
5.  **Adapter:** Implement the work (Logic).

## 🛠 Hardened Architecture
- **Sharded Store:** State is split into atomic shards (`store_data/tasks.json`, etc.) to eliminate write contention during high-velocity agent swarms.
- **JailedFS:** A physical wrapper around `fs` that strictly enforces root-directory confinement. Adapters cannot see outside the project.
- **AI Sentinel:** The `ReviewGate` deterministically validates Plan Intent against File Locks. "Lying Agents" are rejected automatically.
- **Web Cockpit:** A native, zero-dependency Dashboard for real-time human observability.

## 📥 Getting Started

### 1. Installation
```bash
npm install
npm run build
```

### 2. Running the Server (Standard)
```bash
npm start
```

### 3. Running with Web HUD (Visual Dashboard)
To enable the browser-based dashboard at `http://localhost:3000`:
```bash
MCP_WEB_PORT=3000 npm start
```

## 🧪 Quality Control (The Mechanical Law)
This project enforces quality via a mandatory linter script.
```bash
npm test      # Runs full suite + Mandate Linter
npm run verify # Runs Mandate Linter only (Checks for 'any', 'Sync', etc.)
npm run probes # Refreshes all 23 SDD fixtures
```

## 🧠 The Avant-Garde Hook System
Contributors are assisted by a cybernetic hook system (`.gemini/hooks/`) that enforces rigor automatically.
- **No-Any:** Blocks `as any` writes.
- **Anti-Sloth:** Blocks lazy `TODO` comments.
- **Holodeck:** Auto-injects Contract context.

## 🛡 Senior Engineer Mandates
Contributors **MUST** adhere to the rules in `docs/SDD_MASTER_GUIDE.md`. 
- **No Sync I/O:** Use `JailedFs`.
- **No Magic Paths:** Dependency Injection only.
- **No External Deps:** Core logic is zero-dependency.

## 🔗 Architecture Overview
- **Entrypoint:** `ServerBootstrap` (Pure Wiring).
- **Core:** `StoreAdapter` (Sharded JSON).
- **Security:** `LockerAdapter` + `ReviewGateAdapter`.
- **Observability:** `WebCockpitAdapter` (SSE Stream).