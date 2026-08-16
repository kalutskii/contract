import { build } from 'esbuild';
import { tsconfigPathsPlugin } from 'esbuild-plugin-tsconfig-paths';

import { executeCommand } from '@/utilities/execution.utilities';

import { fatalErrorWhileBundlingMessage } from './build.messages';
import { resolveContractBundlePaths } from './build.paths';
import { getRuntimeExternalPackages } from './build.utilities';

import path from 'path';

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
  const externalPackages = await getRuntimeExternalPackages();

  try {
    await build({
      bundle: true,
      entryPoints: [paths.input],
      external: externalPackages,
      format: 'esm',
      logLevel: 'silent',
      outfile: paths.runtimeOutput,
      platform: 'neutral',
      plugins: [tsconfigPathsPlugin()],
      target: 'esnext',
      treeShaking: true,
      tsconfig: path.join(process.cwd(), 'tsconfig.json'),
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhileBundlingMessage(errorMessage);

    return false;
  }
}
