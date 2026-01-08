import { randomUUID } from "crypto";
import type { IStore } from "../../../contracts/store.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import { runTransaction } from "../helpers/store.helper.js";
import {
  INotificationCenter,
  Notification,
  NotificationInput,
  NotificationInputSchema,
  NotificationListOptions,
  NotificationListOptionsSchema,
  NotificationPriority,
} from "../../../contracts/notifications.contract.js";

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export class NotificationAdapter implements INotificationCenter {
  constructor(private readonly store: IStore) {}

  async send(input: NotificationInput): Promise<Notification> {
    const parsed = NotificationInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid notification input.", {
        issues: parsed.error.issues,
      });
    }

    return runTransaction(this.store, (current) => {
      const now = Date.now();
      const notification: Notification = {
        id: randomUUID(),
        title: parsed.data.title,
        message: parsed.data.message,
        priority: parsed.data.priority ?? "normal",
        created_at: now,
      };

      const notifications = Array.isArray(current.notifications)
        ? (current.notifications as Notification[])
        : [];

      return {
        nextState: { ...current, notifications: [...notifications, notification] },
        result: notification,
      };
    });
  }

  async list(options: NotificationListOptions = {}): Promise<Notification[]> {
    const parsed = NotificationListOptionsSchema.safeParse(options ?? {});
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid notification list options.", {
        issues: parsed.error.issues,
      });
    }

    const current = await this.store.load();
    let notifications = Array.isArray(current.notifications)
      ? (current.notifications as Notification[])
      : [];

    if (parsed.data.minPriority) {
      const minWeight = PRIORITY_WEIGHT[parsed.data.minPriority];
      notifications = notifications.filter((notification) => {
        return PRIORITY_WEIGHT[notification.priority] >= minWeight;
      });
    }

    notifications.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.created_at - a.created_at;
    });

    const limit = parsed.data.limit ?? 50;
    return notifications.slice(0, limit);
  }
}
