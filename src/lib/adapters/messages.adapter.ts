import { randomUUID } from "crypto";
import type { IMessageBridge, Message, UpdateEvent } from "../../../contracts/messages.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

export class MessageAdapter implements IMessageBridge {
  private readonly store: IStore;

  constructor(store: IStore) {
    this.store = store;
  }

  async post(sender: string, content: string, metadata?: Record<string, any>): Promise<Message> {
    return runTransaction(this.store, (current) => {
      const msg: Message = {
        id: randomUUID(),
        sender,
        content,
        timestamp: Date.now(),
        metadata
      };
      
      const messages = (current.messages as Message[]) || [];
      return {
        nextState: { ...current, messages: [...messages, msg] },
        result: msg
      };
    });
  }

  async list(limit: number = 50): Promise<Message[]> {
    const current = await this.store.load();
    const messages = (current.messages as Message[]) || [];
    return messages.slice(-limit);
  }

  async waitForUpdate(sinceRevision: number, timeoutMs: number = 1000): Promise<UpdateEvent | null> {
    // 1. Immediate check
    const current = await this.store.load();
    if (current.revision > sinceRevision) {
      return { revision: current.revision };
    }

    // 2. Wait
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;

      const listener = (rev: number) => {
        if (rev > sinceRevision) {
          cleanup();
          resolve({ revision: rev });
        }
      };

      const cleanup = () => {
        this.store.off('change', listener);
        clearTimeout(timer);
      };

      timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      this.store.on('change', listener);
    });
  }
}
