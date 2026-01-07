import { z } from "zod";

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string(),
  tool: z.string(),
  timestamp: z.number(),
  argsSummary: z.string(),
  resultSummary: z.string(),
  errorCode: z.string().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export interface AuditListFilter {
  agentId?: string;
  tool?: string;
  limit?: number;
}

export interface IAuditLog {
  record(
    agentId: string,
    tool: string,
    argsSummary: string,
    resultSummary: string,
    errorCode?: string
  ): Promise<AuditEvent>;

  list(filter?: AuditListFilter): Promise<AuditEvent[]>;
}
