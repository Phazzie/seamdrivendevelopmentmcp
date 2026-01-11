import { z } from "zod";

export const AgentNameSchema = z.enum(["Gemini", "Codex", "Claude", "User", "System"]);
export type AgentName = z.infer<typeof AgentNameSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: AgentNameSchema,
  createdAt: z.number(),
  lastSeenAt: z.number(),
});

export type Agent = z.infer<typeof AgentSchema>;

export interface IAgentRegistry {
  register(name: string): Promise<Agent>; // Adapter validates string -> AgentName
  resolve(id: string): Promise<Agent>;
  list(): Promise<Agent[]>;
  touch(id: string): Promise<Agent>;
}
