import { AppError } from "../../../contracts/store.contract.js";
import {
  ConfidenceAuctionInput,
  ConfidenceAuctionInputSchema,
  ConfidenceAuctionResult,
  IConfidenceAuction,
} from "../../../contracts/confidence_auction.contract.js";

export class ConfidenceAuctionAdapter implements IConfidenceAuction {
  async resolve(input: ConfidenceAuctionInput): Promise<ConfidenceAuctionResult> {
    const parsed = ConfidenceAuctionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid confidence auction input.", {
        issues: parsed.error.issues,
      });
    }

    const ranked = parsed.data.bids
      .map((bid, index) => ({ bid, index }))
      .sort((a, b) => {
        const diff = b.bid.confidence - a.bid.confidence;
        if (diff !== 0) return diff;
        return a.index - b.index;
      })
      .map((entry) => entry.bid);

    return { winner: ranked[0], ranking: ranked };
  }
}
