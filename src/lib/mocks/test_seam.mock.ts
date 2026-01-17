import fs from "fs";
import { AppError } from "../../../contracts/store.contract.js";
import type { ITestSeam } from "../../../contracts/test_seam.contract.js";

export class MockTestSeam implements ITestSeam {
  private fixture: any;
  constructor(private fixturePath: string, private scenario = "success") {
    this.fixture = JSON.parse(fs["readFileSync"](fixturePath, "utf-8"));
  }
  async example(): Promise<any> { return this.fixture.scenarios[this.scenario].outputs.example; }
}
