import type { Config } from '@/environment/environment.schemas';

/** CLI options accepted by prepare:package command. */
export interface PrepareOptions {
  bump?: 'patch' | 'minor' | 'major';
  noBump?: boolean;
}

/** Minimal package.json shape needed for version updates. */
export interface PackageJsonWithVersion {
  version: string;
}

/** Context object used by versioning flow during prepare. */
export interface PrepareVersioningContext {
  config: Config;
  packageDir: string;
  packageJsonPath: string;
  contracts: string[];
  baseVersion: string;
  previousHash: string | null;
  options: PrepareOptions;
}
