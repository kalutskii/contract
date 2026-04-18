import { spinner } from '@clack/prompts';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import type { Config } from '@/environment/environment.schemas';
import { executeCommand } from '@/utilities/exec.utilities';

import { bundlingCompletedMessage, bundlingStartedMessage, contractsBuildCompletedMessage } from './build.messages';

async function bundleContractDeclaration(app: string, contract: string): Promise<void> {
  const input = path.join(CONTRACT_DIRECTORY_NAME, 'manifests', `contract.${contract}.manifest.ts`);
  const output = path.join(CONTRACT_DIRECTORY_NAME, 'generated', `${app}.contract.${contract}.d.ts`);

  const progressSpinner = spinner();
  progressSpinner.start(bundlingStartedMessage(contract));

  const executed = await executeCommand('npx', ['dts-bundle-generator', '-o', output, input, '--no-check']);
  if (!executed) process.exit(1);

  progressSpinner.stop(bundlingCompletedMessage(contract, output));
}

/** Bundles declaration files for every contract configured in the project. */
export async function bundleAllContractDeclarations(config: Config): Promise<void> {
  await Promise.all(config.contracts.map((contract) => bundleContractDeclaration(config.app, contract)));
  contractsBuildCompletedMessage();
}
