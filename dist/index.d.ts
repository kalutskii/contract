import { z } from "zod";
//#region src/environment/environment.schemas.d.ts
/** Strongly-typed contract config accepted by the project. */
interface Config {
  app: string;
  contracts: string[];
  emit: string[];
  package: {
    name: string;
    version: string;
    exports?: Record<string, string>;
  };
  npm?: {
    token: string;
  };
}
//#endregion
export type { Config };