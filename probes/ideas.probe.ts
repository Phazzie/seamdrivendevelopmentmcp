/**
 * Purpose: Capture a sample ideas fixture (ideas seam).
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { IdeaFixtureSchema } from "../contracts/ideas.contract.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "ideas");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const now = Date.now();
  const createdId = randomUUID();
  const backlogId = randomUUID();
  const noteId = randomUUID();

  const createdIdea = {
    id: createdId,
    title: "New capture",
    summary: "",
    status: "draft",
    tags: [],
    notes: [],
    relatedTaskIds: [],
    relatedIdeaIds: [],
    created_at: now,
    updated_at: now,
  };

  const updatedIdea = {
    ...createdIdea,
    status: "active",
    tags: ["focus"],
    updated_at: now + 1,
  };

  const notedIdea = {
    ...createdIdea,
    notes: [
      {
        id: noteId,
        author: "codex",
        body: "First note",
        created_at: now + 2,
      },
    ],
    updated_at: now + 2,
  };

  const backlogIdea = {
    id: backlogId,
    title: "Backlog idea",
    summary: "Parking lot",
    status: "parked",
    tags: ["backlog"],
    notes: [],
    relatedTaskIds: [],
    relatedIdeaIds: [createdId],
    created_at: now + 3,
    updated_at: now + 3,
  };

  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
      success: {
        description: "Happy path",
        outputs: {
          create: createdIdea,
          update: updatedIdea,
          list: [createdIdea, backlogIdea],
          get: createdIdea,
          addNote: notedIdea,
        },
      },
      not_found: {
        description: "Idea not found",
        error: {
          code: "VALIDATION_FAILED",
          message: "Idea not found",
        },
      },
    },
  };

  const parsed = IdeaFixtureSchema.safeParse(fixture);
  if (!parsed.success) {
    console.error("Fixture failed schema validation:", parsed.error);
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "sample.json"),
    JSON.stringify(parsed.data, null, 2)
  );

  console.log("Ideas fixture written.");
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
