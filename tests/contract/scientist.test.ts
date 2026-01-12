// Purpose: Contract test for the Scientist seam (seam: scientist)
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { ScientistMock } from "../../src/lib/mocks/scientist.mock.js";
import { IScientist } from "../../contracts/scientist.contract.js";

// We will add the Real adapter here later
const implementations: { name: string; factory: () => Promise<IScientist> }[] = [
  { name: "Mock", factory: async () => new ScientistMock() },
];

describe("Scientist Contract", () => {
  implementations.forEach(({ name, factory }) => {
    describe(name, () => {
      let scientist: IScientist;

      beforeEach(async () => {
        scientist = await factory();
      });

      it("should create an experiment", async () => {
        const exp = await scientist.createExperiment("idea-123", "Test Hypo", "console.log('foo')");
        assert.ok(exp.id);
        assert.strictEqual(exp.status, "pending");
        assert.strictEqual(exp.ideaId, "idea-123");
        assert.strictEqual(exp.probeCode, "console.log('foo')");
      });

      it("should run a successful experiment", async () => {
        const exp = await scientist.createExperiment("idea-success", "Success", "console.log(JSON.stringify({ data: \"hello\" }))");
        const result = await scientist.runExperiment(exp.id);
        
        assert.strictEqual(result.exitCode, 0);
        // The mock uses the fixture data
        assert.ok(result.stdout.includes("success"));
        
        const list = await scientist.listExperiments();
        const updated = list.find(e => e.id === exp.id);
        assert.strictEqual(updated?.status, "completed");
        assert.ok(updated?.completedAt);
      });

      it("should handle a failed experiment", async () => {
        // Trigger the "failed_run" scenario in the mock
        const exp = await scientist.createExperiment("idea-fail", "Fail", "process.exit(1)");
        const result = await scientist.runExperiment(exp.id);

        assert.strictEqual(result.exitCode, 1);
        
        const list = await scientist.listExperiments();
        const updated = list.find(e => e.id === exp.id);
        assert.strictEqual(updated?.status, "failed");
      });

      it("should list experiments with filter", async () => {
        await scientist.createExperiment("1", "A", "code");
        const exp2 = await scientist.createExperiment("2", "B", "code");
        await scientist.runExperiment(exp2.id); // completes it

        const pending = await scientist.listExperiments("pending");
        const completed = await scientist.listExperiments("completed");

        assert.strictEqual(pending.length, 1);
        assert.strictEqual(completed.length, 1);
      });
    });
  });
});
