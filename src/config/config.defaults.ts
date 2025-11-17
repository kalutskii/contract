import { Config } from './config.schemas.js';

export const defaultConfig: Config = {
  $schema: 'https://raw.githubusercontent.com/kalutskii/contract/refs/heads/main/static/contract.schema.json',
  appName: 'your-app',
  externalSources: [],
  contracts: [],
};
