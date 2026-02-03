#!/usr/bin/env bun

// src/adapters/clipanion.client.ts
import { Cli } from "clipanion";

// src/library.metadata.ts
var libraryMetadata = { name: "contract", version: "0.1.0" };

// src/adapters/clipanion.client.ts
function getClipanionClient() {
  return new Cli({
    binaryName: libraryMetadata.name,
    binaryLabel: `${libraryMetadata.name}-cli`,
    binaryVersion: libraryMetadata.version
  });
}

// src/modules/build/build.commands.ts
import { Command } from "clipanion";

// src/environment/environment.services.ts
import fs2 from "fs-extra";
import path3 from "path";

// src/environment/environment.chat.ts
import { confirm, isCancel, log } from "@clack/prompts";
async function initializePrompt() {
  const shouldInitialize = await confirm({
    message: "If contract is already initialized, reinitialization will cause existing files to be overwritten. Do you want to proceed?",
    initialValue: false
  });
  return isCancel(shouldInitialize) ? false : shouldInitialize;
}
async function configFileCreationPrompt() {
  const shouldCreate = await confirm({ message: "No configuration found. Would you like to create one?", initialValue: true });
  return isCancel(shouldCreate) ? false : shouldCreate;
}
var environmentClearedMessage = () => log.success("Existing contract environment cleared.");
var invalidConfigMessage = (configPath, errorMessage) => log.error(`Invalid config format at ${configPath}: ${errorMessage}`);
var configFileNotFoundMessage = (configPath) => log.warn(`Config not found at ${configPath}, running initialization script.`);

// src/environment/environment.constants.ts
var CONFIG_FILE_NAME = "contract.config.ts";
var DEFAULT_CONTRACTS = ["hono", "types"];
var CONTRACT_DIRECTORY_NAME = "contract";
var ENVIRONMENT_DIRECTORIES = ["manifests", "synchronized", "generated"];

// src/environment/environment.inspection.ts
import fs from "fs-extra";
import path from "path";

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

// src/environment/environment.inspection.ts
async function inspectContractEnvironment(config, contractFolderPath) {
  const environmentStatus = EnvironmentStatusSchema.parse({});
  environmentStatus.contractDirectoryExists = await fs.pathExists(contractFolderPath);
  if (!environmentStatus.contractDirectoryExists)
    return environmentStatus;
  for (const dir of ENVIRONMENT_DIRECTORIES) {
    environmentStatus.directoriesExistence[dir] = await fs.pathExists(path.join(contractFolderPath, dir));
  }
  for (const contract of config.contracts) {
    const manifestFilePath = path.join(contractFolderPath, "manifests", `contract.${contract}.manifest.ts`);
    environmentStatus.manifestsExistence[contract] = await fs.pathExists(manifestFilePath);
  }
  return environmentStatus;
}

// src/environment/environment.loader.ts
import path2 from "path";
async function loadConfigFile(configPath) {
  try {
    const rawConfig = (await import(path2.join(process.cwd(), configPath))).default;
    const config = await ConfigSchema.safeParseAsync(rawConfig);
    if (config.success)
      return config.data;
    invalidConfigMessage(configPath, config.error.message);
  } catch {
    configFileNotFoundMessage(configPath);
  }
  return null;
}

// src/environment/environment.templates.ts
var renderConfigTemplate = (defaultConfig) => (
  // Renders a TypeScript configuration file template based on the provided configuration object.
  `import type { Config } from 'contract';

const contractConfig: Config = {
  ${Object.keys(defaultConfig).map((key) => `${key}: ${JSON.stringify(defaultConfig[key])},`).join("\n  ")}
};

export default contractConfig;
`
);
var renderManifestTemplate = (contractName) => (
  // Renders a TypeScript manifest file template for the specified contract.
  `// This file is automatically generated for the ${contractName} contract.
// Important: never re-export from index.ts \u2014 use direct file exports.


`
);

