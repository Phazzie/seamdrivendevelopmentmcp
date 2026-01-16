/**
 * Purpose: Define contract for test_seam (seam: test_seam).
 */
import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";


export const TestSeamErrorSchema = z.object({
  code: AppErrorCodeSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional()
});
export type TestSeamError = z.infer<typeof TestSeamErrorSchema>;

// TODO: document expected error codes

export interface ITestSeam {
  // TODO: define contract methods
}
