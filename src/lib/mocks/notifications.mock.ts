import fs from "fs";
import type {
  INotificationCenter,
  Notification,
  NotificationInput,
  NotificationListOptions,
} from "../../../contracts/notifications.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockNotificationCenter implements INotificationCenter {
  private notifications: Notification[] = [];
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      const s = this.fixture.scenarios?.[this.scenario] || this.fixture.scenarios?.["success"];
      if (s?.outputs?.notifications) {
        this.notifications = s.outputs.notifications;
      }
    }
  }

  private getScenario(): any {
    const scenarios = this.fixture.scenarios ?? {};
    const scenario = scenarios[this.scenario] || scenarios["success"] || {};
    if (scenario.error) {
      const code = AppErrorCodeSchema.parse(scenario.error.code);
      throw new AppError(code, scenario.error.message);
    }
    return scenario;
  }

  async send(input: NotificationInput): Promise<Notification> {
    this.getScenario();
    const n: Notification = {
      id: "n-1",
      title: input.title,
      message: input.message,
      priority: input.priority ?? "normal",
      created_at: Date.now(),
    };
    this.notifications.push(n);
    return n;
  }

  async list(options: NotificationListOptions = {}): Promise<Notification[]> {
    this.getScenario();
    return this.notifications;
  }
}