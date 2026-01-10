#!/usr/bin/env node
/**
 * Purpose: CLI tool to run probes and refresh fixtures.
 */
import { ProbeRunnerAdapter } from "../lib/adapters/probe_runner.adapter.js";

async function main() {
  const runner = new ProbeRunnerAdapter();
  const pattern = process.argv[2] || "probes/**/*.probe.ts";
  
  console.log(`Running probes matching: ${pattern}...`);
  const results = await runner.run({ pattern });
  
  let failures = 0;
  for (const res of results) {
    const status = res.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${res.name} (${res.durationMs}ms)`);
    if (!res.success) {
      console.error(`  Error: ${res.stderr}`);
      failures++;
    }
  }
  
  if (failures > 0) {
    console.error(`\nCompleted with ${failures} failures.`);
    process.exit(1);
  }
  
  console.log("\nAll probes completed successfully.");
}

main().catch(err => {
  console.error("Fatal Error running probes:", err);
  process.exit(1);
});
