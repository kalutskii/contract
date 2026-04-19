import fs from 'fs-extra';
import path from 'path';

import { ENVIRONMENT_DIRECTORIES } from './environment.constants';
import type { Config, EnvironmentStatus } from './environment.schemas';
import { EnvironmentStatusSchema } from './environment.schemas';

/** Inspects current environment directories and manifests required by config. */
export async function inspectContractEnvironment(
  config: Config,
  contractFolderPath: string
): Promise<EnvironmentStatus> {
  const environmentStatus = EnvironmentStatusSchema.parse({});

  // 1) Check if main contract directory exists
  environmentStatus.contractDirectoryExists = await fs.pathExists(contractFolderPath);
  if (!environmentStatus.contractDirectoryExists) return environmentStatus;

  // 2) Check if required subdirectories exist
  for (const dir of ENVIRONMENT_DIRECTORIES) {
    environmentStatus.directoriesExistence[dir] = await fs.pathExists(path.join(contractFolderPath, dir));
  }

  // 3) Check if manifest files for configured contracts exist
  for (const contract of config.contracts) {
    const manifestFilePath = path.join(contractFolderPath, 'manifests', `contract.${contract}.manifest.ts`);
    environmentStatus.manifestsExistence[contract] = await fs.pathExists(manifestFilePath);
  }

  return environmentStatus;
}
