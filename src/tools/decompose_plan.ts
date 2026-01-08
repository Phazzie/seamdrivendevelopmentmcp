#!/usr/bin/env node
/**
 * Purpose: CLI entrypoint for decompose_plan (plan_parser seam).
 */
import fs from "fs";
import path from "path";
import { PlanParserAdapter } from "../lib/adapters/plan_parser.adapter.js";
import { PlanParserInputSchema } from "../../contracts/plan_parser.contract.js";

function printUsage(): void {
  console.error("Usage: npm run decompose-plan -- --input <path>");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf("--input");

  if (inputIdx === -1) {
    printUsage();
    process.exit(1);
  }

  const inputPath = args[inputIdx + 1];
  if (!inputPath) {
    printUsage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Input file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(resolvedPath, "utf-8");
  const input = PlanParserInputSchema.parse({ markdown, source: resolvedPath });

  const parser = new PlanParserAdapter();
  const result = await parser.parse(input);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`decompose-plan failed: ${message}`);
  process.exit(1);
});
