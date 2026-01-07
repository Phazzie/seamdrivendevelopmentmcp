# MCP Mission Control V2 (The Cockpit)

A real-time TUI for coordinating AI agents (Gemini & Codex).

## Usage

```bash
# Run with defaults
npm run tui

# Run with custom config file
npm run tui -- --config ./my-config.json

# View Logs
npm run tui -- --left-log ~/.gemini/logs/current.log --right-log ~/.codex/logs/current.log

# Override specific args
npm run tui -- --store /path/to/store.json --refresh 500
```

## Configuration

You can provide a JSON configuration file. See `config.example.json` for a template.

### Config Schema
- `paneAgents`: Map of pane ID ("left" | "right") to Agent Name.
- `leaderPane`: Which pane is the current leader ("left" | "right").
- `defaultTarget`: Initial target for messages ("left" | "right" | "broadcast").
- `broadcastHeader`: Prefix for broadcast messages.
- `enforceLeaderWait`: Whether to show "Waiting" badges.

## Key Bindings
- `Tab`: Cycle target (Left -> Right -> Broadcast).
- `1`: Set target to Left.
- `2`: Set target to Right.
- `3`: Set target to Broadcast.
- `Q` / `Ctrl-C` / `Esc`: Quit.