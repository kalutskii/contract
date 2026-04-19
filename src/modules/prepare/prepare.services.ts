import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import type { Config } from '@/environment/environment.schemas';
import { getContractState } from '@/modules/versioning/versioning.services';

import { collectExistingGeneratedContracts, writePreparedArtifacts } from './prepare.artifacts';
import {
  fatalErrorWhilePreparingPackageMessage,
  missingGeneratedContractsMessage,
  packageFilesCreatedMessage,
  packageJsonGeneratedMessage,
  packagePreparationCompletedMessage,
  packagePreparationStartedMessage,
} from './prepare.messages';
import type { PrepareOptions } from './prepare.types';
import { applyPrepareVersioning } from './prepare.versioning';

/** Builds the publishable package directory from generated contract declarations. */
export async function prepareContractPackage(config: Config, options: PrepareOptions = {}): Promise<void> {
  try {
    // Step 1: Start flow and resolve contracts that have generated declarations.
    packagePreparationStartedMessage(config.app);
    const existingContracts = await collectExistingGeneratedContracts(config, missingGeneratedContractsMessage);

    if (existingContracts.length === 0) {
      throw new Error('No generated contracts found. Run "contract build" first.');
    }

    // Step 2: Read previous hash state BEFORE recreating package directory.
    const packageDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'package');
    const previousState = await getContractState(packageDir);

    // Step 3: Recreate package artifacts (d.ts, js stubs, package.json).
    const { packageJsonPath, baseVersion } = await writePreparedArtifacts(config, packageDir, existingContracts);
    packageFilesCreatedMessage(packageDir);

    // Step 4: Apply manual/automatic versioning and persist hash state.
    await applyPrepareVersioning({
      config,
      packageDir,
      packageJsonPath,
      contracts: existingContracts,
      baseVersion,
      previousHash: previousState?.hash ?? null,
      options,
    });

    // Step 5: Finish and report success.
    packageJsonGeneratedMessage(config.package.name);
    packagePreparationCompletedMessage();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePreparingPackageMessage(errorMessage);
    process.exit(1);
  }
}
