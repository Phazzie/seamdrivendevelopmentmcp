/**
 * Purpose: Define contract for event_stream (seam: event_stream).
 */
import { z } from "zod";

export const EventInputSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.string(), z.any()).optional(),
});
export type EventInput = z.input<typeof EventInputSchema>;

export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  data: z.record(z.string(), z.any()).optional(),
  timestamp: z.number(),
});
export type Event = z.infer<typeof EventSchema>;

export const EventListOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  type: z.string().optional(),
  since: z.number().optional(),
});
export type EventListOptions = z.input<typeof EventListOptionsSchema>;

export const EventSubscriptionSchema = z.object({
  type: z.string().optional(),
  since: z.number().optional(),
  limit: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
});
export type EventSubscription = z.input<typeof EventSubscriptionSchema>;

export const EventFixtureSchema = z.object({
  captured_at: z.string(),
  events: z.array(EventSchema),
});
export type EventFixture = z.infer<typeof EventFixtureSchema>;

export interface IEventStream {
  publish(input: EventInput): Promise<Event>;
  list(options?: EventListOptions): Promise<Event[]>;
  waitForEvents(options: EventSubscription): Promise<Event[] | null>;
}
