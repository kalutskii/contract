import { executeCommand } from '@/utilities/execution.utilities';

import { resolveContractBundlePaths } from './build.paths';

/** Bundles a single contract manifest into a generated declaration file. */
export async function bundleContractDeclaration(app: string, contract: string): Promise<boolean> {
  // 1) Resolve manifest input and declaration output paths.
  const paths = resolveContractBundlePaths(app, contract);

  // 2) Run declaration bundler and fail fast if command exits with error.
  return executeCommand('npx', ['dts-bundle-generator', '-o', paths.output, paths.input, '--no-check']);
}

/** Bundles a single contract manifest into a runtime JavaScript file. */
export async function bundleContractRuntime(app: string, contract: string): Promise<boolean> {
  const paths = resolveContractBundlePaths(app, contract);

  return executeCommand('npx', [
    'esbuild',
    paths.input,
    '--bundle',
    '--format=esm',
    '--platform=node',
    '--target=es2022',
    '--tree-shaking=true',
    '--minify-syntax',
    `--outfile=${paths.runtimeOutput}`,
  ]);
}
