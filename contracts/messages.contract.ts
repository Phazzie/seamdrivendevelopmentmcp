import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string().uuid(),
  sender: z.string(), // "codex", "gemini"
  content: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const UpdateEventSchema = z.object({
  revision: z.number(),
  // In the future we can add diffs here
});
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;

export interface IMessageBridge {
  /**
   * Append a message to the shared log.
   */
  post(sender: string, content: string, metadata?: Record<string, any>): Promise<Message>;

  /**
   * Get recent messages.
   */
  list(limit?: number): Promise<Message[]>;

  /**
   * Long Polling: Wait until the store revision > sinceRevision.
   * Returns null if timeout occurs.
   */
  waitForUpdate(sinceRevision: number, timeoutMs?: number): Promise<UpdateEvent | null>;
}
