import fs from "fs";
import {
  IMessageBridge,
  Message,
  MessageListOptions,
  MessagePostOptions,
  UpdateEvent,
} from "../../../contracts/messages.contract.js";
import { AppError, AppErrorCodeSchema } from "../../../contracts/store.contract.js";

export class MockMessageBridge implements IMessageBridge {
  private fixture: any = {};

  constructor(private readonly fixturePath: string, private readonly scenario = "success") {
    if (fs.existsSync(fixturePath)) {
      this.fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
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

  async post(sender: string, content: string, options?: MessagePostOptions): Promise<Message> {
    this.getScenario();
    return { id: "m-1", sender, content, timestamp: Date.now(), channelId: "gen" };
  }

  async list(options?: MessageListOptions): Promise<Message[]> {
    this.getScenario();
    return [];
  }

  async waitForUpdate(sinceRevision: number, timeoutMs?: number): Promise<UpdateEvent | null> {
    this.getScenario();
    return null;
  }
}