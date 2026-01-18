// Purpose: Define the Intent Verifier contract (intelligence seam).
import { z } from "zod";

export const IntentVerificationResultSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional(),
});
export type IntentVerificationResult = z.infer<typeof IntentVerificationResultSchema>;

export interface IIntentVerifier {
  verify(plan: string, resources: string[]): Promise<IntentVerificationResult>;
}
