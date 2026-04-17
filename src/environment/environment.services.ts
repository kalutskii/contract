import fs from 'fs-extra';
import path from 'path';

import { configFileCreationPrompt, environmentClearedMessage } from './environment.chat';
import { CONFIG_FILE_NAME, CONTRACT_DIRECTORY_NAME, DEFAULT_CONTRACTS, ENVIRONMENT_DIRECTORIES } from './environment.constants';
import { inspectContractEnvironment } from './environment.inspection';
import { loadConfigFile } from './environment.loader';
import { type Config, ConfigSchema, type EnvironmentStatus } from './environment.schemas';
import { renderConfigTemplate, renderManifestTemplate } from './environment.templates';

export async function createDefaultConfigFile(): Promise<Config> {
  // Creates a default configuration file and returns the default configuration object.

  const defaultConfig = ConfigSchema.parse({
    contracts: DEFAULT_CONTRACTS,
    package: { name: '@scope/contracts', version: '1.0.0' },
  });
  Bun.write(CONFIG_FILE_NAME, renderConfigTemplate(defaultConfig));
  return defaultConfig;
}

export async function getConfig(): Promise<Config> {
  // Dynamically imports and returns the configuration from the specified path.

  const config = await loadConfigFile(CONFIG_FILE_NAME);

  if (!config) {
    const shouldCreate = await configFileCreationPrompt(); // If no config found, prompt user to create one.
    if (shouldCreate) return await createDefaultConfigFile(); // If they agree, create default config file and return it.
    return process.exit(0);
  }

  return config;
}

export async function handleEnvironment(config: Config): Promise<EnvironmentStatus> {
  const contractFolderPath = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);

  // Create main contract directory if missing
  if (!environmentStatus.contractDirectoryExists) {
    fs.mkdirpSync(contractFolderPath);
    environmentStatus.contractDirectoryExists = true;
  }

  for (const dir of ENVIRONMENT_DIRECTORIES) {
    // Create missing directories (manifests, generated)
    if (!environmentStatus.directoriesExistence[dir]) {
      fs.mkdirpSync(path.join(contractFolderPath, dir));
      environmentStatus.directoriesExistence[dir] = true;
    }
  }

  const manifestsExistenceEntries = Object.entries(environmentStatus.manifestsExistence);
  for (const [contract, exists] of manifestsExistenceEntries) {
    if (!exists) {
      // Create missing manifest files for each contract that is enabled in config, but missing
      const manifestFilePath = path.join(contractFolderPath, 'manifests', `contract.${contract}.manifest.ts`);
      Bun.write(manifestFilePath, renderManifestTemplate(contract));
      environmentStatus.manifestsExistence[contract] = true;
    }
  }

  return environmentStatus;
}

export async function clearEnvironment(): Promise<void> {
  // Clears the existing contract environment by removing the main contract directory.

  const contractFolderPath = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  await fs.remove(contractFolderPath);
  environmentClearedMessage();
}

export async function updateConfigVersion(newVersion: string): Promise<void> {
  // Updates the version field in contract.config.ts
  // This is the canonical source of truth for package version.

  const configPath = path.resolve(CONFIG_FILE_NAME);

  // Read the current config file
  let content = await fs.readFile(configPath, 'utf-8');

  // Replace version: 'X.Y.Z' with version: 'new-version'
  // Matches: version: 'X.Y.Z' or version: "X.Y.Z"
  const versionRegex = /version:\s*['"][\d.]+['"]/;
  const replacement = `version: '${newVersion}'`;

  if (!versionRegex.test(content)) {
    throw new Error(`Could not find version field in ${configPath}`);
  }

  const updatedContent = content.replace(versionRegex, replacement);

  // Write updated config back to file
  await fs.writeFile(configPath, updatedContent, 'utf-8');
}
