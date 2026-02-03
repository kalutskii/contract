// src/adapters/hono/hono.constants.ts
var CONTRACT_ENDPOINT_PREFIX = "/contract";

// src/adapters/hono/hono.routes.ts
import { Hono } from "hono";
import path2 from "path";

// src/adapters/hono/hono.errors.ts
var honoAdapterErrors = {
  CONFIG_NOT_FOUND: "Contract config not found in root directory (contract.config.ts) or corrupted, initialize it first (contract init).",
  MISSING_CONTRACT_NAME_QUERY_PARAM: "Missing query param: name (the name of the contract to retrieve).",
  UNKNOWN_CONTRACT: (name) => `Unknown contract: ${name}, please check your configuration.`,
  CONTRACT_FILE_NOT_FOUND: (filename) => `Contract file not found: ${filename}, regenerate it if necessary (contract build).`
};

// src/adapters/hono/hono.utilities.ts
import fs from "fs-extra";

// src/environment/environment.constants.ts
var CONFIG_FILE_NAME = "contract.config.ts";

// src/environment/environment.loader.ts
import path from "path";

// src/environment/environment.chat.ts
import { confirm, isCancel, log } from "@clack/prompts";
var invalidConfigMessage = (configPath, errorMessage) => log.error(`Invalid config format at ${configPath}: ${errorMessage}`);
var configFileNotFoundMessage = (configPath) => log.warn(`Config not found at ${configPath}, running initialization script.`);

// src/environment/environment.schemas.ts
import { z } from "zod";
var ConfigSchema = z.object({
  app: z.string().regex(/^[a-zA-Z_-]+$/).default("placeholder").meta({ description: "The name of the application, used in filenames and identifiers." }),
  contracts: z.array(z.string().regex(/^[a-zA-Z_-]+$/)).default([]).meta({ description: "Array of selected contract names." }),
  externalServices: z.array(z.union([z.url(), z.ipv4()])).default([]).meta({ description: "List of external service URLs or IP addresses the application interacts with." })
});
var EnvironmentStatusSchema = z.object({
  contractDirectoryExists: z.boolean().default(false).meta({ description: "Indicates if the main contract directory exists." }),
  directoriesExistence: z.object({
    // * Ensure keys match ENVIRONMENT_DIRECTORIES
    manifests: z.boolean(),
    // Folder where contract manifests are stored
    synchronized: z.boolean(),
    // Folder for synchronized contracts from external sources
    generated: z.boolean()
    // Folder for generated contract d.ts files
  }).default({ manifests: false, synchronized: false, generated: false }).meta({ description: "Existence status of required environment directories." }),
  manifestsExistence: z.record(z.string(), z.boolean()).default({}).meta({ description: "Existence status of required contract manifest files (contract.<contract>.manifest.ts)." })
});

// src/environment/environment.loader.ts
async function loadConfigFile(configPath) {
  try {
    const rawConfig = (await import(path.join(process.cwd(), configPath))).default;
    const config = await ConfigSchema.safeParseAsync(rawConfig);
    if (config.success)
      return config.data;
    invalidConfigMessage(configPath, config.error.message);
  } catch {
    configFileNotFoundMessage(configPath);
  }
  return null;
}

// src/adapters/hono/hono.utilities.ts
async function getConfigSafely() {
  const config = await loadConfigFile(CONFIG_FILE_NAME);
  return config ?? null;
}
async function readContractFile(contractFilePath) {
  try {
    return await fs.readFile(contractFilePath, "utf-8");
  } catch {
    return null;
  }
}

// src/adapters/hono/hono.routes.ts
var contractRouter = new Hono();
contractRouter.get("/config", async (c) => {
  const configResult = await getConfigSafely();
  if (!configResult)
    return c.json({ error: honoAdapterErrors.CONFIG_NOT_FOUND }, 500);
  return c.json(configResult);
});
contractRouter.get("/get", async (c) => {
  const configResult = await getConfigSafely();
  if (!configResult)
    return c.json({ error: honoAdapterErrors.CONFIG_NOT_FOUND }, 500);
  const contractName = c.req.query("name");
  if (!contractName)
    return c.json({ error: honoAdapterErrors.MISSING_CONTRACT_NAME_QUERY_PARAM }, 400);
  if (!configResult.contracts.includes(contractName))
    return c.json({ error: honoAdapterErrors.UNKNOWN_CONTRACT(contractName) }, 404);
  const generatedContractFile = `${configResult.app}.contract.${contractName}.d.ts`;
  const contractFilePath = path2.join(process.cwd(), "contract", "generated", generatedContractFile);
  const contractContent = await readContractFile(contractFilePath);
  if (contractContent === null)
    return c.json({ error: honoAdapterErrors.CONTRACT_FILE_NOT_FOUND(generatedContractFile) }, 404);
  c.header("Content-Disposition", `attachment; filename="${generatedContractFile}"`);
  return c.text(contractContent, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

// src/adapters/hono/hono.adapter.ts
async function contractMiddleware() {
  return async (c, next) => {
    if (!c.req.path.startsWith(CONTRACT_ENDPOINT_PREFIX))
      return next();
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(CONTRACT_ENDPOINT_PREFIX, "") || "/";
    return contractRouter.fetch(new Request(url.toString(), c.req.raw));
  };
}
export {
  contractMiddleware
};
