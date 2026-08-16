import { build } from 'esbuild';
import { rolldown } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

import { fatalErrorWhileBundlingMessage } from './build.messages';
import { resolveContractBundlePaths } from './build.paths';
import { getRuntimeExternalPackages } from './build.utilities';

import fs from 'fs/promises';
import path from 'path';

/** Bundles a single contract manifest into a generated declaration file. */
export async function bundleContractDeclaration(app: string, contract: string): Promise<boolean> {
  const paths = resolveContractBundlePaths(app, contract);
  const externalPackages = await getRuntimeExternalPackages();
  const isExternalPackage = (id: string): boolean =>
    externalPackages.some(
      (packageName) => id === packageName || (packageName.endsWith('/*') && id.startsWith(packageName.slice(0, -1)))
    );

  try {
    const bundle = await rolldown({
      external: isExternalPackage,
      input: paths.input,
      logLevel: 'silent',
      plugins: [
        dts({
          emitDtsOnly: true,
          tsconfig: path.join(process.cwd(), 'tsconfig.json'),
        }),
      ],
    });

    try {
      const generated = await bundle.generate({
        dir: path.dirname(paths.output),
        entryFileNames: path.basename(paths.output),
        format: 'es',
      });
      const declaration = generated.output.find(
        (output) => output.type === 'chunk' && output.facadeModuleId?.endsWith('.d.ts')
      );

      if (!declaration || declaration.type !== 'chunk') {
        throw new Error(`Failed to produce declaration output for ${paths.input}.`);
      }

      await fs.writeFile(paths.output, declaration.code);
    } finally {
      await bundle.close();
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhileBundlingMessage(errorMessage);

    return false;
  }
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