// src/environment/environment.services.ts
async function createDefaultConfigFile() {
  const defaultConfig = ConfigSchema.parse({ contracts: DEFAULT_CONTRACTS });
  Bun.write(CONFIG_FILE_NAME, renderConfigTemplate(defaultConfig));
  return defaultConfig;
}
async function getConfig() {
  const config = await loadConfigFile(CONFIG_FILE_NAME);
  if (!config) {
    const shouldCreate = await configFileCreationPrompt();
    if (shouldCreate)
      return await createDefaultConfigFile();
    return process.exit(0);
  }
  return config;
}
async function handleEnvironment(config, skipSynchronizedDirectory = true) {
  const contractFolderPath = path3.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);
  if (!environmentStatus.contractDirectoryExists) {
    fs2.mkdirpSync(contractFolderPath);
    environmentStatus.contractDirectoryExists = true;
  }
  for (const dir of ENVIRONMENT_DIRECTORIES) {
    if (skipSynchronizedDirectory && dir === "synchronized")
      continue;
    if (!environmentStatus.directoriesExistence[dir]) {
      fs2.mkdirpSync(path3.join(contractFolderPath, dir));
      environmentStatus.directoriesExistence[dir] = true;
    }
  }
  const manifestsExistenceEntries = Object.entries(environmentStatus.manifestsExistence);
  for (const [contract, exists] of manifestsExistenceEntries) {
    if (!exists) {
      const manifestFilePath = path3.join(contractFolderPath, "manifests", `contract.${contract}.manifest.ts`);
      Bun.write(manifestFilePath, renderManifestTemplate(contract));
      environmentStatus.manifestsExistence[contract] = true;
    }
  }
  return environmentStatus;
}
async function clearEnvironment() {
  const contractFolderPath = path3.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  await fs2.remove(contractFolderPath);
  environmentClearedMessage();
}

// src/modules/build/build.services.ts
import { spinner } from "@clack/prompts";
import path4 from "path";

// src/utilities/exec.utilities.ts
import { log as log2 } from "@clack/prompts";
import { execa } from "execa";
async function executeCommand(command, args) {
  let stderr = "";
  try {
    const subprocess = execa(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: true });
    subprocess.stderr?.on("data", (data) => stderr += data.toString());
    await subprocess;
  } catch (error) {
    log2.error(`Error executing command: ${command} ${args.join(" ")}
${stderr}`);
    return false;
  }
  return true;
}

// src/modules/build/build.messages.ts
import { log as log3 } from "@clack/prompts";
import { dim, green } from "kleur/colors";
var bundlingStartedMessage = (contract) => `Bundling contract declarations for ${green(contract)}`;
var bundlingCompletedMessage = (contract, outputPath) => `Contract declarations bundled successfully for ${green(contract)}, output available at: ${dim(outputPath)}`;
var contractsBuildCompletedMessage = () => log3.success(`All contract declarations have been bundled successfully.`);

// src/modules/build/build.services.ts
async function bundleContractDeclaration(app, contract) {
  const input = path4.join(CONTRACT_DIRECTORY_NAME, "manifests", `contract.${contract}.manifest.ts`);
  const output = path4.join(CONTRACT_DIRECTORY_NAME, "generated", `${app}.contract.${contract}.d.ts`);
  const progressSpinner = spinner();
  progressSpinner.start(bundlingStartedMessage(contract));
  const executed = await executeCommand("npx", ["dts-bundle-generator", "-o", output, input, "--no-check"]);
  if (!executed)
    process.exit(1);
  progressSpinner.stop(bundlingCompletedMessage(contract, output));
}
async function bundleAllContractDeclarations(config) {
  await Promise.all(config.contracts.map((contract) => bundleContractDeclaration(config.app, contract)));
  contractsBuildCompletedMessage();
}

// src/modules/build/build.commands.ts
var BuildCommand = class extends Command {
  static paths = [["build"]];
  async execute() {
    const config = await getConfig();
    await handleEnvironment(config, false);
    await bundleAllContractDeclarations(config);
  }
};

// src/modules/init/init.commands.ts
import { Command as Command2 } from "clipanion";

// src/modules/init/init.messages.ts
import { log as log4 } from "@clack/prompts";
import { green as green2 } from "kleur/colors";
var initializationCancelledMessage = () => log4.info("Initialization cancelled by user.");
var initializationCompletedMessage = () => log4.success(`Initialization complete, default configuration file created and environment set up.
Customize the configuration file ${green2("contract.config.ts")}: enter app's name, define contracts to use, etc.
Then run ${green2("contract update:environment")} to create manifest files and synchronize the environment.`);
var environmentUpdateCompletedMessage = () => log4.success(`Manifest pulling and environment synchronization complete.
You can now export your contract's types in relevant manifest files.
Then generate the type definitions by running ${green2("contract build")}.`);

// src/modules/init/init.commands.ts
var InitCommand = class extends Command2 {
  static paths = [["init"]];
  async execute() {
    const shouldInitialize = await initializePrompt();
    if (!shouldInitialize)
      return initializationCancelledMessage();
    await clearEnvironment();
    const config = await createDefaultConfigFile();
    await handleEnvironment(config, false);
    initializationCompletedMessage();
  }
};
var UpdateEnvironmentCommand = class extends Command2 {
  static paths = [["update:environment"]];
  async execute() {
    const config = await getConfig();
    await handleEnvironment(config);
    environmentUpdateCompletedMessage();
  }
};

