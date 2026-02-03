import { spinner } from '@clack/prompts';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import type { Config } from '@/environment/environment.schemas';
import { executeCommand } from '@/utilities/exec.utilities';

import {
  bundlingCompletedMessage,
  bundlingStartedMessage,
  contractsBuildCompletedMessage,
  fatalErrorWhileBundlingMessage,
} from './build.messages';

async function bundleContractDeclaration(app: string, contract: string) {
  // Bundles the TypeScript declaration file for the specified contract using dts-bundle-generator.

  const input = path.join(CONTRACT_DIRECTORY_NAME, 'manifests', `contract.${contract}.manifest.ts`);
  const output = path.join(CONTRACT_DIRECTORY_NAME, 'generated', `${app}.contract.${contract}.d.ts`);

  const progressSpinner = spinner();
  progressSpinner.start(bundlingStartedMessage(contract));
  const executed = await executeCommand('npx', ['dts-bundle-generator', '-o', output, input, '--no-check']);
  if (!executed) process.exit(1);
  progressSpinner.stop(bundlingCompletedMessage(contract, output));
}

export async function bundleAllContractDeclarations(config: Config) {
  // Bundles TypeScript declaration files for all contracts defined in the configuration.

  await Promise.all(config.contracts.map((contract) => bundleContractDeclaration(config.app, contract)));
  contractsBuildCompletedMessage();
}
