import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import { GavelState, IArbitration } from "../../../contracts/arbitration.contract.js";

export class ArbitrationAdapter implements IArbitration {
  constructor(private readonly store: IStore) {}

  async getState(): Promise<GavelState> {
    const current = await this.store.load();
    return current.arbitration as GavelState;
  }

  async request(agentId: string): Promise<GavelState> {
    if (!agentId) {
      throw new AppError("VALIDATION_FAILED", "agentId is required.");
    }

    return runTransaction(this.store, (current) => {
      const state = current.arbitration as GavelState;
      if (state.status !== "idle") {
        throw new AppError("VALIDATION_FAILED", "Gavel is already in use.");
      }

      const nextState: GavelState = {
        status: "requested",
        requestedBy: agentId,
        updated_at: Date.now(),
      };

      return {
        nextState: { ...current, arbitration: nextState },
        result: nextState,
      };
    });
  }

  async grant(targetAgentId: string): Promise<GavelState> {
    if (!targetAgentId) {
      throw new AppError("VALIDATION_FAILED", "targetAgentId is required.");
    }

    return runTransaction(this.store, (current) => {
      const state = current.arbitration as GavelState;
      if (state.status !== "requested") {
        throw new AppError("VALIDATION_FAILED", "Gavel must be requested before granting.");
      }

      const nextState: GavelState = {
        status: "granted",
        requestedBy: state.requestedBy,
        grantedTo: targetAgentId,
        updated_at: Date.now(),
      };

      return {
        nextState: { ...current, arbitration: nextState },
        result: nextState,
      };
    });
  }

  async release(): Promise<GavelState> {
    return runTransaction(this.store, (current) => {
      const nextState: GavelState = {
        status: "idle",
        updated_at: Date.now(),
      };

      return {
        nextState: { ...current, arbitration: nextState },
        result: nextState,
      };
    });
  }
}
