import fs from 'fs-extra';
import path from 'path';

import { ENVIRONMENT_DIRECTORIES } from './environment.constants';
import type { Config, EnvironmentStatus } from './environment.schemas';
import { EnvironmentStatusSchema } from './environment.schemas';

export async function inspectContractEnvironment(config: Config, contractFolderPath: string): Promise<EnvironmentStatus> {
  // Inspects the contract environment based on the provided configuration and contract folder path.
  // 1. Checks for the existence of required directories.
  // 2. Checks for the existence of required contract manifest files.
  // Returns an object representing the status of the environment.

  // ! Do not add process.cwd() here, it already should be added by the caller function.

  const environmentStatus = EnvironmentStatusSchema.parse({});

  environmentStatus.contractDirectoryExists = await fs.pathExists(contractFolderPath); // Most important folder
  if (!environmentStatus.contractDirectoryExists) return environmentStatus; // If main folder doesn't exist, return early

  for (const dir of ENVIRONMENT_DIRECTORIES) {
    // Check each required directory, mark as existing or not
    environmentStatus.directoriesExistence[dir] = await fs.pathExists(path.join(contractFolderPath, dir));
  }

  for (const contract of config.contracts) {
    // Check each contract manifest file existence.
    const manifestFilePath = path.join(contractFolderPath, 'manifests', `contract.${contract}.manifest.ts`);
    environmentStatus.manifestsExistence[contract] = await fs.pathExists(manifestFilePath);
  }

  return environmentStatus;
}
