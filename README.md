# MCP Collaboration Server

**A stateful MCP server for coordinating multi-agent collaboration on a local codebase.**

This server provides the "glue" layer for agents (like Codex and Gemini) to work together effectively. It acts as a shared brain, handling task management, knowledge persistence, file locking, and architectural decision tracking.

## 🚀 Features

### Core Infrastructure
- **File Locking:** Prevents race conditions by allowing agents to "check out" files.
- **Task Registry:** A shared Kanban-style board for tracking work.
- **Message Bridge:** Real-time communication between agents.
- **Seam-Driven Development (SDD):** Enforced architectural pattern with contracts, probes, and fixtures.

### Intelligence Suite
- **Knowledge Graph:** Shared persistent graph for project insights.
- **Decision Records (ADRs):** Immutable log of architectural decisions.

### Management Suite
- **Dependency Tracking:** Block tasks based on prerequisites.
- **Work Scheduler:** Automatically assign tasks based on agent roles (Leader/Follower).

### Meta-Cognition Suite
- **Confidence Auctions:** Agents bid on tasks based on capability.
- **Mood Logs:** Track agent "thrashing" or confusion.
- **Human Arbitration:** "Panic Button" and gavel mechanism for human intervention.

### TUI Cockpit
A terminal-based dashboard for real-time monitoring of agent activities.
```bash
npm run tui
```

## 🛠️ Usage

### Prerequisites
- Node.js v18+
- NPM

### Installation
```bash
git clone <repository-url>
cd mcp-collaboration-server
npm install
```

### Running the Server
The server runs over STDIO (Standard Input/Output) as per the MCP specification.

```bash
npm start
```

### Development Tools
- **Run Probes (Refresh Fixtures):**
  ```bash
  npm run probes
  ```
- **Check SDD Compliance:**
  ```bash
  npm run sdd:check
  ```
- **Scaffold New Feature:**
  ```bash
  npm run scaffold -- --seam <feature_name>
  ```
- **Decompose Plan:**
  ```bash
  npm run decompose-plan -- --input <markdown_file>
  ```

## 🏗️ Architecture

This project strictly follows **Seam-Driven Development (SDD)**. Every feature ("Seam") consists of:
1.  **Contract:** Zod schemas defining the interface.
2.  **Probe:** Executable script to verify external reality.
3.  **Fixture:** JSON snapshot of the probe's output.
4.  **Mock:** Testable implementation based on the fixture.
5.  **Adapter:** The real implementation.

See `AGENTS.md` and `MASTER_PLAN.md` for detailed protocols.

## 🤝 Collaboration

**Agents:**
- **Codex:** Primary code generation and execution.
- **Gemini:** Architecture, planning, and review.

**Human:**
- Acts as the "Gavel" for arbitration and final review.

## 📄 License
ISC
