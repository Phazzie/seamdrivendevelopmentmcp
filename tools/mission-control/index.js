/**
 * MCP MISSION CONTROL
 * A TUI (Terminal User Interface) for monitoring and managing the MCP Collaboration Server.
 * Built with blessed and blessed-contrib.
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chokidar = require('chokidar');

// --- Configuration & Args ---
// Use minimist for lightweight argument parsing
const args = require('minimist')(process.argv.slice(2));

// Default paths based on project conventions, overrideable via CLI flags
const STORE_PATH = args.store || path.join(os.homedir(), ".mcp-collaboration", "store.json");
const GEMINI_LOG_PATH = args.gemini || path.join(os.homedir(), ".gemini", "logs", "current.log");
const CODEX_LOG_PATH = args.codex || path.join(os.homedir(), ".codex", "logs", "current.log");

// --- Helper: Log Tailer ---
/**
 * LogTailer watches a file and streams new lines to a blessed log widget.
 * It handles file creation, rotation, and efficient streaming via fs streams.
 */
class LogTailer {
  constructor(filepath, widget, label) {
    this.filepath = filepath;
    this.widget = widget;
    this.label = label;
    this.watcher = null;
    this.currentSize = 0;

    this.init();
  }

  init() {
    // If log doesn't exist yet, watch the parent directory for its creation
    if (!fs.existsSync(this.filepath)) {
      this.widget.log(`{red-fg}[${this.label}] Log file not found: ${this.filepath}{/red-fg}`);
      const dir = path.dirname(this.filepath);
      if (fs.existsSync(dir)) {
        const watcher = fs.watch(dir, (eventType, filename) => {
           if (filename === path.basename(this.filepath)) {
             watcher.close();
             this.startTailing();
           }
        });
      }
      return;
    }
    this.startTailing();
  }

  startTailing() {
    this.widget.log(`{green-fg}[${this.label}] Connected to log stream.{/green-fg}`);
    const stat = fs.statSync(this.filepath);
    this.currentSize = stat.size;

    // Use chokidar for robust file watching
    this.watcher = chokidar.watch(this.filepath, { persistent: true });
    
    this.watcher.on('change', () => {
      const stat = fs.statSync(this.filepath);
      if (stat.size > this.currentSize) {
        // Read only the new content appended since last check
        const stream = fs.createReadStream(this.filepath, {
          start: this.currentSize,
          end: stat.size
        });
        
        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk.toString();
        });
        
        stream.on('end', () => {
          const lines = buffer.split('\n');
          lines.forEach(line => {
             if(line.trim()) this.widget.log(line.trim());
          });
          this.currentSize = stat.size;
          screen.render();
        });
      } else if (stat.size < this.currentSize) {
        // If file shrank, assume rotation and reset pointer
        this.currentSize = 0; 
        this.widget.log(`{yellow-fg}[${this.label}] Log rotated.{/yellow-fg}`);
      }
    });
  }
}

// --- UI Setup ---
const screen = blessed.screen({
  smartCSR: true,
  title: 'MCP MISSION CONTROL'
});

// Use a 12x12 grid for flexible layout
const grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

// --- Widgets ---

// 1. Agent Terminals (Left Column - 50% width)
const geminiLog = grid.set(0, 0, 6, 6, contrib.log, {
  fg: "green", 
  selectedFg: "green", 
  label: 'GEMINI CLI (Active)',
  border: {type: "line", fg: "cyan"}
});

const codexLog = grid.set(6, 0, 6, 6, contrib.log, {
  fg: "yellow", 
  selectedFg: "yellow", 
  label: 'CODEX CLI (Standby)',
  border: {type: "line", fg: "yellow"}
});

// 2. Seam Health HUD (Top Right)
const healthGauge = grid.set(0, 6, 4, 3, contrib.donut, {
  label: 'Seam Health',
  radius: 8,
  arcWidth: 3,
  remainColor: 'black',
  yPadding: 2,
  data: [{percent: 0, label: 'Store', color: 'green'}]
});

