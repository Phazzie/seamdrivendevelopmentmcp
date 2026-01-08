import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string().uuid(),
  sender: z.string(), // "codex", "gemini"
  content: z.string(),
  timestamp: z.number(),
  channelId: z.string().default("general"),
  threadId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessagePostOptionsSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
  channelId: z.string().default("general"),
  threadId: z.string().optional(),
});
export type MessagePostOptions = z.input<typeof MessagePostOptionsSchema>;

export const MessageListOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  channelId: z.string().optional(),
  threadId: z.string().optional(),
});
export type MessageListOptions = z.input<typeof MessageListOptionsSchema>;

export const UpdateEventSchema = z.object({
  revision: z.number(),
  // In the future we can add diffs here
});
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;

export interface IMessageBridge {
  /**
   * Append a message to the shared log.
   */
  post(sender: string, content: string, options?: MessagePostOptions): Promise<Message>;

  /**
   * Get recent messages.
   */
  list(options?: MessageListOptions): Promise<Message[]>;

  /**
   * Long Polling: Wait until the store revision > sinceRevision.
   * Returns null if timeout occurs.
   */
  waitForUpdate(sinceRevision: number, timeoutMs?: number): Promise<UpdateEvent | null>;
}
