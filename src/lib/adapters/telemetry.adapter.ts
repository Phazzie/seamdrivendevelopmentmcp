/**
 * Purpose: Real file-system based telemetry adapter (telemetry seam).
 */
import * as fs from 'fs';
import * as readline from 'readline';
import { BufferStatus, ITelemetryClient, LogLine } from "../../../contracts/telemetry.contract.js";

const MAX_BUFFER_LINES = 1000;

export class TelemetryAdapter implements ITelemetryClient {
  async *tail(sourceId: string, filePath: string): AsyncIterable<LogLine> {
    if (!fs.existsSync(filePath)) return;

    let currentSize = fs.statSync(filePath).size;
    let streamActive = true;

    // Use a simple polling/watch mechanism similar to the probe
    // Note: In a real long-running app, we might use chokidar, 
    // but per SDD we stick to what the probe verified (fs.watch).
    
    const watcher = fs.watch(filePath, { persistent: false });
    const events: string[] = [];
    
    watcher.on('change', () => events.push('change'));
    watcher.on('rename', () => events.push('rename'));

    try {
      while (streamActive) {
        // Wait for event or timeout
        await new Promise(resolve => setTimeout(resolve, 100));

        if (events.length === 0) continue;
        events.length = 0; // Clear events

        if (!fs.existsSync(filePath)) {
           // Handle rotation/deletion logic if needed, or just exit
           streamActive = false;
           break;
        }

        const stat = fs.statSync(filePath);
        if (stat.size > currentSize) {
          const stream = fs.createReadStream(filePath, {
            start: currentSize,
            end: stat.size
          });

          const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
          });

          for await (const line of rl) {
            yield {
              source: sourceId,
              content: line,
              timestamp: Date.now()
            };
          }
          
          currentSize = stat.size;
        } else if (stat.size < currentSize) {
          // File truncated/rotated
          currentSize = 0;
        }
      }
    } finally {
      watcher.close();
    }
  }

  async getBufferStatus(sourceId: string): Promise<BufferStatus> {
    // In a real implementation, this might track the internal buffer of the log stream.
    // For this FS-based adapter, we don't have an internal buffer to overflow,
    // so we report healthy.
    return {
      linesBuffered: 0,
      bytesBuffered: 0,
      usagePercent: 0
    };
  }
}
