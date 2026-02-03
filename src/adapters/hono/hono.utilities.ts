import fs from 'fs-extra';

import { CONFIG_FILE_NAME } from '@/environment/environment.constants';
import { loadConfigFile } from '@/environment/environment.loader';
import type { Config } from '@/environment/environment.schemas';

export async function getConfigSafely(): Promise<Config | null> {
  // Safely retrieves the configuration, returning null if not found.

  const config = await loadConfigFile(CONFIG_FILE_NAME);
  return config ?? null;
}

export async function readContractFile(contractFilePath: string): Promise<string | null> {
  // Reads and returns the content of a contract file, or null if not found.
  // ! Do not add process.cwd() here, it should be added by the caller function.

  try {
    return await fs.readFile(contractFilePath, 'utf-8');
  } catch {
    return null;
  }
}
