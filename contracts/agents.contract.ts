import { z } from "zod";

export const AgentNameSchema = z.enum(["Gemini", "Codex", "Claude", "User", "System"]);
export type AgentName = z.infer<typeof AgentNameSchema>;
export const AgentSelfNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/);
export type AgentSelfName = z.infer<typeof AgentSelfNameSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: AgentNameSchema,
  selfName: AgentSelfNameSchema,
  createdAt: z.number(),
  lastSeenAt: z.number(),
});

export type Agent = z.infer<typeof AgentSchema>;

export interface IAgentRegistry {
  register(name: string, selfName: string): Promise<Agent>;
  resolve(id: string): Promise<Agent>;
  list(): Promise<Agent[]>;
  touch(id: string): Promise<Agent>;
}
