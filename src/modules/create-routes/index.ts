import fs from 'fs-extra';

import { readConfigFile } from '../../config/config.controllers.js';
import { Config } from '../../config/config.schemas.js';
import { askWhereToWriteRoutes } from './routes.controllers.js';
import { indexTemplate, repositoryTemplate, routesTemplate } from './routes.templates.js';

async function writeDefaultContractRoutes(config: Config): Promise<void> {
  // Writes the default contract routes files to the specified directory.
  // The directory is determined by user input through a prompt.

  const routesDirectoryPath = await askWhereToWriteRoutes();

  fs.ensureDirSync(routesDirectoryPath);
  const indexFilePath = `${routesDirectoryPath}/index.ts`;
  const routesFilePath = `${routesDirectoryPath}/contract.routes.ts`;
  const repositoryFilePath = `${routesDirectoryPath}/contract.repository.ts`;

  fs.writeFileSync(indexFilePath, indexTemplate);
  fs.writeFileSync(routesFilePath, routesTemplate(config.appName));
  fs.writeFileSync(repositoryFilePath, repositoryTemplate);

  console.log(`✅ Default contract routes written to ${routesFilePath}`);
}

export async function runCommand(): Promise<void> {
  // Entry point for writing the default contract routes files.

  const config = await readConfigFile();

  await writeDefaultContractRoutes(config);
}
