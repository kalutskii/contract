import fs from 'fs-extra';
import path from 'path';

import { configFileCreationPrompt, environmentClearedMessage } from './environment.chat';
import {
  CONFIG_FILE_NAME,
  CONTRACT_DIRECTORY_NAME,
  DEFAULT_CONTRACTS,
  ENVIRONMENT_DIRECTORIES,
} from './environment.constants';
import { inspectContractEnvironment } from './environment.inspection';
import { loadConfigFile } from './environment.loader';
import { type Config, ConfigSchema, type EnvironmentStatus } from './environment.schemas';
import { renderConfigTemplate, renderManifestTemplate } from './environment.templates';

/** Resolves the root directory for generated contract environment artifacts. */
function getContractRootPath(): string {
  return path.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
}

/** Resolves the project config file path on disk. */
function getConfigFilePath(): string {
  return path.resolve(CONFIG_FILE_NAME);
}

/** Ensures required environment directories exist and updates status in place. */
async function ensureEnvironmentDirectories(
  contractFolderPath: string,
  environmentStatus: EnvironmentStatus
): Promise<void> {
  if (!environmentStatus.contractDirectoryExists) {
    await fs.ensureDir(contractFolderPath);
    environmentStatus.contractDirectoryExists = true;
  }

  for (const dir of ENVIRONMENT_DIRECTORIES) {
    if (!environmentStatus.directoriesExistence[dir]) {
      await fs.ensureDir(path.join(contractFolderPath, dir));
      environmentStatus.directoriesExistence[dir] = true;
    }
  }
}

/** Creates missing manifest files for contracts enabled in config. */
async function ensureManifestFiles(contractFolderPath: string, environmentStatus: EnvironmentStatus): Promise<void> {
  for (const [contract, exists] of Object.entries(environmentStatus.manifestsExistence)) {
    if (!exists) {
      const manifestFilePath = path.join(contractFolderPath, 'manifests', `contract.${contract}.manifest.ts`);
      await Bun.write(manifestFilePath, renderManifestTemplate(contract));
      environmentStatus.manifestsExistence[contract] = true;
    }
  }
}

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
  const contractFolderPath = getContractRootPath();
  const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);

  await ensureEnvironmentDirectories(contractFolderPath, environmentStatus);
  await ensureManifestFiles(contractFolderPath, environmentStatus);

  return environmentStatus;
}

/** Removes the generated contract environment directory. */
export async function clearEnvironment(): Promise<void> {
  const contractFolderPath = getContractRootPath();
  await fs.remove(contractFolderPath);
  environmentClearedMessage();
}

/** Updates only the version field inside the project config file. */
export async function updateConfigVersion(newVersion: string): Promise<void> {
  const configPath = getConfigFilePath();
  const content = await fs.readFile(configPath, 'utf-8');

  // Update only the version field inside the package config block.
  const packageVersionRegex = /(package:\s*\{[\s\S]*?version:\s*['"])([^'"]+)(['"])/;

  if (!packageVersionRegex.test(content)) {
    throw new Error(`Could not find version field in ${configPath}`);
  }

  const updatedContent = content.replace(packageVersionRegex, `$1${newVersion}$3`);
  await fs.writeFile(configPath, updatedContent, 'utf-8');
}
