/**
 * Purpose: Probe child_process behavior for the Probe Runner (probe_runner seam).
 * Verifies: exit code capturing, stdout/stderr isolation, and async spawn performance.
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.join(process.cwd(), 'fixtures/probe_runner');
if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

async function runProbe() {
  const results: any = {
    platform: process.platform,
    scenarios: []
  };

  // Scenario 1: Successful command
  const success = await exec('echo', ['hello world']);
  results.scenarios.push({ name: 'success', ...success });

  // Scenario 2: Failing command
  const fail = await exec('ls', ['/non-existent-directory-gemini-test']);
  results.scenarios.push({ name: 'fail', ...fail });

  fs.writeFileSync(path.join(FIXTURE_DIR, 'capabilities.json'), JSON.stringify({
    ...results,
    captured_at: new Date().toISOString()
  }, null, 2));
  console.log('Probe Runner capability probe complete.');
}

function exec(cmd: string, args: string[]): Promise<any> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data.toString());
    proc.stderr.on('data', (data) => stderr += data.toString());

    proc.on('close', (code) => {
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

runProbe().catch(console.error);
