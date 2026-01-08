/**
 * Purpose: Define contract for priority_notifications (seam: notifications).
 */
import { z } from "zod";

export const NotificationPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const NotificationInputSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  priority: NotificationPrioritySchema.optional().default("normal"),
});
export type NotificationInput = z.input<typeof NotificationInputSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: NotificationPrioritySchema,
  created_at: z.number(),
  read_at: z.number().optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  minPriority: NotificationPrioritySchema.optional(),
});
export type NotificationListOptions = z.input<typeof NotificationListOptionsSchema>;

export const NotificationFixtureSchema = z.object({
  captured_at: z.string(),
  notifications: z.array(NotificationSchema),
});
export type NotificationFixture = z.infer<typeof NotificationFixtureSchema>;

export interface INotificationCenter {
  send(input: NotificationInput): Promise<Notification>;
  list(options?: NotificationListOptions): Promise<Notification[]>;
}
