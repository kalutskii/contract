import fs from 'fs-extra';
import path from 'path';
import { pathToFileURL } from 'url';

import { configFileLoadFailedMessage, configFileNotFoundMessage, invalidConfigMessage } from './environment.chat';
import { type Config, ConfigSchema } from './environment.schemas';

interface ConfigModule {
  /** The default export of the config module, expected to match the Config schema. */
  default: unknown;
}

/** Resolves an absolute config path inside the current workspace. */
function resolveConfigModulePath(configPath: string): string {
  return path.join(process.cwd(), configPath);
}

/** Builds a file URL with cache-busting query so repeated reads see latest config file content. */
async function resolveConfigModuleUrl(modulePath: string): Promise<string> {
  const fileUrl = pathToFileURL(modulePath);
  const stat = await fs.stat(modulePath);
  fileUrl.searchParams.set('t', String(stat.mtimeMs));
  return fileUrl.href;
}

/** Loads and validates a config module from the given relative path. */
export async function loadConfigFile(configPath: string): Promise<Config | null> {
  const modulePath = resolveConfigModulePath(configPath);

  if (!(await fs.pathExists(modulePath))) {
    configFileNotFoundMessage(configPath);
    return null;
  }

  try {
    const moduleUrl = await resolveConfigModuleUrl(modulePath);
    const configModule = (await import(moduleUrl)) as ConfigModule;
    const config = await ConfigSchema.safeParseAsync(configModule.default);

    if (config.success) return config.data;

    invalidConfigMessage(configPath, config.error.message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    configFileLoadFailedMessage(configPath, errorMessage);
  }

  return null;
}
