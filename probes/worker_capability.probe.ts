// Purpose: Probe to verify worker_threads capability and latency (seam: worker)
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

async function runProbe() {
  console.log('--- Worker Capability Probe ---');
  
  const startTime = Date.now();
  const results = {
    captured_at: new Date().toISOString(),
    env: {
      node_version: process.version,
      platform: process.platform,
    },
    capability: {
      worker_threads: false,
      latency_ms: -1,
    },
    error: null as string | null
  };

  try {
    // We create a simple worker script inline using a data URI or a temporary file
    // For this probe, we'll spawn this very file and check the isMainThread flag
    if (isMainThread) {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: { ping: 'pong' }
      });

      const latency = await new Promise<number>((resolve, reject) => {
        const start = Date.now();
        worker.on('message', (msg) => {
          if (msg === 'pong') {
            resolve(Date.now() - start);
          }
        });
        worker.on('error', reject);
        setTimeout(() => reject(new Error('Worker timeout')), 2000);
      });

      results.capability.worker_threads = true;
      results.capability.latency_ms = latency;
      await worker.terminate();
    }
  } catch (err: any) {
    results.error = err.message;
  }

  const fixtureDir = join(process.cwd(), 'fixtures', 'worker');
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(
    join(fixtureDir, 'capability.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`Probe complete. Latency: ${results.capability.latency_ms}ms`);
  process.exit(results.capability.worker_threads ? 0 : 1);
}

if (isMainThread) {
  runProbe();
} else {
  // Worker side
  if (parentPort) {
    parentPort.postMessage('pong');
  }
}
