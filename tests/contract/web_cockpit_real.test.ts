// Purpose: Verify WebCockpitAdapter port conflict handling (seam: web_cockpit).
import { describe, it } from "node:test";
import assert from "node:assert";
import net from "node:net";
import path from "node:path";
import { AppError } from "../../contracts/store.contract.js";
import { MockStore } from "../../src/lib/mocks/store.mock.js";
import { PathGuard } from "../../src/lib/helpers/path_guard.js";
import { WebCockpitAdapter } from "../../src/lib/adapters/web_cockpit.adapter.js";

describe("WebCockpitAdapter", () => {
  it("should reject when start cannot bind", async () => {
    const blocker = net.createServer();
    let blockerStarted = false;
    let port = 1; // Privileged port fallback for restricted environments.
    let expectConflict = false;

    try {
      await new Promise<void>((resolve, reject) => blocker.listen(0, "127.0.0.1", () => resolve()).once("error", reject));
      blockerStarted = true;
      const address = blocker.address();
      if (!address || typeof address === "string") throw new Error("Failed to bind test server");
      port = address.port;
      expectConflict = true;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "EACCES") {
        throw err;
      }
    }

    const store = new MockStore();
    const pathGuard = new PathGuard(path.join(process.cwd()));
    const adapter = new WebCockpitAdapter(store, pathGuard, port);

    const startPromise = adapter.start();
    const result = await awaitStart(startPromise, 250);

    if (blockerStarted) {
      blocker.close();
    }

    if (result.type === "timeout") {
      throw new Error("Expected start rejection, but start did not settle");
    }
    assert.strictEqual(result.type, "rejected");
    assert.ok(result.err instanceof AppError);
    assert.strictEqual(result.err.code, "INTERNAL_ERROR");
    if (expectConflict) {
      assert.match(result.err.message, /already in use/i);
    }
  });
});

type StartResult =
  | { type: "resolved" }
  | { type: "rejected"; err: unknown }
  | { type: "timeout" };

async function awaitStart(startPromise: Promise<void>, timeoutMs: number): Promise<StartResult> {
  const timeout = new Promise<StartResult>((resolve) =>
    setTimeout(() => resolve({ type: "timeout" }), timeoutMs)
  );
  const settle = new Promise<StartResult>((resolve) => {
    startPromise
      .then(() => resolve({ type: "resolved" }))
      .catch((err: unknown) => resolve({ type: "rejected", err }));
  });
  return Promise.race([settle, timeout]);
}
