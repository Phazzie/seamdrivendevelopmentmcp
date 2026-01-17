import { z } from "zod";
import { AppErrorCodeSchema } from "./store.contract.js";

export interface ITestSeam {
  example(): Promise<string>;
}
