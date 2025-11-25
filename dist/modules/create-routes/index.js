// src/modules/create-routes/index.ts
import fs2 from "fs-extra";

// src/config/config.controllers.ts
import fs from "fs-extra";
import prompts from "prompts";

// src/config/config.defaults.ts
var defaultConfig = {
  $schema: "https://raw.githubusercontent.com/kalutskii/contract/refs/heads/main/static/contract.schema.json",
  appName: "your-app",
  externalSources: [],
  contracts: []
};

// src/config/config.schemas.ts
import z from "zod";
var ContractSchema = z.object({
  name: z.string(),
  emit: z.boolean().optional()
});
var ConfigSchema = z.object({
  $schema: z.url(),
  appName: z.string(),
  externalSources: z.array(z.string()),
  contracts: z.array(ContractSchema)
});

// src/config/config.controllers.ts
var CONFIG_FILE = "contract.config.json";
var writeDefaultConfig = async () => fs.writeJson(CONFIG_FILE, defaultConfig, { spaces: 2 });
async function askForConfigRewrite() {
  const response = await prompts({
    type: "confirm",
    name: "rewrite",
    message: "The config file is invalid, do you want to rewrite it with default values?",
    initial: true
  });
  return response.rewrite;
}
async function readConfigFile() {
  if (!await fs.pathExists(CONFIG_FILE)) {
    await writeDefaultConfig();
  }
  const rawContent = await fs.readFile(CONFIG_FILE, "utf8");
  const parsedContent = ConfigSchema.safeParse(JSON.parse(rawContent));
  if (!parsedContent.success) {
    if (await askForConfigRewrite()) {
      await writeDefaultConfig();
      return defaultConfig;
    } else throw new Error(`Invalid config file: ${parsedContent.error.message}`);
  }
  return parsedContent.data;
}

// src/modules/create-routes/routes.controllers.ts
import prompts2 from "prompts";
async function askWhereToWriteRoutes() {
  const response = await prompts2({
    type: "text",
    name: "path",
    message: "Where do you want to write the routes files?",
    initial: "src/domain/contract"
  });
  return response.path;
}

// src/modules/create-routes/routes.templates.ts
var routesTemplate = (appName) => `// This file is auto-generated. Do not edit manually.

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import z from 'zod';

import { readContract, readContractConfig } from './contract.repository';

const staticHeaders = (file: string) => ({
  'Content-Type': 'application/typescript',
  'Content-Disposition': \`inline; filename="\${file}"\`
});

const contractStatic = new Hono()
  .get('/contract', zValidator('query', z.object({ name: z.string(), emit: z.string() })), async (c) => {
    const { name, emit } = c.req.valid('query');
    const { content, file } = await readContract('${appName}', name, emit === 'true');
    return c.text(content, 200, staticHeaders(file));
  })

  .get('/contract/config', async (c) => {
    const config = await readContractConfig();
    return c.json(config, 200, { 'Content-Type': 'application/json' });
  });

export { contractStatic };
`;
var repositoryTemplate = `// This file is auto-generated. Do not edit manually.

import { readFile } from 'fs/promises';
import { HTTPException } from 'hono/http-exception';

export async function readContract(app: string, name: string, emit: boolean): Promise<{ content: string; file: string }> {
  // This function reads a contract file for the specified app and name.
  // It constructs the file path based on the app and name, and returns the content and file name.

  const fileName = \`\${app}.contract.\${name}\` + (emit ? '.ts' : '.d.ts');
  const contractPath = \`./contract/export/\${fileName}\`;

  try {
    const content = await readFile(contractPath, 'utf-8');
    return { content, file: fileName };
  } catch {
    throw new HTTPException(404, {
      message: \`Contract file not found at \${contractPath}\`,
    });
  }
}

export async function readContractConfig(): Promise<string> {
  // This function reads the contract configuration file.
  // It is used to determine fore external synchronization.

  const configPath = './contract.config.json';
  try {
    const configContent = await readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch {
    throw new HTTPException(500, {
      message: \`Failed to read contract configuration from \${configPath}\`,
    });
  }
}
`;
var indexTemplate = `// This file is auto-generated. Do not edit manually.

export { contractStatic } from './contract.routes';
`;

// src/modules/create-routes/index.ts
async function writeDefaultContractRoutes(config) {
  const routesDirectoryPath = await askWhereToWriteRoutes();
  fs2.ensureDirSync(routesDirectoryPath);
  const indexFilePath = `${routesDirectoryPath}/index.ts`;
  const routesFilePath = `${routesDirectoryPath}/contract.routes.ts`;
  const repositoryFilePath = `${routesDirectoryPath}/contract.repository.ts`;
  fs2.writeFileSync(indexFilePath, indexTemplate);
  fs2.writeFileSync(routesFilePath, routesTemplate(config.appName));
  fs2.writeFileSync(repositoryFilePath, repositoryTemplate);
  console.log(`\u2705 Default contract routes written to ${routesFilePath}`);
}
async function runCommand() {
  const config = await readConfigFile();
  await writeDefaultContractRoutes(config);
}
export {
  runCommand
};
//# sourceMappingURL=index.js.map