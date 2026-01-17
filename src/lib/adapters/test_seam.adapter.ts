import { AppError } from "../../../contracts/store.contract.js";
import type { ITestSeam } from "../../../contracts/test_seam.contract.js";

export class TestSeamAdapter implements ITestSeam {
  constructor(private rootDir: string) {}
  async example(): Promise<any> { throw new Error("NYI"); }
}
