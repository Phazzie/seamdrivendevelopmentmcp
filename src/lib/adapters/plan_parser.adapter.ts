/**
 * Purpose: Real implementation for plan_parser (fixed semantic mismatch).
 */
import { v4 as uuidv4 } from "uuid";
import {
  IPlanParser,
  PlanParserInput,
  PlanParserInputSchema,
  PlanParserResult,
} from "../../../contracts/plan_parser.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { Task } from "../../../contracts/tasks.contract.js";

export class PlanParserAdapter implements IPlanParser {
  async parse(input: PlanParserInput): Promise<PlanParserResult> {
    const parsed = PlanParserInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid plan parser input.", {
        issues: parsed.error.issues,
      });
    }
    const tasks = parseMarkdown(parsed.data.markdown);
    return { tasks };
  }
}

function parseMarkdown(markdown: string): Task[] {
  const lines = markdown.split(/\r?\n/);
  const tasks: Task[] = [];
  let currentSection = "";

  for (const line of lines) {
    const headerMatch = line.match(/^#{2,6}\s+(.*)$/);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      // We also treat the header itself as a task for tracking high-level progress
      tasks.push(createTask(currentSection, "Section Header"));
      continue;
    }

    const itemMatch = line.match(/^(\s*)-\s*\[[xX ]\]\s+(.*)$/);
    if (itemMatch) {
      const text = itemMatch[2].trim();
      const description = currentSection ? `From: ${currentSection}` : "";
      tasks.push(createTask(text, description));
    }
  }

  return tasks;
}

function createTask(title: string, description: string): Task {
  const now = Date.now();
  return {
    id: uuidv4(),
    title,
    description,
    status: "todo",
    blockedBy: [],
    created_at: now,
    updated_at: now,
  };
}
