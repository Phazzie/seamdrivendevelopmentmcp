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
    const spec = resolveSpec(seamName, rawSpec);

    // Helper to write file
    const writeFile = (relPath: string, content: string, type: GeneratedFile["type"]) => {
      const fullPath = path.join(baseDir, relPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content.trim() + "\n");
      generated.push({ path: fullPath, type });
    };

    try {
      // 1. Contract
      writeFile(
        `contracts/${seamName}.contract.ts`,
        renderContract(spec),
        "contract"
      );

      // 2. Probe
      writeFile(
        `probes/${seamName}.probe.ts`,
        renderProbe(spec),
        "probe"
      );

      // 3. Fixture (Empty placeholder)
      writeFile(
        `fixtures/${seamName}/sample.json`,
        renderFixture(spec),
        "fixture"
      );

      // 4. Mock
      writeFile(
        `src/lib/mocks/${seamName}.mock.ts`,
        renderMock(spec),
        "mock"
      );

      // 5. Test
      writeFile(
        `tests/contract/${seamName}.test.ts`,
        renderContractTest(spec),
        "test"
      );

      // 6. Adapter (Real)
      writeFile(
        `src/lib/adapters/${seamName}.adapter.ts`,
        renderAdapter(spec),
        "adapter"
      );

      return { success: true, files: generated };

    } catch (err: any) {
      return { success: false, files: generated, message: err.message };
    }
  }
}

function toPascalCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function resolveSpec(seamName: string, spec?: ScaffoldSpec): ScaffoldSpec {
  const fallback: ScaffoldSpec = {
    seamName,
    description: `TODO: describe ${seamName} seam`,
    models: [],
    methods: [],
    scenarios: [
      { name: "success", type: "success", description: "Happy path" }
    ],
    errors: []
  };
  if (!spec) return fallback;
  return {
    ...fallback,
    ...spec,
    seamName
  };
}

function renderContract(spec: ScaffoldSpec): string {
  const seamPascal = toPascalCase(spec.seamName);
  const declaredTypes = new Set(spec.models.map((model) => model.name));
  const referencedTypes = new Set<string>();

  spec.methods.forEach((method) => {
    if (method.inputType) referencedTypes.add(method.inputType);
    if (method.outputType) referencedTypes.add(method.outputType);
  });

  const placeholderTypes = Array.from(referencedTypes).filter((name) => !declaredTypes.has(name));

  const modelBlocks = spec.models.map((model) => {
    const fields = model.fields.map((field) => {
      const zod = zodForType(field.type);
      const comment = field.description ? ` // ${field.description}` : "";
      return `  ${field.name}: ${zod},${comment}`;
    });
    const body = fields.length ? `\n${fields.join("\n")}\n` : "\n  // TODO: add fields\n";
    return `export const ${model.name}Schema = z.object({${body}});\nexport type ${model.name} = z.infer<typeof ${model.name}Schema>;\n`;
  });

  const placeholderBlocks = placeholderTypes.map((name) => (
    `export const ${name}Schema = z.object({\n  // TODO: define fields for ${name}\n});\nexport type ${name} = z.infer<typeof ${name}Schema>;\n`
  ));

  const methodBlocks = spec.methods.map((method) => {
    const input = method.inputType ?? "unknown";
    const output = method.outputType ?? "unknown";
    const description = method.description ? `  // ${method.description}\n` : "";
    if (method.inputType) {
      return `${description}  ${method.name}(input: ${input}): Promise<${output}>;`;
    }
    return `${description}  ${method.name}(): Promise<${output}>;`;
  });

  const methodSection = methodBlocks.length
    ? methodBlocks.join("\n")
    : "  // TODO: define contract methods";

  const errorCodes = spec.errors.length
    ? spec.errors.map((err) => `// - ${err.code}: ${err.message}`).join("\n")
    : "// TODO: document expected error codes";

  return `/**
 * Purpose: Define contract for ${spec.seamName} (seam: ${spec.seamName}).
 */
import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

${modelBlocks.join("\n")}${placeholderBlocks.join("\n")}
export const ${seamPascal}ErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional()
});
export type ${seamPascal}Error = z.infer<typeof ${seamPascal}ErrorSchema>;

${errorCodes}

export interface I${seamPascal} {
${methodSection}
}
`;
}

