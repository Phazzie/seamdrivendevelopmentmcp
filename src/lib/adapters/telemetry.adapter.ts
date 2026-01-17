/**
 * Purpose: Real file-system based telemetry adapter (telemetry seam).
 */
import fs from "fs/promises";
import { createReadStream, watch } from "fs";
import * as readline from "readline";
import { BufferStatus, ITelemetryClient, LogLine } from "../../../contracts/telemetry.contract.js";

const MAX_BUFFER_LINES = 1000;

export class TelemetryAdapter implements ITelemetryClient {
  async *tail(sourceId: string, filePath: string): AsyncIterable<LogLine> {
    try {
      await fs.access(filePath);
    } catch {
      return;
    }

    let currentSize = (await fs.stat(filePath)).size;
    let streamActive = true;

    const watcher = watch(filePath, { persistent: false });
    const events: string[] = [];
    
    watcher.on("change", () => events.push("change"));
    watcher.on("rename", () => events.push("rename"));

    try {
      while (streamActive) {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (events.length === 0) continue;
        events.length = 0; 

        try {
          await fs.access(filePath);
        } catch {
           streamActive = false;
           break;
        }

        const stat = await fs.stat(filePath);
        if (stat.size > currentSize) {
          const stream = createReadStream(filePath, {
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
          currentSize = 0;
        }
      }
    } finally {
      watcher.close();
    }
  }

  async getBufferStatus(sourceId: string): Promise<BufferStatus> {
    return {
      linesBuffered: 0,
      bytesBuffered: 0,
      usagePercent: 0
    };
  }
}