# MCP Collaboration Server (V1.1.0 Liquid)

A stateful Model Context Protocol (MCP) server designed for multi-agent coordination with high-rigor safety, asynchronous persistence, and mechanical mandate enforcement.

## 🚀 Core Philosophy: Seam-Driven Development
This project is built using **SDD**, a methodology that forces integration-first design.
1.  **Contract:** Define the law (Zod).
2.  **Probe:** Capture reality (Fixtures).
3.  **Mock:** Mirror the reality.
4.  **Test:** Prove the contract.
5.  **Adapter:** Implement the work.

## 🛠 Hardened Architecture
- **Async Store:** Fully non-blocking persistence with hardware-level `fsync` durability.
- **Surgical Safety:** Lock acquisitions are physically blocked by pending human review gates.
- **Path Jailing:** All file-system operations are jailed within the project root.
- **Mandate Linter:** Build-blocking enforcement of code quality (No `any`, No `Sync`, No magic paths).

## 📥 Getting Started
```bash
npm install
npm run build
npm start
```

## 🧪 Quality Control
```bash
npm test      # Runs full suite + Mandate Linter
npm run verify # Runs Mandate Linter only
npm run probes # Refreshes all reality fixtures
```

## 🛡 Senior Engineer Mandates
Contributors MUST adhere to the rules in `AGENTS.md`. Shortcuts are physically blocked by the CI pipeline.