// Sparkline for "Operations per Minute" (Velocity)
const velocitySparkline = grid.set(0, 9, 4, 3, contrib.sparkline, {
  label: 'Ops/Min (Velocity)',
  tags: true,
  style: { fg: 'blue' }
});


// 3. Task Board (Middle Right)
const taskTable = grid.set(4, 6, 4, 3, contrib.table, {
  keys: true, 
  fg: 'white', 
  selectedFg: 'white', 
  selectedBg: 'blue', 
  interactive: true, 
  label: 'Active Tasks', 
  border: {type: "line", fg: "cyan"}, 
  columnSpacing: 2, 
  columnWidth: [20, 10, 10] // Title, Status, Assignee
});

// 4. Active Locks (Middle Far Right)
const lockTable = grid.set(4, 9, 4, 3, contrib.table, {
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'red',
  interactive: true,
  label: 'Active Locks',
  border: {type: "line", fg: "red"},
  columnSpacing: 2,
  columnWidth: [15, 10, 10] // Resource, Owner, TTL
});

// 5. Live Changelog (Bottom Right - Audit stream)
const changelogLog = grid.set(8, 6, 4, 6, contrib.log, {
  fg: "white", 
  selectedFg: "white", 
  label: 'Live Changelog',
  border: {type: "line", fg: "white"},
  bufferLength: 50
});

// --- Logic ---

let revisionHistory = [];
let lastAuditId = null;
let currentTasks = []; // Tracked for selection logic
let currentLocks = []; // Tracked for selection logic
let lastUpdateAt = Date.now();
let lastRevision = 0;

/**
 * atomicUpdate performs a safe read-modify-write on store.json.
 * It increments the revision and uses a temp file + rename to prevent corruption.
 */