function renderProbe(spec: ScaffoldSpec): string {
  const scenarioLines = buildScenarioLines(spec);
  return `/**
 * Purpose: Probe external reality for ${spec.seamName}.
 */
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "${spec.seamName}");
const FIXTURE_PATH = path.join(FIXTURE_DIR, "sample.json");

if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

async function runProbe() {
  // TODO: Implement probe logic
  const fixture = {
    captured_at: new Date().toISOString(),
    scenarios: {
${scenarioLines}
    }
  };

  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log("${spec.seamName} probe complete.");
}

runProbe().catch((err) => {
  console.error("PROBE FAILED:", err);
  process.exit(1);
});
`;
}

function renderFixture(spec: ScaffoldSpec): string {
  const scenarioLines = buildScenarioLines(spec);
  return `{
  "captured_at": "${new Date().toISOString()}",
  "scenarios": {
${scenarioLines}
  }
}
`;
}

function renderMock(spec: ScaffoldSpec): string {
  const seamPascal = toPascalCase(spec.seamName);
  const methodBlocks = spec.methods.map((method) => {
    const input = method.inputType ? `input: ${method.inputType}` : "";
    const output = method.outputType ?? "unknown";
    const args = input ? `(${input})` : "()";
    const note = method.description ? `  // ${method.description}\n` : "";
    return `${note}  async ${method.name}${args}: Promise<${output}> {
    return this.getOutput("${method.name}") as ${output};
  }`;
  });
  const methodSection = methodBlocks.length
    ? methodBlocks.join("\n\n")
    : "  // TODO: implement contract methods";

  return `/**
 * Purpose: Mock implementation for ${spec.seamName} using fixtures.
 */
import fs from "fs";
import path from "path";
import { AppError } from "../../../contracts/store.contract.js";
import type { I${seamPascal} } from "../../../contracts/${spec.seamName}.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "${spec.seamName}", "sample.json");

type ScenarioFixture = {
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string; details?: Record<string, unknown> };
};

type FixtureFile = {
  captured_at?: string;
  scenarios?: Record<string, ScenarioFixture>;
};

function loadFixture(): FixtureFile {
  if (!fs.existsSync(FIXTURE_PATH)) return {};
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as FixtureFile;
}

export class Mock${seamPascal} implements I${seamPascal} {
  private readonly fixture: FixtureFile;

  constructor(private scenario = "success") {
    this.fixture = loadFixture();
  }

  private getScenario(): ScenarioFixture {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario];
    if (!scenario) {
      throw new AppError("VALIDATION_FAILED", \`Unknown scenario: \${this.scenario}\`);
    }
    if (scenario.error) {
      throw new AppError(
        scenario.error.code as any,
        scenario.error.message,
        scenario.error.details
      );
    }
    return scenario;
  }

  private getOutput(method: string): unknown {
    const scenario = this.getScenario();
    if (!scenario.outputs || !(method in scenario.outputs)) {
      throw new AppError("VALIDATION_FAILED", \`Missing output for \${method}\`);
    }
    return scenario.outputs[method];
  }

${methodSection}
}
`;
}

