/**
 * Purpose: Real implementation for build_plan.
 */
import type { BuildPlanInput, BuildPlanItem, BuildPlanResult } from "../../../contracts/build_plan.contract.js";
import { BuildPlanInputSchema, IBuildPlan } from "../../../contracts/build_plan.contract.js";
import { AppError } from "../../../contracts/store.contract.js";

export class BuildPlanAdapter implements IBuildPlan {
  async build(input: BuildPlanInput): Promise<BuildPlanResult> {
    const parsed = BuildPlanInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid build plan input.", {
        issues: parsed.error.issues,
      });
    }
    return { markdown: buildMarkdown(parsed.data) };
  }
}

function buildMarkdown(input: BuildPlanInput): string {
  const lines: string[] = [];

  if (input.title) {
    lines.push(`# ${input.title}`, "");
  }

  input.sections.forEach((section, sectionIndex) => {
    lines.push(`## ${section.title}`);
    section.items.forEach((item) => {
      lines.push(`- [ ] ${item.text}`);
      appendSubitems(lines, item);
    });
    if (sectionIndex < input.sections.length - 1) {
      lines.push("");
    }
  });

  if (input.orphanItems.length) {
    if (lines.length) lines.push("");
    input.orphanItems.forEach((item) => {
      lines.push(`- [ ] ${item.text}`);
      appendSubitems(lines, item);
    });
  }

  return lines.join("\n");
}

function appendSubitems(lines: string[], item: BuildPlanItem): void {
  item.subitems.forEach((subitem) => {
    lines.push(`  - [ ] ${subitem}`);
  });
}
