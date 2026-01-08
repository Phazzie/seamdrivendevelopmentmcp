// Purpose: capture notifications fixture from the real notification adapter.
import fs from "fs";
import path from "path";
import { StoreAdapter } from "../src/lib/adapters/store.adapter.js";
import { NotificationAdapter } from "../src/lib/adapters/notifications.adapter.js";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "notifications");
const TEMP_STORE = path.join(FIXTURE_DIR, "notifications_probe_store.json");

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function main() {
  const store = new StoreAdapter(TEMP_STORE);
  try {
    const notifications = new NotificationAdapter(store);

    await notifications.send({
      title: "Urgent review",
      message: "Please review the latest plan.",
      priority: "urgent",
    });
    await notifications.send({
      title: "Build status",
      message: "CI passed.",
      priority: "normal",
    });
    await notifications.send({
      title: "Heads up",
      message: "New task assigned.",
      priority: "high",
    });

    const list = await notifications.list();
    const fixture = {
      captured_at: new Date().toISOString(),
      notifications: list,
    };

    fs.writeFileSync(
      path.join(FIXTURE_DIR, "sample.json"),
      JSON.stringify(fixture, null, 2)
    );

    console.log(`Notifications fixture written (${list.length} entries).`);
  } finally {
    if (fs.existsSync(TEMP_STORE)) fs.unlinkSync(TEMP_STORE);
  }
}

main().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