async function atomicUpdate(updater) {
  if (!fs.existsSync(STORE_PATH)) return;

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    
    const updatedData = updater(data);
    if (!updatedData) return; // Allow updater to abort by returning null

    // Increment revision to signal update to other agents (Optimistic Concurrency)
    updatedData.revision = (data.revision || 0) + 1;
    
    const tempPath = `${STORE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(updatedData, null, 2));
    fs.renameSync(tempPath, STORE_PATH);
    
    return true;
  } catch (err) {
    geminiLog.log(`{red-fg}[ERROR] Atomic update failed: ${err.message}{/red-fg}`);
    return false;
  }
}

/**
 * Toggles status through: todo -> in_progress -> review_pending -> done -> todo
 */
function cycleTaskStatus(taskTitle) {
  const statusCycle = ["todo", "in_progress", "review_pending", "done"];
  
  atomicUpdate((data) => {
    const task = (data.tasks || []).find(t => t.title === taskTitle);
    if (!task) {
      geminiLog.log(`{red-fg}[ERROR] Task not found: ${taskTitle}{/red-fg}`);
      return null;
    }

    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    task.status = nextStatus;
    task.updated_at = Date.now();
    
    geminiLog.log(`{magenta-fg}[COMMAND] Cycled task "${taskTitle}" status to: ${nextStatus}{/magenta-fg}`);
    return data;
  });
}

/**
 * Forcefully removes a lock from the store.
 */
function forceReleaseLock(resource) {
  atomicUpdate((data) => {
    const initialCount = (data.locks || []).length;
    data.locks = (data.locks || []).filter(l => l.resource !== resource);
    
    if (data.locks.length === initialCount) {
      geminiLog.log(`{red-fg}[ERROR] Lock not found for resource: ${resource}{/red-fg}`);
      return null;
    }

    geminiLog.log(`{magenta-fg}[COMMAND] Force-released lock: ${resource}{/magenta-fg}`);
    return data;
  });
}

/**
 * Updates the Velocity sparkline by binning revision changes in 2s buckets.
 */
function updateVelocity(currentRevision) {
  const now = Date.now();
  revisionHistory.push({ time: now, rev: currentRevision });
  
  // Keep only last 60 seconds of history
  revisionHistory = revisionHistory.filter(e => now - e.time < 60000);
  
  const bins = new Array(30).fill(0);
  revisionHistory.forEach(e => {
    const age = now - e.time;
    const binIndex = Math.floor(age / 2000); 
    if (binIndex < 30) {
      bins[29 - binIndex]++; // Newest data on the right
    }
  });

  velocitySparkline.setData(['Ops'], [bins]);
}

/**
 * Heuristic health calculation based on panic mode, backlog size, and lock contention.
 */
function calculateHealth(data) {
  let storeHealth = 100;
  let taskHealth = 100;
  let lockHealth = 100;

  if (data.panic_mode) storeHealth = 0;

  const todoCount = (data.tasks || []).filter(t => t.status === 'todo').length;
  taskHealth = Math.max(0, 100 - (todoCount * 10));

  const lockCount = (data.locks || []).length;
  lockHealth = Math.max(0, 100 - (lockCount * 20));

  return { storeHealth, taskHealth, lockHealth };
}

/**
 * Compares current audit log with previous state and appends new entries to widget.
 */
function updateChangelog(auditLog) {
  if (!auditLog || auditLog.length === 0) return;

  if (lastAuditId === null) {
    const initial = auditLog.slice(-3);
    initial.forEach(entry => logAuditEntry(entry));
    lastAuditId = auditLog[auditLog.length - 1].id;
    return;
  }

  const lastIndex = auditLog.findIndex(e => e.id === lastAuditId);
  if (lastIndex === -1) {
    logAuditEntry(auditLog[auditLog.length - 1]);
    lastAuditId = auditLog[auditLog.length - 1].id;
    return;
  }

  const newEntries = auditLog.slice(lastIndex + 1);
  newEntries.forEach(entry => logAuditEntry(entry));
  
  if (newEntries.length > 0) {
    lastAuditId = newEntries[newEntries.length - 1].id;
  }
}

function logAuditEntry(entry) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const agent = entry.agentId;
  const tool = entry.tool;
  const error = entry.errorCode ? `{red-fg}[ERR: ${entry.errorCode}]{/red-fg}` : '';
  
  changelogLog.log(`{gray-fg}${time}{/gray-fg} {bold}${agent}{/bold}: ${tool} ${error}`);
}

/**
 * Main update loop called whenever store.json changes.
 * Refreshes all HUD elements and tables.
 */
function updateStatus(data) {
  const isPanic = data.panic_mode;
  const revision = data.revision || 0;
  const lockCount = (data.locks || []).length;
  const now = Date.now();

  // Detect Staleness (Server heartbeat)
  if (revision !== lastRevision) {
    lastUpdateAt = now;
    lastRevision = revision;
  }

  updateVelocity(revision);
  updateChangelog(data.audit);

  const age = Math.floor((now - lastUpdateAt) / 1000);
  const staleMarker = age > 15 ? `{red-bg} STALE (${age}s) {/red-bg} ` : '';
  const statusLabel = `${staleMarker}Live Changelog | Rev: ${revision} | Locks: ${lockCount}`;
  changelogLog.setLabel(statusLabel);
  
  if (isPanic) {
    changelogLog.style.border.fg = 'red';
    changelogLog.setLabel(`{red-bg} PANIC MODE {/red-bg} ${statusLabel}`);
    geminiLog.log("!!! ALERT: SYSTEM IN PANIC MODE !!!");
  } else {
    changelogLog.style.border.fg = age > 15 ? 'yellow' : 'green';
  }

  const { storeHealth, taskHealth, lockHealth } = calculateHealth(data);
  
  healthGauge.setData([
    {percent: storeHealth, label: 'Store', color: storeHealth > 80 ? 'green' : 'red'},
    {percent: taskHealth, label: 'Tasks', color: 'cyan'},
    {percent: lockHealth, label: 'Locks', color: lockHealth > 50 ? 'yellow' : 'red'}
  ]);

  currentTasks = (data.tasks || []).map(t => [t.title, t.status, t.assignee || 'Unassigned']);
  currentTasks.sort((a,b) => a[1].localeCompare(b[1]));
  
  taskTable.setData({
    headers: ['Title', 'Status', 'Assignee'],
    data: currentTasks
  });

  currentLocks = (data.locks || []).map(l => {
    const ttl = Math.max(0, Math.floor((l.expiresAt - now) / 1000));
    return [path.basename(l.resource), l.ownerId, `${ttl}s`, l.resource]; 
  });

  lockTable.setData({
    headers: ['Res', 'Owner', 'TTL'],
    data: currentLocks.map(l => [l[0], l[1], l[2]])
  });

  screen.render();
}

/**
 * Loads store.json and triggers UI update.
 */
function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    changelogLog.log("{red-fg}Store file not found. Waiting...{/red-fg}");
    screen.render();
    return;
  }
  
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    updateStatus(data);
  } catch (err) {
    geminiLog.log(`Error reading store: ${err.message}`);
  }
}

// Watch store.json for changes
const watcher = chokidar.watch(STORE_PATH, { persistent: true });
watcher
  .on('add', path => { geminiLog.log(`Store detected: ${path}`); loadStore(); })
  .on('change', path => { loadStore(); })
  .on('unlink', path => { geminiLog.log(`Store deleted!`); });

// Initialize log tailers
new LogTailer(GEMINI_LOG_PATH, geminiLog, "GEMINI");
new LogTailer(CODEX_LOG_PATH, codexLog, "CODEX");

/**
 * Toggles the global safety switch.
 */
function togglePanic() {
  atomicUpdate((data) => {
    data.panic_mode = !data.panic_mode;
    const action = data.panic_mode ? "ENABLE" : "DISABLE";
    geminiLog.log(`{magenta-fg}[COMMAND] Toggling Panic Mode: ${action}...{/magenta-fg}`);
    return data;
  });
}

/**
 * Displays overlay with help info.
 */
function showHelp() {
  const helpText = `
  {bold}MCP MISSION CONTROL HELP{/bold}

  {cyan-fg}Keys:{/cyan-fg}
  - {yellow-fg}TAB{/yellow-fg}   : Cycle focus between widgets
  - {yellow-fg}P{/yellow-fg}     : Toggle Panic Mode
  - {yellow-fg}R{/yellow-fg}     : Force reload store
  - {yellow-fg}?{/yellow-fg}     : Show this help
  - {yellow-fg}Q / Esc{/yellow-fg}: Quit

  {cyan-fg}Interactivity:{/cyan-fg}
  - {bold}Tasks{/bold}: Select + {yellow-fg}Enter{/yellow-fg} to cycle status
  - {bold}Locks{/bold}: Select + {yellow-fg}Del/Enter{/yellow-fg} to force-release

  Press any key to close.
  `;

  const msg = blessed.message({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: '50%',
    border: 'line',
    label: ' Help ',
    tags: true,
    style: { border: { fg: 'cyan' } }
  });

  msg.display(helpText, 0);
}

// --- Key Bindings ---
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
screen.key(['r'], () => { geminiLog.log("Reloading store manually..."); loadStore(); });
screen.key(['p'], () => togglePanic());
screen.key(['?'], () => showHelp());
screen.key(['tab'], () => screen.focusNext());

// Interaction: Task Table (Cycle Status)
taskTable.rows.on('select', (item, index) => {
  const taskRow = currentTasks[index - 1]; 
  if (taskRow) cycleTaskStatus(taskRow[0]);
});

// Interaction: Lock Table (Force Release)
lockTable.rows.on('select', (item, index) => {
  const lockRow = currentLocks[index - 1];
  if (lockRow) forceReleaseLock(lockRow[3]);
});

lockTable.rows.key(['backspace', 'delete'], () => {
  const index = lockTable.rows.selected;
  const lockRow = currentLocks[index - 1];
  if (lockRow) forceReleaseLock(lockRow[3]);
});

// --- Start ---
geminiLog.log("{cyan-fg}Welcome to MCP Mission Control{/cyan-fg}");
geminiLog.log(`Watching Store: ${STORE_PATH}`);
codexLog.log("Connecting to feeds...");

loadStore();
screen.render();