import { confirm, isCancel, log } from '@clack/prompts';

export async function initializePrompt(): Promise<boolean> {
  // Prompts the user to confirm whether they want to reinitialize the environment.

  const shouldInitialize = await confirm({
    message: 'If contract is already initialized, reinitialization will cause existing files to be overwritten. Do you want to proceed?',
    initialValue: false,
  });
  return isCancel(shouldInitialize) ? false : shouldInitialize;
}

export async function configFileCreationPrompt(): Promise<boolean> {
  // Prompts the user to confirm whether they want to create a new configuration file.

  const shouldCreate = await confirm({ message: 'No configuration found. Would you like to create one?', initialValue: true });
  return isCancel(shouldCreate) ? false : shouldCreate;
}

export const environmentClearedMessage = () => log.success('Existing contract environment cleared.');
export const invalidConfigMessage = (configPath: string, errorMessage: string) =>
  log.error(`Invalid config format at ${configPath}: ${errorMessage}`);
export const configFileNotFoundMessage = (configPath: string) =>
  log.warn(`Config not found at ${configPath}, running initialization script.`);
