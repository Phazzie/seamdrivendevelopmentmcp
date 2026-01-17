/**
 * Purpose: Enforce the Senior Engineer Mandate (Architectural Non-Negotiables).
 * Usage: node dist/scripts/verify-mandates.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../"); // Assuming dist/scripts/ -> root

const ADAPTERS_DIR = path.join(ROOT, "src", "lib", "adapters");
const SRC_DIR = path.join(ROOT, "src");

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

    // Rule 3: No 'as any' anywhere in src (StrictMode)
    // Excluding tsconfig, d.ts, and this script itself
    if (text.includes("as any") && !text.includes("// allowed-any")) {
      fail(filePath, "Type Safety Violation: usage of 'as any'", line);
    }
  });
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

if (failureCount > 0) {
  console.error(`\n💥 FAILED: Found ${failureCount} mandate violations.`);
  process.exit(1);
} else {
  console.log("✅ All Systems Compliant.");
  process.exit(0);
}
