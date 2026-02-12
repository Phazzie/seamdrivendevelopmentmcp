/**
 * Purpose: Real implementation for sdd_tracking (Async/Mandate Compliant).
 */
import fs from "fs/promises";
import path from "path";
import type { ISddTracking, SddReport, SddSeamStatus } from "../../../contracts/sdd_tracking.contract.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type SeamPaths = {
  probe?: string[];
  adapter?: string[];
};

// Some seams use historical file names or non-lib adapter locations.
const SEAM_PATH_OVERRIDES: Record<string, SeamPaths> = {
  adr: { probe: ["probes/adr_sample.probe.ts"] },
  agents: { probe: ["probes/agent_identity.probe.ts", "probes/agent_claude.probe.ts"] },
  arbitration: { probe: ["probes/arbitration_sample.probe.ts"] },
  audit: { probe: ["probes/audit_sample.probe.ts"] },
  confidence_auction: { probe: ["probes/confidence_auction_sample.probe.ts"] },
  dependency: { probe: ["probes/dependency_sample.probe.ts"] },
  event_stream: { probe: ["probes/event_stream_sample.probe.ts"] },
  knowledge: { probe: ["probes/knowledge_sample.probe.ts"] },
  locker: { probe: ["probes/path_normalization.probe.ts", "probes/fs_atomic.probe.ts"] },
  messages: { probe: ["probes/messages_sample.probe.ts"] },
  mood: { probe: ["probes/mood_sample.probe.ts"] },
  notifications: { probe: ["probes/notifications_sample.probe.ts"] },
  review_gate: { probe: ["probes/review_gate_sample.probe.ts"] },
  scheduler: { probe: ["probes/scheduler_sample.probe.ts"] },
  status: { probe: ["probes/status_snapshot.probe.ts"] },
  tasks: { probe: ["probes/tasks_sample.probe.ts"] },
  telemetry: { probe: ["probes/log_tail.probe.ts"] },
  tui: {
    probe: ["probes/tui/chat_simulation.probe.ts"],
    adapter: ["src/tui/adapters/tui.adapter.ts"],
  },
  probe_runner: { adapter: ["src/lib/helpers/probe_runner.helper.ts"] },
};

export class SddTrackingAdapter implements ISddTracking {
  private cache: { timestamp: number; report: SddReport } | null = null;
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async getReport(): Promise<SddReport> {
    if (this.cache) {
      if (Date.now() - this.cache.timestamp < CACHE_TTL_MS) {
        return this.cache.report;
      }
      this.refreshCache().catch((err) => console.error("[SddTracking] Background refresh failed", err));
      return this.cache.report;
    }
    return this.refreshCache();
  }

  private async refreshCache(): Promise<SddReport> {
    const report = await this.scanProject();
    this.cache = { timestamp: Date.now(), report };
    return report;
  }

  private async scanProject(): Promise<SddReport> {
    const contractsDir = path.join(this.rootDir, "contracts");
    if (!(await this.exists(contractsDir))) {
      return {
        generatedAt: new Date().toISOString(),
        overallScore: 0,
        isHealthy: false,
        seams: []
      };
    }

    const files = await fs.readdir(contractsDir);
    const contractFiles = files.filter(f => f.endsWith(".contract.ts"));
    const seams = contractFiles.map(f => f.replace(".contract.ts", ""));

    const seamReports: SddSeamStatus[] = await Promise.all(seams.map(async (seam) => {
      const overrides = SEAM_PATH_OVERRIDES[seam] || {};
      const probeCandidates = [
        path.join(this.rootDir, "probes", `${seam}.probe.ts`),
        ...(overrides.probe || []).map((p) => path.join(this.rootDir, p)),
      ];
      const adapterCandidates = [
        path.join(this.rootDir, "src", "lib", "adapters", `${seam}.adapter.ts`),
        ...(overrides.adapter || []).map((p) => path.join(this.rootDir, p)),
      ];

      const components = {
        contract: await this.exists(path.join(this.rootDir, "contracts", `${seam}.contract.ts`)),
        probe: await this.existsAny(probeCandidates),
        fixture: await this.exists(path.join(this.rootDir, "fixtures", seam)),
        mock: await this.exists(path.join(this.rootDir, "src", "lib", "mocks", `${seam}.mock.ts`)),
        adapter: await this.existsAny(adapterCandidates),
        test: await this.exists(path.join(this.rootDir, "tests", "contract", `${seam}.test.ts`))
      };

      // Check fixture freshness
      const fixtureDir = path.join(this.rootDir, "fixtures", seam);
      let fixtureFreshness = { isFresh: false, ageDays: null as number | null, capturedAt: null as string | null };

      if (components.fixture) {
        const targetFixture = await this.selectFixtureEvidenceFile(fixtureDir);
        if (targetFixture) {
          const { capturedAt, ageDays } = await this.parseCapturedAt(targetFixture);
          fixtureFreshness.capturedAt = capturedAt;
          fixtureFreshness.ageDays = ageDays;
          if (ageDays !== null && ageDays <= 7) {
            fixtureFreshness.isFresh = true;
          }
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
    }));

    const compliantCount = seamReports.filter(s => s.isCompliant).length;
    const overallScore = seamReports.length > 0 ? compliantCount / seamReports.length : 0;
    const isHealthy = overallScore > 0.8;

    return {
      generatedAt: new Date().toISOString(),
      overallScore,
      isHealthy,
      seams: seamReports
    };
  }

  private async parseCapturedAt(fixturePath: string): Promise<{ capturedAt: string | null; ageDays: number | null }> {
    try {
      if (!(await this.exists(fixturePath))) return { capturedAt: null, ageDays: null };
      const raw = await fs.readFile(fixturePath, "utf-8");
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

  private async selectFixtureEvidenceFile(fixtureDir: string): Promise<string | null> {
    const preferred = ["sample.json", "snapshot.json", "fs_watch.json"];
    for (const file of preferred) {
      const candidate = path.join(fixtureDir, file);
      if (await this.exists(candidate)) return candidate;
    }

    const dirFiles = await fs.readdir(fixtureDir).catch(() => []);
    const jsonFiles = dirFiles.filter((f) => f.endsWith(".json"));
    if (jsonFiles.length === 0) return null;

    const nonFault = jsonFiles.filter((f) => !/^fault/i.test(f));
    const candidates = nonFault.length > 0 ? nonFault : jsonFiles;

    const withMtime = await Promise.all(
      candidates.map(async (file) => {
        const fullPath = path.join(fixtureDir, file);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      })
    );

    withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return withMtime[0]?.fullPath || null;
  }

  private async existsAny(paths: string[]): Promise<boolean> {
    for (const p of paths) {
      if (await this.exists(p)) return true;
    }
    return false;
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await fs.stat(p);
      return true;
    } catch {
      return false;
    }
  }
}
