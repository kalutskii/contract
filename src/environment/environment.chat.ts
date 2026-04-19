import { confirm, isCancel, log } from '@clack/prompts';

/** Asks whether existing environment files should be reinitialized. */
export async function initializePrompt(): Promise<boolean> {
  const shouldInitialize = await confirm({
    message:
      'If contract is already initialized, reinitialization will cause existing files to be overwritten. Do you want to proceed?',
    initialValue: true,
  });
  return isCancel(shouldInitialize) ? false : shouldInitialize;
}

/** Asks whether a new default config file should be created. */
export async function configFileCreationPrompt(): Promise<boolean> {
  const shouldCreate = await confirm({
    message: 'No configuration found. Would you like to create one?',
    initialValue: true,
  });
  return isCancel(shouldCreate) ? false : shouldCreate;
}

/** Logs successful environment cleanup. */
export const environmentClearedMessage = (): void => log.success('Existing contract environment cleared.');
/** Logs schema validation issues for config files. */
export const invalidConfigMessage = (configPath: string, errorMessage: string): void =>
  log.error(`Invalid config format at ${configPath}: ${errorMessage}`);
/** Logs that the config file is missing and user may create a default one. */
export const configFileNotFoundMessage = (configPath: string): void => log.warn(`Config not found at ${configPath}.`);
/** Logs that config file exists but could not be loaded as a module. */
export const configFileLoadFailedMessage = (configPath: string, errorMessage: string): void =>
  log.error(`Failed to load config at ${configPath}: ${errorMessage}`);
