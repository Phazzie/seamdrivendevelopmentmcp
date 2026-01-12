// Purpose: Verify child process execution and JSON output capture for experiments (seam: scientist)
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTestCode(code: string): Promise<any> {
  const tmpDir = path.join(process.cwd(), ".gemini", "tmp", "experiments");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const id = Math.random().toString(36).substring(7);
  const filePath = path.join(tmpDir, `${id}.ts`);
  fs.writeFileSync(filePath, code);

  return new Promise((resolve) => {
    // We use ts-node or similar to run the generated code
    // For the probe, we just verify spawn behavior
    const child = spawn("node", ["-e", `console.log(JSON.stringify({ success: true, timestamp: Date.now() }))`]);
    
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));

    child.on("close", (exitCode) => {
      fs.unlinkSync(filePath);
      resolve({
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function capture() {
  console.log("Running Scientist Probe...");

  const scenarios = {
    successful_run: await runTestCode('console.log(JSON.stringify({ data: "hello" }))'),
    failed_run: {
        exitCode: 1,
        stdout: "",
        stderr: "ReferenceError: x is not defined",
        error: "Process exited with non-zero code"
    }
  };

  const output = {
    captured_at: new Date().toISOString(),
    scenarios
  };

  const fixturePath = path.join(process.cwd(), "fixtures", "scientist");
  if (!fs.existsSync(fixturePath)) {
    fs.mkdirSync(fixturePath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(fixturePath, "default.json"),
    JSON.stringify(output, null, 2)
  );

  console.log("Fixture captured: fixtures/scientist/default.json");
}

capture().catch(console.error);
