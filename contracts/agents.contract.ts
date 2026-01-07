import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
});

export type Agent = z.infer<typeof AgentSchema>;

export interface IAgentRegistry {
  register(name: string): Promise<Agent>;
  resolve(id: string): Promise<Agent>;
  list(): Promise<Agent[]>;
  touch(id: string): Promise<Agent>;
}
