import fs from 'fs-extra';
import prompts from 'prompts';

import { defaultConfig } from './config.defaults.js';
import { Config, ConfigSchema } from './config.schemas.js';

const CONFIG_FILE = 'contract.config.json';

// Writes the default config to the config file.
const writeDefaultConfig = async () => fs.writeJson(CONFIG_FILE, defaultConfig, { spaces: 2 });

async function askForConfigRewrite(): Promise<boolean> {
  // Prompt the user to confirm if they want to rewrite the config file with default values.

  const response = await prompts({
    type: 'confirm',
    name: 'rewrite',
    message: 'The config file is invalid, do you want to rewrite it with default values?',
    initial: true,
  });
  return response.rewrite;
}

export async function readConfigFile(): Promise<Config> {
  // Check if the config file exists, if not, write the default config.
  if (!(await fs.pathExists(CONFIG_FILE))) {
    await writeDefaultConfig();
  }

  // Read and validate the config file (with zod).
  const rawContent = await fs.readFile(CONFIG_FILE, 'utf8');
  const parsedContent = ConfigSchema.safeParse(JSON.parse(rawContent));

  // If the content is invalid, ask the user if they want to
  // rewrite it with default values or throw an error.
  if (!parsedContent.success) {
    if (await askForConfigRewrite()) {
      await writeDefaultConfig();
      return defaultConfig;
    } else throw new Error(`Invalid config file: ${parsedContent.error.message}`);
  }

  return parsedContent.data;
}
