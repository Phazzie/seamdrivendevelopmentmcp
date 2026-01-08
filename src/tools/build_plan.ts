#!/usr/bin/env node
/**
 * Purpose: CLI entrypoint for build_plan (build_plan seam).
 */
import fs from "fs";
import path from "path";
import { BuildPlanAdapter } from "../lib/adapters/build_plan.adapter.js";
import { BuildPlanInputSchema } from "../../contracts/build_plan.contract.js";

function printUsage(): void {
  console.error("Usage: npm run build-plan -- --input <path> [--output <path>]");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf("--input");
  const outputIdx = args.indexOf("--output");

  if (inputIdx === -1) {
    printUsage();
    process.exit(1);
  }

  const inputPath = args[inputIdx + 1];
  if (!inputPath) {
    printUsage();
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedInput, "utf-8");
  const input = BuildPlanInputSchema.parse(JSON.parse(raw));

  const builder = new BuildPlanAdapter();
  const result = await builder.build(input);

  if (outputIdx !== -1 && args[outputIdx + 1]) {
    const outputPath = path.resolve(args[outputIdx + 1]);
    fs.writeFileSync(outputPath, result.markdown, "utf-8");
    console.log(`Wrote plan to ${outputPath}`);
    return;
  }

  console.log(result.markdown);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`build-plan failed: ${message}`);
  process.exit(1);
});
