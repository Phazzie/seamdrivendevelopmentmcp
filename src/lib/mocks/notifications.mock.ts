import fs from "fs";
import path from "path";
import type {
  INotificationCenter,
  Notification,
  NotificationInput,
  NotificationListOptions,
  NotificationPriority,
} from "../../../contracts/notifications.contract.js";

const FIXTURE_PATH = path.join(process.cwd(), "fixtures", "notifications", "sample.json");
const BASE_TIME = 1700000600000;

type NotificationFixture = {
  captured_at?: string;
  notifications?: Notification[];
};

function loadFixtureNotifications(): Notification[] {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as NotificationFixture;
  return Array.isArray(parsed.notifications) ? parsed.notifications : [];
}

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export class MockNotificationCenter implements INotificationCenter {
  private notifications: Notification[];
  private clock: number;
  private idIndex: number;

  constructor() {
    this.notifications = loadFixtureNotifications();
    const times = this.notifications.map((n) => n.created_at);
    const maxTime = times.length ? Math.max(...times) : BASE_TIME;
    this.clock = Math.max(BASE_TIME, maxTime + 1);
    this.idIndex = 1;
  }

  async send(input: NotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: this.nextId(),
      title: input.title,
      message: input.message,
      priority: input.priority ?? "normal",
      created_at: this.nextTime(),
    };
    this.notifications.push(notification);
    return notification;
  }

  async list(options: NotificationListOptions = {}): Promise<Notification[]> {
    let list = [...this.notifications];
    if (options.minPriority) {
      const minWeight = PRIORITY_WEIGHT[options.minPriority];
      list = list.filter((n) => PRIORITY_WEIGHT[n.priority] >= minWeight);
    }

    list.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.created_at - a.created_at;
    });

    const limit = options.limit ?? 50;
    return list.slice(0, limit);
  }

  private nextTime(): number {
    const value = this.clock;
    this.clock += 1;
    return value;
  }

  private nextId(): string {
    const value = this.idIndex.toString().padStart(12, "0");
    this.idIndex += 1;
    return `00000000-0000-0000-0000-${value}`;
  }
}
