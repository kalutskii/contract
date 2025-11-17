import fs from 'fs-extra';

import { readConfigFile } from '../../config/config.controllers.js';
import { Config } from '../../config/config.schemas.js';
import { askWhereToWriteEndpoint } from './endpoint.controllers.js';
import { endpointsTemplate, indexTemplate, repositoryTemplate } from './endpoint.templates.js';

async function writeDefaultContractEndpoint(config: Config): Promise<void> {
  // Writes the default contract endpoint files to the specified directory.
  // The directory is determined by user input through a prompt.

  const endpointDirectoryPath = await askWhereToWriteEndpoint();

  fs.ensureDirSync(endpointDirectoryPath);
  const indexFilePath = `${endpointDirectoryPath}/index.ts`;
  const endpointsFilePath = `${endpointDirectoryPath}/contract.endpoints.ts`;
  const repositoryFilePath = `${endpointDirectoryPath}/contract.repository.ts`;

  fs.writeFileSync(indexFilePath, indexTemplate);
  fs.writeFileSync(endpointsFilePath, endpointsTemplate(config.appName));
  fs.writeFileSync(repositoryFilePath, repositoryTemplate);

  console.log(`✅ Default contract endpoint written to ${endpointsFilePath}`);
}

export async function runCommand(): Promise<void> {
  // Entry point for writing the default contract endpoint files.

  const config = await readConfigFile();

  await writeDefaultContractEndpoint(config);
}
