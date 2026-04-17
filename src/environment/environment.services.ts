import fs from 'fs-extra';
import path from 'path';

import { configFileCreationPrompt, environmentClearedMessage } from './environment.chat';
import { CONFIG_FILE_NAME, CONTRACT_DIRECTORY_NAME, DEFAULT_CONTRACTS, ENVIRONMENT_DIRECTORIES } from './environment.constants';
import { inspectContractEnvironment } from './environment.inspection';
import { loadConfigFile } from './environment.loader';
import { type Config, ConfigSchema, type EnvironmentStatus } from './environment.schemas';
import { renderConfigTemplate, renderManifestTemplate } from './environment.templates';

/** Creates a default contract config file and returns its parsed config object. */
export async function createDefaultConfigFile(): Promise<Config> {
  const defaultConfig = ConfigSchema.parse({
    contracts: DEFAULT_CONTRACTS,
    package: { name: '@scope/contracts', version: '1.0.0' },
  });

  await Bun.write(CONFIG_FILE_NAME, renderConfigTemplate(defaultConfig));
  return defaultConfig;
}

/** Returns current config, optionally creating a default one if the user agrees. */
export async function getConfig(): Promise<Config> {
  const config = await loadConfigFile(CONFIG_FILE_NAME);

  if (!config) {
    const shouldCreate = await configFileCreationPrompt();
    if (shouldCreate) return createDefaultConfigFile();
    return process.exit(0);
  }

  return config;
}

/** Ensures required environment directories and manifest files exist for all contracts. */
export async function handleEnvironment(config: Config): Promise<EnvironmentStatus> {
  const contractFolderPath = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);

  if (!environmentStatus.contractDirectoryExists) {
    fs.mkdirpSync(contractFolderPath);
    environmentStatus.contractDirectoryExists = true;
  }

  for (const dir of ENVIRONMENT_DIRECTORIES) {
    if (!environmentStatus.directoriesExistence[dir]) {
      fs.mkdirpSync(path.join(contractFolderPath, dir));
      environmentStatus.directoriesExistence[dir] = true;
    }
  }

  const manifestsExistenceEntries = Object.entries(environmentStatus.manifestsExistence);
  for (const [contract, exists] of manifestsExistenceEntries) {
    if (!exists) {
      const manifestFilePath = path.join(contractFolderPath, 'manifests', `contract.${contract}.manifest.ts`);
      await Bun.write(manifestFilePath, renderManifestTemplate(contract));
      environmentStatus.manifestsExistence[contract] = true;
    }
  }

  return environmentStatus;
}

/** Removes the generated contract environment directory. */
export async function clearEnvironment(): Promise<void> {
  const contractFolderPath = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  await fs.remove(contractFolderPath);
  environmentClearedMessage();
}

/** Updates only the version field inside the project config file. */
export async function updateConfigVersion(newVersion: string): Promise<void> {
  const configPath = path.resolve(CONFIG_FILE_NAME);
  const content = await fs.readFile(configPath, 'utf-8');
  const versionRegex = /version:\s*['"][\d.]+['"]/;
  const replacement = `version: '${newVersion}'`;

  if (!versionRegex.test(content)) {
    throw new Error(`Could not find version field in ${configPath}`);
  }

  const updatedContent = content.replace(versionRegex, replacement);
  await fs.writeFile(configPath, updatedContent, 'utf-8');
}
