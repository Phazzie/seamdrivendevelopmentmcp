/**
 * Purpose: Probe external reality for sdd_tracking (scans project structure).
 */
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "sdd_tracking");
const FIXTURE_PATH = path.join(FIXTURE_DIR, "sample.json");

if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function parseCapturedAt(fixturePath: string): { capturedAt: string | null; ageDays: number | null } {
  try {
    if (!fs.existsSync(fixturePath)) return { capturedAt: null, ageDays: null };
    const raw = fs.readFileSync(fixturePath, "utf-8");
    const data = JSON.parse(raw);
    const capturedAt = data.captured_at;
    if (typeof capturedAt !== "string") return { capturedAt: null, ageDays: null };
    
    const ms = Date.parse(capturedAt);
    if (Number.isNaN(ms)) return { capturedAt, ageDays: null };
    
    const ageDays = (Date.now() - ms) / (1000 * 60 * 60 * 24);
    return { capturedAt, ageDays };
  } catch {
    return { capturedAt: null, ageDays: null };
  }
}

async function runProbe() {
  const root = process.cwd();
  const contractsDir = path.join(root, "contracts");
  
  if (!exists(contractsDir)) {
    console.error("Contracts directory not found");
    process.exit(1);
  }

  const contractFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith(".contract.ts"));
  const seams = contractFiles.map(f => f.replace(".contract.ts", ""));
  
  const seamReports = seams.map(seam => {
    const components = {
      contract: exists(path.join(root, "contracts", `${seam}.contract.ts`)),
      probe: exists(path.join(root, "probes", `${seam}.probe.ts`)),
      fixture: exists(path.join(root, "fixtures", seam)),
      mock: exists(path.join(root, "src", "lib", "mocks", `${seam}.mock.ts`)),
      adapter: exists(path.join(root, "src", "lib", "adapters", `${seam}.adapter.ts`)),
      test: exists(path.join(root, "tests", "contract", `${seam}.test.ts`))
    };

    // Check fixture freshness
    const fixtureDir = path.join(root, "fixtures", seam);
    const fixtureSample = path.join(fixtureDir, "sample.json"); // Assumption: main fixture is sample.json or first json
    let fixtureFreshness = { isFresh: false, ageDays: null as number | null, capturedAt: null as string | null };
    
    if (components.fixture) {
      // Try sample.json, or first json file
      let targetFixture = fixtureSample;
      if (!exists(targetFixture)) {
         const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith(".json"));
         if (files.length > 0) targetFixture = path.join(fixtureDir, files[0]);
      }
      
      const { capturedAt, ageDays } = parseCapturedAt(targetFixture);
      fixtureFreshness.capturedAt = capturedAt;
      fixtureFreshness.ageDays = ageDays;
      if (ageDays !== null && ageDays <= 7) {
        fixtureFreshness.isFresh = true;
      }
    }

    const issues: string[] = [];
    if (!components.contract) issues.push("Missing contract");
    if (!components.probe) issues.push("Missing probe");
    if (!components.fixture) issues.push("Missing fixture");
    if (!components.mock) issues.push("Missing mock");
    if (!components.adapter) issues.push("Missing adapter");
    if (!components.test) issues.push("Missing contract test");
    if (components.fixture && !fixtureFreshness.isFresh) issues.push(`Stale fixture (${fixtureFreshness.ageDays?.toFixed(1)} days)`);

    const isCompliant = issues.length === 0;

    return {
      name: seam,
      isCompliant,
      components,
      fixtureFreshness,
      issues
    };
  });

  const compliantCount = seamReports.filter(s => s.isCompliant).length;
  const overallScore = seamReports.length > 0 ? compliantCount / seamReports.length : 0;
  const isHealthy = overallScore > 0.8; // arbitrary threshold

  const output = {
    generatedAt: new Date().toISOString(),
    overallScore,
    isHealthy,
    seams: seamReports
  };

  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      "success": {
        "description": "Real scan of current project",
        "outputs": {
          "getReport": output
        }
      }
    }
  };

  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log(`sdd_tracking probe complete. Scanned ${seams.length} seams.`);
}

runProbe().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});