// src/modules/sync/sync.commands.ts
import { Command as Command3 } from "clipanion";

// src/modules/sync/sync.services.ts
import fs3 from "fs-extra";
import path5 from "path";

// src/adapters/hono/hono.constants.ts
var CONTRACT_ENDPOINT_PREFIX = "/contract";

// src/modules/sync/sync.messages.ts
import { log as log5 } from "@clack/prompts";
import { green as green3 } from "kleur/colors";
var syncCommandErrors = {
  FAILED_TO_FETCH_CONFIG: (url) => `Failed to fetch external service config from ${url}, ensure you added ${green3("contractMiddleware")} to your service. It should be accessible at the ${green3("/contract/... endpoint.")}`,
  INVALID_CONFIG_FORMAT: (url, details) => `Invalid config format received from ${url}, details: ${details}`,
  FAILED_TO_FETCH_CONTRACT: (contractName, url) => `Failed to fetch contract ${contractName} from ${url}, ensure the contract exists and is accessible.`,
  CONTRACT_FILE_DISPOSITION_MISSING: (contractName, url) => `Missing Content-Disposition header for contract ${contractName} from ${url}, unable to determine filename.`
};
var contractFileDownloadCompletedMessage = (serviceName, contractName, filePath) => log5.success(`Contract ${green3(contractName)} from service ${green3(serviceName)} downloaded successfully to ${green3(filePath)}`);
var externalServicesSynchronizationCompletedMessage = (servicesTotal) => log5.success(`All ${green3(`(${servicesTotal}/${servicesTotal})`)} external services contracts have been synchronized successfully.`);

// src/modules/sync/sync.services.ts
async function getExternalServiceConfig(url) {
  const configUrl = new URL(`${CONTRACT_ENDPOINT_PREFIX}/config`, url);
  const configResponse = await fetch(configUrl);
  if (!configResponse.ok)
    throw new Error(syncCommandErrors.FAILED_TO_FETCH_CONFIG(url));
  const configResponseData = await configResponse.json();
  const externalConfig = ConfigSchema.safeParse(configResponseData);
  if (!externalConfig.success)
    throw new Error(syncCommandErrors.INVALID_CONFIG_FORMAT(url, JSON.stringify(externalConfig.error.message)));
  return externalConfig.data;
}
async function downloadContract(contractName, serviceUrl, serviceName) {
  const contractUrl = new URL(`${CONTRACT_ENDPOINT_PREFIX}/get?name=${contractName}`, serviceUrl);
  const contractResponse = await fetch(contractUrl);
  if (!contractResponse.ok)
    throw new Error(syncCommandErrors.FAILED_TO_FETCH_CONTRACT(contractName, serviceUrl));
  const contractDisposition = contractResponse.headers.get("Content-Disposition");
  const contractFilename = contractDisposition?.match(/filename="(.+?)"/)?.[1];
  if (!contractFilename)
    throw new Error(syncCommandErrors.CONTRACT_FILE_DISPOSITION_MISSING(contractName, serviceUrl));
  const contractContent = await contractResponse.text();
  const outputDir = path5.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "synchronized");
  const outputFilePath = path5.join(outputDir, contractFilename);
  await fs3.writeFile(outputFilePath, contractContent);
  contractFileDownloadCompletedMessage(serviceName, contractName, "contract/synchronized/" + contractFilename);
}
async function synchronizeExternalServicesContracts(config) {
  for (const service of config.externalServices) {
    const externalConfig = await getExternalServiceConfig(service);
    for (const contract of externalConfig.contracts) {
      await downloadContract(contract, service, externalConfig.app);
    }
  }
  externalServicesSynchronizationCompletedMessage(config.externalServices.length);
}

// src/modules/sync/sync.commands.ts
var SyncCommand = class extends Command3 {
  static paths = [["sync"]];
  async execute() {
    const config = await getConfig();
    await handleEnvironment(config, false);
    await synchronizeExternalServicesContracts(config);
  }
};

// cli.entrypoint.ts
var clipanionClient = getClipanionClient();
clipanionClient.register(InitCommand);
clipanionClient.register(UpdateEnvironmentCommand);
clipanionClient.register(BuildCommand);
clipanionClient.register(SyncCommand);
clipanionClient.runExit(process.argv.slice(2));
