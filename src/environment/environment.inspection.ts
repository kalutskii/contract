import fs from 'fs-extra';
import path from 'path';

import { ENVIRONMENT_DIRECTORIES } from './environment.constants';
import type { Config, EnvironmentStatus } from './environment.schemas';
import { EnvironmentStatusSchema } from './environment.schemas';

/** Inspects current environment directories and manifests required by config. */
export async function inspectContractEnvironment(config: Config, contractFolderPath: string): Promise<EnvironmentStatus> {
  const environmentStatus = EnvironmentStatusSchema.parse({});

  environmentStatus.contractDirectoryExists = await fs.pathExists(contractFolderPath);
  if (!environmentStatus.contractDirectoryExists) return environmentStatus;

  for (const dir of ENVIRONMENT_DIRECTORIES) {
    environmentStatus.directoriesExistence[dir] = await fs.pathExists(path.join(contractFolderPath, dir));
  }

  for (const contract of config.contracts) {
    const manifestFilePath = path.join(contractFolderPath, 'manifests', `contract.${contract}.manifest.ts`);
    environmentStatus.manifestsExistence[contract] = await fs.pathExists(manifestFilePath);
  }

  return environmentStatus;
}