function renderContractTest(spec: ScaffoldSpec): string {
  const seamPascal = toPascalCase(spec.seamName);
  const methodCalls = spec.methods.map((method) => {
    if (method.inputType) {
      return `      const input = {} as ${method.inputType};\n      const result = await adapter.${method.name}(input);\n      assert.ok(result);`;
    }
    return `      const result = await adapter.${method.name}();\n      assert.ok(result);`;
  });
  const methodSection = methodCalls.length
    ? methodCalls.join("\n\n")
    : "      assert.ok(true); // TODO: add contract assertions";

  return `/**
 * Purpose: Verify ${spec.seamName} contract compliance.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { I${seamPascal} } from "../../contracts/${spec.seamName}.contract.js";
import { Mock${seamPascal} } from "../../src/lib/mocks/${spec.seamName}.mock.js";

export function run${seamPascal}ContractTests(createAdapter: () => Promise<I${seamPascal}>) {
  describe("${seamPascal} Contract", () => {
    let adapter: I${seamPascal};

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("should satisfy contract scenarios", async () => {
${methodSection}
    });
  });
}

describe("Mock${seamPascal}", () => {
  run${seamPascal}ContractTests(async () => new Mock${seamPascal}());
});
`;
}

function renderAdapter(spec: ScaffoldSpec): string {
  const seamPascal = toPascalCase(spec.seamName);
  const methodBlocks = spec.methods.map((method) => {
    const input = method.inputType ? `input: ${method.inputType}` : "";
    const output = method.outputType ?? "unknown";
    const args = input ? `(${input})` : "()";
    const note = method.description ? `  // ${method.description}\n` : "";
    return `${note}  async ${method.name}${args}: Promise<${output}> {
    throw new AppError("INTERNAL_ERROR", "${seamPascal}.${method.name} not implemented");
  }`;
  });
  const methodSection = methodBlocks.length
    ? methodBlocks.join("\n\n")
    : "  // TODO: implement contract methods";

  return `/**
 * Purpose: Real implementation for ${spec.seamName}.
 */
import { AppError } from "../../../contracts/store.contract.js";
import type { I${seamPascal} } from "../../../contracts/${spec.seamName}.contract.js";

export class ${seamPascal}Adapter implements I${seamPascal} {
${methodSection}
}
`;
}

function zodForType(type: string): string {
  const trimmed = type.trim();
  let base = trimmed;
  let optional = false;

  if (base.endsWith("?")) {
    optional = true;
    base = base.slice(0, -1);
  }

  let zod: string;
  if (base.endsWith("[]")) {
    const inner = base.slice(0, -2);
    zod = `z.array(${zodForType(inner)})`;
  } else if (base.startsWith("array<") && base.endsWith(">")) {
    const inner = base.slice(6, -1);
    zod = `z.array(${zodForType(inner)})`;
  } else {
    switch (base) {
      case "string":
        zod = "z.string()";
        break;
      case "number":
        zod = "z.number()";
        break;
      case "boolean":
        zod = "z.boolean()";
        break;
      case "uuid":
        zod = "z.string().uuid()";
        break;
      case "json":
        zod = "z.record(z.string(), z.unknown())";
        break;
      case "unknown":
        zod = "z.unknown()";
        break;
      default:
        zod = "z.unknown()";
        break;
    }
  }

  return optional ? `${zod}.optional()` : zod;
}

function buildScenarioLines(spec: ScaffoldSpec): string {
  const scenarios = spec.scenarios.length
    ? spec.scenarios
    : [{ name: "success", type: "success", description: "Happy path" }];

  const methodNames = spec.methods.map((method) => method.name);
  const outputs = methodNames.length
    ? methodNames.map((name) => `        "${name}": { "note": "TODO: capture output for ${name}" }`).join(",\n")
    : `        "example": { "note": "TODO: capture output" }`;

  return scenarios.map((scenario) => {
    const description = scenario.description
      ? `      "description": "${scenario.description}",\n`
      : "";
    const errorBlock = scenario.type === "error"
      ? `      "error": { "code": "${spec.errors[0]?.code ?? "VALIDATION_FAILED"}", "message": "${spec.errors[0]?.message ?? "TODO: describe error"}" },\n`
      : "";
    return `      "${scenario.name}": {\n${description}${errorBlock}      "outputs": {\n${outputs}\n      }\n      }`;
  }).join(",\n");
}
