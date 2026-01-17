/**
 * Purpose: Real file-system implementation of the Scaffolder (scaffolder seam).
 */
import fs from "fs";
import path from "path";
import {
  IScaffolder,
  ScaffoldInput,
  ScaffoldResult,
  GeneratedFile,
  ScaffoldSpec
} from "../../../contracts/scaffolder.contract.js";

export class ScaffolderAdapter implements IScaffolder {
  async scaffold(input: ScaffoldInput): Promise<ScaffoldResult> {
    const { seamName, baseDir, spec: rawSpec } = input;
    const generated: GeneratedFile[] = [];
    const spec = this.resolveSpec(seamName, rawSpec);

    const writeFile = (relPath: string, content: string, type: GeneratedFile["type"]) => {
      const fullPath = path.join(baseDir, relPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content.trim() + "\n");
      generated.push({ path: fullPath, type });
    };

    try {
      writeFile(`contracts/${seamName}.contract.ts`, this.renderContract(spec), "contract");
      writeFile(`probes/${seamName}.probe.ts`, this.renderProbe(spec), "probe");
      writeFile(`fixtures/${seamName}/sample.json`, this.renderFixture(spec), "fixture");
      writeFile(`src/lib/mocks/${seamName}.mock.ts`, this.renderMock(spec), "mock");
      writeFile(`tests/contract/${seamName}.test.ts`, this.renderContractTest(spec), "test");
      writeFile(`src/lib/adapters/${seamName}.adapter.ts`, this.renderAdapter(spec), "adapter");
      return { success: true, files: generated };
    } catch (err: any) {
      return { success: false, files: generated, message: err.message };
    }
  }

  private resolveSpec(seamName: string, spec?: ScaffoldSpec): ScaffoldSpec {
    return {
      seamName,
      description: spec?.description || `Seam: ${seamName}`,
      models: spec?.models || [],
      methods: spec?.methods || [{ name: "example", inputType: "void", outputType: "string" }],
      scenarios: spec?.scenarios || [{ name: "success", type: "success" }],
      errors: spec?.errors || []
    };
  }

  private renderContract(spec: ScaffoldSpec): string {
    const pascal = this.toPascal(spec.seamName);
    return [
      'import { z } from "zod";',
      'import { AppErrorCodeSchema } from "./store.contract.js";',
      '',
      `export interface I${pascal} {`,
      ...spec.methods.map(m => `  ${m.name}(${m.inputType && m.inputType !== 'void' ? `input: any` : ''}): Promise<${m.outputType || 'any'}>;`),
      '}'
    ].join('\n');
  }

  private renderProbe(spec: ScaffoldSpec): string {
    return [
      'import fs from "fs";',
      'import path from "path";',
      'import { fileURLToPath } from "url";',
      '',
      'const __dirname = path.dirname(fileURLToPath(import.meta.url));',
      `const FIXTURE_PATH = path.join(__dirname, "../../fixtures/${spec.seamName}/sample.json");`,
      '',
      'async function run() {',
      '  const fixture = { captured_at: new Date().toISOString(), scenarios: { success: { outputs: { example: "val" } } } };',
      '  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });',
      '  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));',
      '  console.log("Probe complete");',
      '}',
      'run().catch(console.error);'
    ].join('\n');
  }

  private renderFixture(spec: ScaffoldSpec): string {
    return JSON.stringify({ captured_at: new Date().toISOString(), scenarios: { success: { outputs: { example: "val" } } } }, null, 2);
  }

  private renderMock(spec: ScaffoldSpec): string {
    const pascal = this.toPascal(spec.seamName);
    return [
      'import fs from "fs";',
      'import { AppError } from "../../../contracts/store.contract.js";',
      `import type { I${pascal} } from "../../../contracts/${spec.seamName}.contract.js";`,
      '',
      `export class Mock${pascal} implements I${pascal} {`,
      '  private fixture: any;',
      '  constructor(private fixturePath: string, private scenario = "success") {',
      '    this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));',
      '  }',
      ...spec.methods.map(m => `  async ${m.name}(): Promise<any> { return this.fixture.scenarios[this.scenario].outputs.${m.name}; }`),
      '}'
    ].join('\n');
  }

  private renderContractTest(spec: ScaffoldSpec): string {
    const pascal = this.toPascal(spec.seamName);
    return [
      'import { describe, it } from "node:test";',
      'import assert from "node:assert";',
      `import { Mock${pascal} } from "../../src/lib/mocks/${spec.seamName}.mock.js";`,
      '',
      `describe("Mock${pascal}", () => {`,
      '  it("exists", () => assert.ok(true));',
      '});'
    ].join('\n');
  }

  private renderAdapter(spec: ScaffoldSpec): string {
    const pascal = this.toPascal(spec.seamName);
    return [
      'import { AppError } from "../../../contracts/store.contract.js";',
      `import type { I${pascal} } from "../../../contracts/${spec.seamName}.contract.js";`,
      '',
      `export class ${pascal}Adapter implements I${pascal} {`,
      '  constructor(private rootDir: string) {}',
      ...spec.methods.map(m => `  async ${m.name}(): Promise<any> { throw new Error("NYI"); }`),
      '}'
    ].join('\n');
  }

  private toPascal(s: string) {
    return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('');
  }
}