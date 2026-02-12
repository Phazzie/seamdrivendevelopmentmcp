import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { AppError } from "../../contracts/store.contract.js";
import { MockWebCockpit } from "../../src/lib/mocks/web_cockpit.mock.js";

describe("MockWebCockpit", () => {
  it("exists", () => assert.ok(true));

  it("should fail on port conflict fault", async () => {
    const fixturePath = path.join(process.cwd(), "fixtures", "web_cockpit", "fault.json");
    const mock = new MockWebCockpit(fixturePath, "port_conflict");
    await assert.rejects(async () => {
      await mock.start();
    }, (err: unknown) => err instanceof AppError && err.code === "INTERNAL_ERROR");
  });
});
