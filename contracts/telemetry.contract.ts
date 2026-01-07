/**
 * Purpose: Define telemetry (log stream) interface (telemetry seam).
 */
import { z } from "zod";

export const LogLineSchema = z.object({
  source: z.string(), // e.g. "Gemini", "Codex"
  content: z.string(),
  timestamp: z.number()
});
export type LogLine = z.infer<typeof LogLineSchema>;

export const BufferStatusSchema = z.object({
  linesBuffered: z.number().int().nonnegative(),
  bytesBuffered: z.number().int().nonnegative(),
  usagePercent: z.number().min(0).max(100)
});
export type BufferStatus = z.infer<typeof BufferStatusSchema>;

export interface ITelemetryClient {
  /**
   * Tails a log file and yields new lines as they appear.
   */
  tail(sourceId: string, filePath: string): AsyncIterable<LogLine>;
  
  /**
   * Returns current buffer usage for a source.
   */
  getBufferStatus(sourceId: string): Promise<BufferStatus>;
}
