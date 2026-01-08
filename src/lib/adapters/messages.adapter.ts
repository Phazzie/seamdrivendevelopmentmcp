import { randomUUID } from "crypto";
import {
  IMessageBridge,
  Message,
  MessageListOptions,
  MessageListOptionsSchema,
  MessagePostOptions,
  MessagePostOptionsSchema,
  UpdateEvent,
} from "../../../contracts/messages.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { IStore, PersistedStore } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";

export class MessageAdapter implements IMessageBridge {
  private readonly store: IStore;

  constructor(store: IStore) {
    this.store = store;
  }

  async post(sender: string, content: string, options: MessagePostOptions = {}): Promise<Message> {
    const parsed = MessagePostOptionsSchema.safeParse(options ?? {});
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid message options.", {
        issues: parsed.error.issues,
      });
    }

    return runTransaction(this.store, (current) => {
      const msg: Message = {
        id: randomUUID(),
        sender,
        content,
        timestamp: Date.now(),
        channelId: parsed.data.channelId ?? "general",
        threadId: parsed.data.threadId,
        metadata: parsed.data.metadata
      };
      
      const messages = normalizeMessages((current.messages as MessageRecord[]) || []);
      return {
        nextState: { ...current, messages: [...messages, msg] },
        result: msg
      };
    });
  }

  async list(options: MessageListOptions = {}): Promise<Message[]> {
    const parsed = MessageListOptionsSchema.safeParse(options ?? {});
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid message list options.", {
        issues: parsed.error.issues,
      });
    }

    const current = await this.store.load();
    const messages = normalizeMessages((current.messages as MessageRecord[]) || []);
    let filtered = messages;
    if (parsed.data.channelId) {
      filtered = filtered.filter((message) => message.channelId === parsed.data.channelId);
    }
    if (parsed.data.threadId) {
      filtered = filtered.filter((message) => message.threadId === parsed.data.threadId);
    }
    const limit = parsed.data.limit ?? 50;
    return filtered.slice(-limit);
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

type MessageRecord = Message & { channelId?: string };

function normalizeMessages(messages: MessageRecord[]): Message[] {
  return messages.map((message) => ({
    ...message,
    channelId: message.channelId ?? "general",
  }));
}
