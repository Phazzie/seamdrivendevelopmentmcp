import type { ITestSeam } from "../../../contracts/test_seam.contract.js";

export class TestSeamAdapter implements ITestSeam {
  constructor(private readonly rootDir: string) {}

  async example(): Promise<string> {
    return `test_seam:${this.rootDir}`;
  }
}
