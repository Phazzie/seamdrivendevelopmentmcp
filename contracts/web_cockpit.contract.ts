import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

export interface IWebCockpit {
  start(): Promise<void>;
  stop(): Promise<void>;
}
