import { executeCommand } from '@/utilities/execution.utilities';

import { resolveContractBundlePaths } from './build.paths';

/** Bundles a single contract manifest into a generated declaration file. */
export async function bundleContractDeclaration(app: string, contract: string): Promise<boolean> {
  // 1) Resolve manifest input and declaration output paths.
  const paths = resolveContractBundlePaths(app, contract);

  // 2) Run declaration bundler and fail fast if command exits with error.
  return executeCommand('npx', ['dts-bundle-generator', '-o', paths.output, paths.input, '--no-check']);
}
