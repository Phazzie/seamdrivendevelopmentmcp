/**
 * Purpose: Enforce the Senior Engineer Mandate (Architectural Non-Negotiables).
 * Usage: node dist/scripts/verify-mandates.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../"); 

const ADAPTERS_DIR = path.join(ROOT, "src", "lib", "adapters");
const SRC_DIR = path.join(ROOT, "src");
const FIXTURES_DIR = path.join(ROOT, "fixtures");

let failureCount = 0;

function fail(file: string, reason: string, line: number) {
  console.error(`❌ MANDATE VIOLATION: ${path.relative(ROOT, file)}:${line} - ${reason}`);
  failureCount++;
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const isAdapter = filePath.startsWith(ADAPTERS_DIR);

  lines.forEach((text, idx) => {
    const line = idx + 1;

    // Rule 1: No process.cwd() in adapters
    if (isAdapter && text.includes("process.cwd()")) {
      fail(filePath, "Dependency Injection Violation: usage of process.cwd()", line);
    }

    // Rule 2: No Sync IO in adapters
    if (isAdapter && /fs\.[a-zA-Z]+Sync/.test(text)) {
      fail(filePath, "Async Sovereignty Violation: usage of fs.*Sync()", line);
    }

    // Rule 3: Forbidden Handshakes (Adapters must not import other adapters)
    if (isAdapter && text.includes("import") && text.includes("../adapters/")) {
      fail(filePath, "Forbidden Handshake: Adapter importing another Adapter detected.", line);
    }

    // Rule 4: No 'as any' or 'as unknown as' anywhere in src (StrictMode)
    if ((text.includes("as any") || text.includes("as unknown as")) && !text.includes("// allowed-any")) {
      fail(filePath, "Type Safety Violation: usage of 'as any' or 'as unknown as'", line);
    }

    // Rule 4b: No NYI placeholders in source paths
    if (/throw new Error\((["'])NYI\1\)/.test(text)) {
      fail(filePath, "Release Integrity Violation: NYI placeholder detected", line);
    }

    // Rule 6: No Shell Jailbreaks (No child_process in adapters)
    if (isAdapter && (text.includes("child_process") || text.includes("spawn") || text.includes("exec"))) {
      fail(filePath, "Security Violation: Shell Jailbreak attempt. Adapters must not use child_process.", line);
    }

    // Rule 5: No Magic Globals (Mutable state at top level)
    if (text.startsWith("let ") && !filePath.includes("test")) {
      fail(filePath, "Architecture Violation: Mutable global variable ('let') detected.", line);
    }
  });
}

function scanFaultFixtures() {
  if (!fs.existsSync(FIXTURES_DIR)) return;
  const seams = fs.readdirSync(FIXTURES_DIR);
  for (const seam of seams) {
    const seamDir = path.join(FIXTURES_DIR, seam);
    if (!fs.statSync(seamDir).isDirectory()) continue;
    
    const files = fs.readdirSync(seamDir);
    const hasFault = files.some(f => f.includes("fault") || f.includes("error"));
    if (!hasFault) {
      fail(seamDir, "Fault Fixture Mandate Violation: missing fault.json", 0);
    }
  }
}

function walk(dir: string) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".ts")) {
      scanFile(fullPath);
    }
  }
}

console.log("🔍 Scanning for Mandate Violations...");
walk(SRC_DIR);
scanFaultFixtures();

if (failureCount > 0) {
  console.error(`\n💥 FAILED: Found ${failureCount} mandate violations.`);
  process.exit(1);
} else {
  console.log("✅ All Systems Compliant.");
  process.exit(0);
}
