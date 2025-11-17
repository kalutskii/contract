import path from 'node:path';

import { build } from 'esbuild';
import fs from 'fs-extra';

import { Config, Contract } from '../../config/config.schemas.js';
import { executeCommand } from './build.utilities.js';

const CONTRACT_DIR = path.join(process.cwd(), 'contract');

export async function bundleRuntimeContract(config: Config, contract: Contract): Promise<void> {
  // This function will handle the bundling of runtime contracts.
  // Currently, it just reads the config file and logs the contracts.

  const input = path.join(CONTRACT_DIR, 'source', `contract.${contract.name}.source.ts`);
  const output = path.join(CONTRACT_DIR, 'export', `${config.appName}.contract.${contract.name}.ts`);

  const result = await build({
    entryPoints: [input],
    bundle: true,
    format: 'esm',
    write: false,
    treeShaking: true,
    minifySyntax: true,
    platform: 'node',
    target: 'es2022',
  });

  const content = result.outputFiles[0].text;
  await fs.writeFile(output, content);

  console.log(`✅ Runtime contract bundled to ${output}`);
}

export async function bundleDeclarationContract(config: Config, contract: Contract): Promise<void> {
  // This function will handle the bundling of contract declarations.
  // Currently, it just reads the config file and logs the contracts.

  const input = path.join(CONTRACT_DIR, 'source', `contract.${contract.name}.source.ts`);
  const output = path.join(CONTRACT_DIR, 'export', `${config.appName}.contract.${contract.name}.d.ts`);

  await executeCommand('npx', ['dts-bundle-generator', '-o', output, input, '--no-check']);
}
