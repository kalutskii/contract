import path from 'path';

import { configFileNotFoundMessage, invalidConfigMessage } from './environment.chat';
import { type Config, ConfigSchema } from './environment.schemas';

interface ConfigModule {
  /** The default export of the config module, expected to match the Config schema. */
  default: unknown;
}

/** Loads and validates a config module from the given relative path. */
export async function loadConfigFile(configPath: string): Promise<Config | null> {
  try {
    const modulePath = path.join(process.cwd(), configPath);
    const configModule = (await import(modulePath)) as ConfigModule;
    const config = await ConfigSchema.safeParseAsync(configModule.default);

    if (config.success) return config.data;
    invalidConfigMessage(configPath, config.error.message);
  } catch {
    configFileNotFoundMessage(configPath);
  }

  return null;
}
