import path from 'path';

import { configFileNotFoundMessage, invalidConfigMessage } from './environment.chat';
import { type Config, ConfigSchema } from './environment.schemas';

export async function loadConfigFile(configPath: string): Promise<Config | null> {
  // Imports and returns the configuration from the specified file path.

  try {
    const rawConfig = (await import(path.join(process.cwd(), configPath))).default;
    const config = await ConfigSchema.safeParseAsync(rawConfig); // Validate config with zod

    if (config.success) return config.data; // Valid config
    invalidConfigMessage(configPath, config.error.message); // Log validation errors
  } catch {
    configFileNotFoundMessage(configPath); // Log if config file is not found
  }
  return null;
}
