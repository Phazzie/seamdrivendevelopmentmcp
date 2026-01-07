import fs from "fs";
import path from "path";

type CheckResult = {
  label: string;
  ok: boolean;
  details?: string;
};

type Options = {
  maxAgeDays: number;
  allowStale: boolean;
};

function parseArgs(argv: string[]): { seam: string | null; options: Options } {
  const options: Options = { maxAgeDays: 2, allowStale: false };
  let seam: string | null = null;

  for (const arg of argv) {
    if (arg.startsWith("--max-age-days=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isNaN(value) && value > 0) {
        options.maxAgeDays = value;
      }
      continue;
    }
    if (arg === "--max-age-days") {
      continue;
    }
    if (arg.startsWith("--max-age-days")) {
      continue;
    }
    if (arg === "--allow-stale") {
      options.allowStale = true;
      continue;
    }
    if (!seam) {
      seam = arg;
    }
  }

  return { seam, options };
}

function usage(): void {
  console.error("Usage: node dist/scripts/sdd-check.js <seam> [--max-age-days=2] [--allow-stale]");
}

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function listJsonFixtures(dir: string): string[] {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => path.join(dir, entry));
}

function parseCapturedAt(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const value = record.captured_at;
  if (typeof value !== "string") return null;
  return value;
}

function checkFixtureFreshness(
  fixturePaths: string[],
  options: Options
): { ok: boolean; details?: string } {
  if (fixturePaths.length === 0) {
    return { ok: false, details: "no fixture json files found" };
  }

  const now = Date.now();
  let missingCaptured = 0;
  let invalidCaptured = 0;
  let staleCount = 0;

  for (const fixturePath of fixturePaths) {
    const raw = fs.readFileSync(fixturePath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      invalidCaptured += 1;
      continue;
    }

    const capturedAt = parseCapturedAt(parsed);
    if (!capturedAt) {
      missingCaptured += 1;
      continue;
    }

    const capturedMs = Date.parse(capturedAt);
    if (Number.isNaN(capturedMs)) {
      invalidCaptured += 1;
      continue;
    }

    const ageDays = (now - capturedMs) / (1000 * 60 * 60 * 24);
    if (ageDays > options.maxAgeDays) {
      staleCount += 1;
    }
  }

  if (missingCaptured || invalidCaptured || staleCount) {
    const detailParts = [];
    if (missingCaptured) detailParts.push(`missing captured_at: ${missingCaptured}`);
    if (invalidCaptured) detailParts.push(`invalid captured_at: ${invalidCaptured}`);
    if (staleCount) detailParts.push(`stale fixtures: ${staleCount}`);
    return { ok: options.allowStale, details: detailParts.join(", ") };
  }

  return { ok: true };
}

function addResult(results: CheckResult[], label: string, ok: boolean, details?: string): void {
  results.push({ label, ok, details });
}

function main(): void {
  const { seam, options } = parseArgs(process.argv.slice(2));
  if (!seam) {
    usage();
    process.exitCode = 1;
    return;
  }

  const root = process.cwd();
  const results: CheckResult[] = [];

  const contractPath = path.join(root, "contracts", `${seam}.contract.ts`);
  const probePath = path.join(root, "probes", `${seam}.probe.ts`);
  const fixturesDir = path.join(root, "fixtures", seam);
  const mockPath = path.join(root, "src", "lib", "mocks", `${seam}.mock.ts`);
  const adapterPath = path.join(root, "src", "lib", "adapters", `${seam}.adapter.ts`);
  const testPath = path.join(root, "tests", "contract", `${seam}.test.ts`);

  addResult(results, `contract exists (${path.relative(root, contractPath)})`, exists(contractPath));
  addResult(results, `probe exists (${path.relative(root, probePath)})`, exists(probePath));
  addResult(results, `fixtures dir exists (${path.relative(root, fixturesDir)})`, exists(fixturesDir));
  addResult(results, `mock exists (${path.relative(root, mockPath)})`, exists(mockPath));
  addResult(results, `adapter exists (${path.relative(root, adapterPath)})`, exists(adapterPath));
  addResult(results, `contract test exists (${path.relative(root, testPath)})`, exists(testPath));

  const fixturePaths = listJsonFixtures(fixturesDir);
  const freshness = checkFixtureFreshness(fixturePaths, options);
  addResult(results, "fixtures freshness", freshness.ok, freshness.details);

  if (exists(mockPath)) {
    const content = fs.readFileSync(mockPath, "utf-8");
    const hasRandom = content.includes("Math.random");
    addResult(results, "mock has no Math.random", !hasRandom, hasRandom ? "found Math.random" : undefined);
  }

  let failed = false;
  for (const result of results) {
    const status = result.ok ? "OK" : "FAIL";
    const details = result.details ? ` - ${result.details}` : "";
    console.log(`${status} ${result.label}${details}`);
    if (!result.ok) failed = true;
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main();
