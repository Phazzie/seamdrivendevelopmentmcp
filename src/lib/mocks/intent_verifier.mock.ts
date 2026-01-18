import { IIntentVerifier, IntentVerificationResult } from "../../../contracts/intent_verifier.contract.js";

export class MockIntentVerifier implements IIntentVerifier {
  constructor(private shouldApprove: boolean = true) {}

  async verify(plan: string, resources: string[]): Promise<IntentVerificationResult> {
    if (this.shouldApprove) {
      return { approved: true };
    }
    return { approved: false, reason: "Plan does not match resources." };
  }
}
