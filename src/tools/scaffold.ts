#!/usr/bin/env node
/**
 * Purpose: CLI entrypoint for the Scaffolder tool.
 * Usage: npm run scaffold -- --seam <name> [--dir <path>]
 */
import { ScaffolderAdapter } from "../lib/adapters/scaffolder.adapter.js";
import { ScaffoldInputSchema } from "../../contracts/scaffolder.contract.js";

async function main() {
  const args = process.argv.slice(2);
  const seamNameIdx = args.indexOf("--seam");
  const baseDirIdx = args.indexOf("--dir");

  if (seamNameIdx === -1) {
    console.error("Usage: npm run scaffold -- --seam <name> [--dir <path>]");
    process.exit(1);
  }

  const seamName = args[seamNameIdx + 1];
  const baseDir = baseDirIdx !== -1 ? args[baseDirIdx + 1] : ".";

  const inputResult = ScaffoldInputSchema.safeParse({ seamName, baseDir });
  
  if (!inputResult.success) {
    console.error("Invalid input:", inputResult.error.flatten());
    process.exit(1);
  }

  const scaffolder = new ScaffolderAdapter();
  const result = await scaffolder.scaffold(inputResult.data);

  if (result.success) {
    console.log(`✅ Successfully scaffolded seam '${seamName}':`);
    result.files.forEach(f => console.log(`   - ${f.type}: ${f.path}`));
  } else {
    console.error(`❌ Scaffolding failed: ${result.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
