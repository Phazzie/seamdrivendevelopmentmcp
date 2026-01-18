#!/usr/bin/env node
/**
 * Purpose: CLI entrypoint for the Scaffolder tool.
 * Usage: npm run scaffold -- --seam <name> [--dir <path>] [--spec <path>]
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { ScaffolderAdapter } from "../lib/adapters/scaffolder.adapter.js";
import { PathGuard } from "../lib/helpers/path_guard.js";
import { ScaffoldInputSchema, ScaffoldSpecSchema } from "../../contracts/scaffolder.contract.js";

async function main() {
  const args = process.argv.slice(2);
  const seamNameIdx = args.indexOf("--seam");
  const baseDirIdx = args.indexOf("--dir");
  const specIdx = args.indexOf("--spec");

  if (seamNameIdx === -1) {
    console.error("Usage: npm run scaffold -- --seam <name> [--dir <path>] [--spec <path>]");
    process.exit(1);
  }

  const seamName = args[seamNameIdx + 1];
  const baseDir = baseDirIdx !== -1 ? args[baseDirIdx + 1] : ".";
  const specPath = specIdx !== -1 ? args[specIdx + 1] : undefined;

  let spec: unknown = undefined;
  if (specPath) {
    const resolvedSpec = path.resolve(specPath);
    if (!fs.existsSync(resolvedSpec)) {
      console.error(`Spec file not found: ${resolvedSpec}`);
      process.exit(1);
    }
    const ext = path.extname(resolvedSpec).toLowerCase();
    let specData: unknown;

    if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
      const module = await import(pathToFileURL(resolvedSpec).href);
      specData = module.default ?? module.spec ?? module;
    } else {
      const raw = fs.readFileSync(resolvedSpec, "utf-8");
      specData = JSON.parse(raw);
    }

    const parsed = ScaffoldSpecSchema.safeParse(specData);
    if (!parsed.success) {
      console.error("Invalid spec:", parsed.error.flatten());
      process.exit(1);
    }
    spec = parsed.data;
  }

  const inputResult = ScaffoldInputSchema.safeParse({ seamName, baseDir, spec });
  
  if (!inputResult.success) {
    console.error("Invalid input:", inputResult.error.flatten());
    process.exit(1);
  }

  const pathGuard = new PathGuard(process.cwd());
  const scaffolder = new ScaffolderAdapter(pathGuard);
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