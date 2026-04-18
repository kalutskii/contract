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
    initialValue: true
  });
  return isCancel(shouldInitialize) ? false : shouldInitialize;
}
async function configFileCreationPrompt() {
  const shouldCreate = await confirm({
    message: "No configuration found. Would you like to create one?",
    initialValue: true
  });
  return isCancel(shouldCreate) ? false : shouldCreate;
}
var environmentClearedMessage = () => log.success("Existing contract environment cleared.");
var invalidConfigMessage = (configPath, errorMessage) => log.error(`Invalid config format at ${configPath}: ${errorMessage}`);
var configFileNotFoundMessage = (configPath) => log.warn(`Config not found at ${configPath}, running initialization script.`);

// src/environment/environment.constants.ts
var CONFIG_FILE_NAME = "contract.config.ts";
var DEFAULT_CONTRACTS = ["hono", "types"];
var CONTRACT_DIRECTORY_NAME = "contract";
var ENVIRONMENT_DIRECTORIES = ["manifests", "generated"];

// src/environment/environment.inspection.ts
import fs from "fs-extra";
import path from "path";

// src/environment/environment.schemas.ts
import { z } from "zod";
var ConfigSchema = z.object({
  app: z.string().regex(/^[a-zA-Z_-]+$/).default("placeholder").meta({ description: "The name of the application, used in filenames and identifiers." }),
  contracts: z.array(z.string().regex(/^[a-zA-Z_-]+$/)).default([]).meta({ description: "Array of selected contract names." }),
  package: z.object({
    name: z.string().meta({ description: "NPM package name, e.g. @scope/package-name" }),
    version: z.string().regex(/^\d+\.\d+\.\d+/).meta({ description: "Semantic version, e.g. 1.0.0" }),
    exports: z.record(z.string(), z.string()).optional().meta({ description: "Optional package exports configuration." })
  }).meta({ description: "Package metadata for contract distribution." }),
  npm: z.object({
    token: z.string().meta({ description: "NPM authentication token used for publishing." })
  }).optional().meta({ description: "Optional npm publishing configuration." })
});
var EnvironmentStatusSchema = z.object({
  contractDirectoryExists: z.boolean().default(false).meta({ description: "Indicates if the main contract directory exists." }),
  directoriesExistence: z.object({
    // * Ensure keys match ENVIRONMENT_DIRECTORIES
    manifests: z.boolean(),
    // Folder where contract manifests are stored
    generated: z.boolean()
    // Folder for generated contract d.ts files
  }).default({ manifests: false, generated: false }).meta({ description: "Existence status of required environment directories." }),
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
    const modulePath = path2.join(process.cwd(), configPath);
    const configModule = await import(modulePath);
    const config = await ConfigSchema.safeParseAsync(configModule.default);
    if (config.success)
      return config.data;
    invalidConfigMessage(configPath, config.error.message);
  } catch {
    configFileNotFoundMessage(configPath);
  }
  return null;
}

// src/environment/environment.templates.ts
var renderConfigTemplate = (defaultConfig) => {
  const npmConfig = defaultConfig.npm ? `,
  npm: {
    token: '${defaultConfig.npm.token}',
  }` : `,
  // npm: {
  //   token: process.env.NPM_TOKEN ?? '',
  // }`;
  return `import type { Config } from 'contract';

const contractConfig: Config = {
  app: '${defaultConfig.app}',
  contracts: ${JSON.stringify(defaultConfig.contracts)},
  package: {
    name: '${defaultConfig.package.name}',
    version: '${defaultConfig.package.version}',
  }${npmConfig},
};

export default contractConfig;
`;
};
var renderManifestTemplate = (contractName) => `// Define and export all types related to this contract (${contractName}).
// This file will be bundled into ${contractName}.d.ts during "contract build".

`;

// src/environment/environment.services.ts
async function createDefaultConfigFile() {
  const defaultConfig = ConfigSchema.parse({
    contracts: DEFAULT_CONTRACTS,
    package: { name: "@scope/contracts", version: "1.0.0" }
  });
  await Bun.write(CONFIG_FILE_NAME, renderConfigTemplate(defaultConfig));
  return defaultConfig;
}
async function getConfig() {
  const config = await loadConfigFile(CONFIG_FILE_NAME);
  if (!config) {
    const shouldCreate = await configFileCreationPrompt();
    if (shouldCreate)
      return createDefaultConfigFile();
    return process.exit(0);
  }
  return config;
}
async function handleEnvironment(config) {
  const contractFolderPath = path3.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
  const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);
  if (!environmentStatus.contractDirectoryExists) {
    fs2.mkdirpSync(contractFolderPath);
    environmentStatus.contractDirectoryExists = true;
  }
  for (const dir of ENVIRONMENT_DIRECTORIES) {
    if (!environmentStatus.directoriesExistence[dir]) {
      fs2.mkdirpSync(path3.join(contractFolderPath, dir));
      environmentStatus.directoriesExistence[dir] = true;
    }
  }
  const manifestsExistenceEntries = Object.entries(environmentStatus.manifestsExistence);
  for (const [contract, exists] of manifestsExistenceEntries) {
    if (!exists) {
      const manifestFilePath = path3.join(contractFolderPath, "manifests", `contract.${contract}.manifest.ts`);
      await Bun.write(manifestFilePath, renderManifestTemplate(contract));
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
async function updateConfigVersion(newVersion) {
  const configPath = path3.resolve(CONFIG_FILE_NAME);
  const content = await fs2.readFile(configPath, "utf-8");
  const versionRegex = /version:\s*['"][\d.]+['"]/;
  const replacement = `version: '${newVersion}'`;
  if (!versionRegex.test(content)) {
    throw new Error(`Could not find version field in ${configPath}`);
  }
  const updatedContent = content.replace(versionRegex, replacement);
  await fs2.writeFile(configPath, updatedContent, "utf-8");
}

// src/modules/build/build.services.ts
import { spinner } from "@clack/prompts";
import path4 from "path";

// src/utilities/exec.utilities.ts
import { log as log2 } from "@clack/prompts";
import { execa } from "execa";
async function executeCommandWithResult(command, args, cwd) {
  let stdout = "";
  let stderr = "";
  try {
    const subprocess = execa(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: true, cwd });
    subprocess.stdout?.on("data", (data) => {
      stdout += String(data);
    });
    subprocess.stderr?.on("data", (data) => {
      stderr += String(data);
    });
    await subprocess;
    return { success: true, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      stdout,
      stderr,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}
async function executeCommand(command, args, cwd) {
  const result = await executeCommandWithResult(command, args, cwd);
  if (!result.success) {
    log2.error(`Error executing command: ${command} ${args.join(" ")}
${result.stderr || result.stdout || result.errorMessage}`);
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
    await handleEnvironment(config);
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
    await handleEnvironment(config);
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

// src/modules/pack/pack.commands.ts
import { Command as Command3 } from "clipanion";

// src/modules/pack/pack.services.ts
import fs3 from "fs-extra";
import path5 from "path";

// src/modules/pack/pack.messages.ts
import { log as log5 } from "@clack/prompts";
import { dim as dim2, green as green3 } from "kleur/colors";
var packagePackingStartedMessage = () => log5.info(`Packing contract package...`);
var packagePackedMessage = (filename, filepath) => log5.success(`Package packed successfully: ${green3(filename)} (${dim2(filepath)})`);
var packageDirectoryNotFoundMessage = () => log5.error(`Contract package directory not found. Run ${green3("contract prepare:package")} first.`);
var packageJsonNotFoundMessage = () => log5.error(`Package metadata not found. Run ${green3("contract prepare:package")} first.`);
var fatalErrorWhilePackingMessage = (error) => log5.error(`Fatal error while packing package: ${error}`);

// src/modules/pack/pack.services.ts
async function packContractPackage() {
  try {
    packagePackingStartedMessage();
    const packageDir = path5.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "package");
    const packageJsonPath = path5.join(packageDir, "package.json");
    const packageDirExists = await fs3.pathExists(packageDir);
    if (!packageDirExists) {
      packageDirectoryNotFoundMessage();
      process.exit(1);
    }
    const packageJsonExists = await fs3.pathExists(packageJsonPath);
    if (!packageJsonExists) {
      packageJsonNotFoundMessage();
      process.exit(1);
    }
    const executed = await executeCommand("npm", ["pack"], packageDir);
    if (!executed) {
      process.exit(1);
    }
    const files = await fs3.readdir(packageDir);
    const tgzFile = files.find((f) => f.endsWith(".tgz"));
    if (tgzFile) {
      const tgzPath = path5.join(packageDir, tgzFile);
      packagePackedMessage(tgzFile, tgzPath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePackingMessage(errorMessage);
    process.exit(1);
  }
}

// src/modules/pack/pack.commands.ts
var PackPackageCommand = class extends Command3 {
  static paths = [["pack:package"]];
  async execute() {
    await packContractPackage();
  }
};

// src/modules/prepare/prepare.commands.ts
import { Command as Command4, Option } from "clipanion";

// src/modules/prepare/prepare.services.ts
import fs5 from "fs-extra";
import path7 from "path";

// src/utilities/version.utilities.ts
import crypto from "crypto";
import fs4 from "fs-extra";
import path6 from "path";
var PUBLISHABLE_FILES = ["index.d.ts", "index.js"];
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function toContractState(value) {
  if (!isRecord(value) || typeof value.hash !== "string") {
    return null;
  }
  return { hash: value.hash };
}
function addContractFiles(contracts) {
  return [...PUBLISHABLE_FILES, ...contracts.flatMap((c) => [`${c}.d.ts`, `${c}.js`])];
}
async function computePackageHash(packageDir, contracts) {
  const hash = crypto.createHash("sha256");
  const filesToHash = addContractFiles(contracts);
  for (const filename of filesToHash.sort()) {
    const filePath = path6.join(packageDir, filename);
    try {
      let content = await fs4.readFile(filePath, "utf-8");
      if (filename === "package.json") {
        const json = JSON.parse(content);
        delete json.version;
        content = JSON.stringify(json, null, 2);
      }
      content = content.replace(/\r\n/g, "\n").trim();
      hash.update(filename + ":" + content);
    } catch (_error) {
      hash.update(filename + ":");
    }
  }
  return hash.digest("hex");
}
async function getContractState(packageDir) {
  const stateDir = path6.dirname(packageDir);
  const statePath = path6.join(stateDir, ".contract-package-state.json");
  try {
    if (await fs4.pathExists(statePath)) {
      const rawState = await fs4.readJSON(statePath);
      return toContractState(rawState);
    }
  } catch {
    return null;
  }
  return null;
}
async function writeContractState(packageDir, state) {
  const stateDir = path6.dirname(packageDir);
  const statePath = path6.join(stateDir, ".contract-package-state.json");
  await fs4.writeJSON(statePath, state, { spaces: 2 });
}
function bumpVersion(currentVersion, bumpType) {
  const parts = currentVersion.split(".");
  const [major, minor, patch] = [
    parseInt(parts[0] ?? "0", 10),
    parseInt(parts[1] ?? "0", 10),
    parseInt(parts[2] ?? "0", 10)
  ];
  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

// src/modules/prepare/prepare.messages.ts
import { log as log6 } from "@clack/prompts";
import { dim as dim3, green as green4 } from "kleur/colors";
var packagePreparationStartedMessage = (app) => log6.info(`Preparing package ${green4(app)} for distribution...`);
var packageFilesCreatedMessage = (filePath) => log6.success(`Package files created successfully at ${dim3(filePath)}`);
var packageJsonGeneratedMessage = (packageName) => log6.success(`Generated ${dim3("package.json")} for ${green4(packageName)}`);
var packagePreparationCompletedMessage = () => log6.success(`Package preparation completed. Ready for publishing.`);
var missingGeneratedContractsMessage = (contractName) => log6.warn(`Contract ${green4(contractName)} was not found in generated files. Run ${green4("contract build")} first to generate contract declarations.`);
var versionBumpedMessage = (oldVersion, newVersion, reason) => log6.success(`Version bumped from ${green4(oldVersion)} to ${green4(newVersion)} (${reason}).`);
var versionForcedMessage = (newVersion, bumpType) => log6.success(`Version forced to ${green4(newVersion)} via --bump ${bumpType}.`);
var versionNoChangeMessage = (version) => log6.info(`Content unchanged. Version remains ${green4(version)}.`);
var fatalErrorWhilePreparingPackageMessage = (error) => log6.error(`Fatal error while preparing package: ${error}`);

// src/modules/prepare/prepare.services.ts
async function collectGeneratedContracts(config) {
  const contractsMap = /* @__PURE__ */ new Map();
  const generatedDir = path7.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "generated");
  for (const contract of config.contracts) {
    const contractFileName = `${config.app}.contract.${contract}.d.ts`;
    const contractFilePath = path7.join(generatedDir, contractFileName);
    try {
      const exists = await fs5.pathExists(contractFilePath);
      contractsMap.set(contract, exists);
      if (!exists) {
        missingGeneratedContractsMessage(contract);
      }
    } catch (_error) {
      contractsMap.set(contract, false);
    }
  }
  return contractsMap;
}
function generateIndexDts(contracts) {
  const exports = contracts.map((contract) => `export type * from './${contract}';`).join("\n");
  return exports;
}
function generateStubJs() {
  return "export {};";
}
function generatePackageJson(config, contracts) {
  const exports = {
    ".": {
      types: "./index.d.ts",
      default: "./index.js"
    }
  };
  for (const contract of contracts) {
    exports[`./${contract}`] = {
      types: `./${contract}.d.ts`,
      default: `./${contract}.js`
    };
  }
  const files = ["index.d.ts", "index.js", ...contracts.flatMap((c) => [`${c}.d.ts`, `${c}.js`])];
  return {
    name: config.package.name,
    version: config.package.version,
    private: false,
    type: "module",
    sideEffects: false,
    files,
    exports,
    types: "./index.d.ts"
  };
}
async function updatePackageVersion(packageJsonPath, newVersion) {
  const packageJson = await fs5.readJSON(packageJsonPath);
  packageJson.version = newVersion;
  await fs5.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
async function prepareContractPackage(config, options = {}) {
  try {
    packagePreparationStartedMessage(config.app);
    const contractsMap = await collectGeneratedContracts(config);
    const existingContracts = config.contracts.filter((contract) => contractsMap.get(contract) === true);
    if (existingContracts.length === 0) {
      throw new Error('No generated contracts found. Run "contract build" first.');
    }
    const packageDir = path7.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "package");
    const previousState = await getContractState(packageDir);
    await fs5.remove(packageDir);
    await fs5.ensureDir(packageDir);
    const generatedDir = path7.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "generated");
    for (const contract of existingContracts) {
      const sourceFile = path7.join(generatedDir, `${config.app}.contract.${contract}.d.ts`);
      const destFile = path7.join(packageDir, `${contract}.d.ts`);
      const content = await fs5.readFile(sourceFile, "utf-8");
      await fs5.writeFile(destFile, content);
    }
    packageFilesCreatedMessage(packageDir);
    const indexDts = generateIndexDts(existingContracts);
    await fs5.writeFile(path7.join(packageDir, "index.d.ts"), indexDts);
    const jsStub = generateStubJs();
    await fs5.writeFile(path7.join(packageDir, "index.js"), jsStub);
    for (const contract of existingContracts) {
      await fs5.writeFile(path7.join(packageDir, `${contract}.js`), jsStub);
    }
    const packageJson = generatePackageJson(config, existingContracts);
    const version = String(packageJson.version);
    packageJson.version = version;
    const packageJsonPath = path7.join(packageDir, "package.json");
    await fs5.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    if (options.bump) {
      const bumpedVersion = bumpVersion(version, options.bump);
      await updateConfigVersion(bumpedVersion);
      await updatePackageVersion(packageJsonPath, bumpedVersion);
      versionForcedMessage(bumpedVersion, options.bump);
    } else if (!options.noBump) {
      const currentHash = await computePackageHash(packageDir, existingContracts);
      if (previousState && previousState.hash !== currentHash) {
        const bumpedVersion = bumpVersion(version, "patch");
        await updateConfigVersion(bumpedVersion);
        await updatePackageVersion(packageJsonPath, bumpedVersion);
        versionBumpedMessage(config.package.version, bumpedVersion, "content changed");
      } else if (!previousState) {
        versionNoChangeMessage(version);
      } else {
        versionNoChangeMessage(version);
      }
      await writeContractState(packageDir, { hash: currentHash });
    }
    packageJsonGeneratedMessage(config.package.name);
    packagePreparationCompletedMessage();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePreparingPackageMessage(errorMessage);
    process.exit(1);
  }
}

// src/modules/prepare/prepare.commands.ts
var PreparePackageCommand = class extends Command4 {
  static paths = [["prepare:package"]];
  bump = Option.String("--bump", {
    description: "Manual version bump: patch, minor, or major"
  });
  noBump = Option.Boolean("--no-bump", false, {
    description: "Skip automatic version bumping"
  });
  async execute() {
    const config = await getConfig();
    await handleEnvironment(config);
    await prepareContractPackage(config, {
      bump: this.bump,
      noBump: this.noBump
    });
  }
};

// src/modules/publish/publish.commands.ts
import { Command as Command5, Option as Option2 } from "clipanion";

// src/modules/publish/publish.services.ts
import fs6 from "fs-extra";
import path8 from "path";

// src/modules/publish/publish.messages.ts
import { log as log7 } from "@clack/prompts";
import { green as green5 } from "kleur/colors";
var packagePublishingStartedMessage = () => log7.info(`Publishing contract package to npm...`);
var packagePublishedMessage = (packageName, version) => log7.success(`Package ${green5(packageName)} v${version} published successfully.`);
var packageDirectoryNotFoundMessage2 = () => log7.error(`Contract package directory not found. Run ${green5("contract prepare:package")} first.`);
var packageJsonNotFoundMessage2 = () => log7.error(`Package metadata not found. Run ${green5("contract prepare:package")} first.`);
var packagePreparationStartedMessage2 = () => log7.info(`Preparing package before publishing...`);
var npmTokenMissingMessage = () => log7.error(`No npm token provided. Set config.npm.token or NPM_TOKEN env variable.`);
var npmTokenSourceMessage = (source) => log7.success(`Using npm token from ${green5(source)}.`);
var publishingPackageMessage = (packageName, version) => log7.success(`Publishing ${green5(`${packageName}@${version}`)}.`);
var fatalErrorWhilePublishingMessage = (error) => log7.error(`Fatal error while publishing package: ${error}`);

// src/modules/publish/publish.services.ts
function resolveNpmToken(config) {
  if (config.npm?.token)
    return { source: "config", token: config.npm.token };
  if (process.env.NPM_TOKEN)
    return { source: "NPM_TOKEN", token: process.env.NPM_TOKEN };
  if (process.env.NODE_AUTH_TOKEN)
    return { source: "NODE_AUTH_TOKEN", token: process.env.NODE_AUTH_TOKEN };
  return null;
}
async function writeNpmRc(packageDir, token) {
  const npmrcPath = path8.join(packageDir, ".npmrc");
  await fs6.writeFile(npmrcPath, `//registry.npmjs.org/:_authToken=${token}
`);
}
function getPublishFailureMessage(output) {
  const normalizedOutput = output.toLowerCase();
  if (normalizedOutput.includes("eneedauth") || normalizedOutput.includes("e401") || normalizedOutput.includes("403") || normalizedOutput.includes("auth")) {
    return `NPM publish failed due to authentication or permission issues. Verify the token and package access settings.
${output}`;
  }
  if (normalizedOutput.includes("registry")) {
    return `NPM publish failed due to registry configuration. Verify the package is being published to npmjs.org.
${output}`;
  }
  return `NPM publish failed.
${output}`;
}
async function versionExistsOnNpm(packageName, version) {
  const checkResult = await executeCommandWithResult("npm", ["view", `${packageName}@${version}`]);
  return checkResult.success;
}
async function resolveVersionCollision(packageName, version) {
  const exists = await versionExistsOnNpm(packageName, version);
  if (exists) {
    throw new Error(`Version ${version} already exists on npm. Cannot publish duplicate version.
Run "contract prepare:package --bump patch" to bump the version, then try publishing again.`);
  }
}
async function publishContractPackage(options = {}) {
  try {
    packagePublishingStartedMessage();
    const config = await getConfig();
    if (options.prepare) {
      packagePreparationStartedMessage2();
      await handleEnvironment(config);
      await prepareContractPackage(config);
    }
    const packageDir = path8.resolve(CONTRACT_DIRECTORY_NAME, "package");
    const packageJsonPath = path8.join(packageDir, "package.json");
    const packageDirExists = await fs6.pathExists(packageDir);
    if (!packageDirExists) {
      packageDirectoryNotFoundMessage2();
      process.exit(1);
    }
    const packageJsonExists = await fs6.pathExists(packageJsonPath);
    if (!packageJsonExists) {
      packageJsonNotFoundMessage2();
      process.exit(1);
    }
    const packageJson = await fs6.readJSON(packageJsonPath);
    if (!packageJson.name) {
      throw new Error('package.json is missing a valid "name" field.');
    }
    const packageName = packageJson.name;
    const packageVersion = config.package.version;
    await resolveVersionCollision(packageName, packageVersion);
    if (packageJson.version !== packageVersion) {
      packageJson.version = packageVersion;
      await fs6.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }
    const npmToken = resolveNpmToken(config);
    if (!npmToken) {
      npmTokenMissingMessage();
      process.exit(1);
    }
    npmTokenSourceMessage(npmToken.source);
    publishingPackageMessage(packageName, packageVersion);
    await writeNpmRc(packageDir, npmToken.token);
    if (options.access && options.access !== "public") {
      throw new Error("Only --access public is supported for contract publish:package.");
    }
    const publishResult = await executeCommandWithResult("npm", ["publish", "--access", "public"], packageDir);
    if (!publishResult.success) {
      const errorOutput = publishResult.stderr || publishResult.stdout || publishResult.errorMessage || "Unknown error";
      throw new Error(getPublishFailureMessage(errorOutput));
    }
    packagePublishedMessage(packageName, packageVersion);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePublishingMessage(errorMessage);
    process.exit(1);
  }
}

// src/modules/publish/publish.commands.ts
var PublishPackageCommand = class extends Command5 {
  static paths = [["publish:package"]];
  access = Option2.String("--access", {
    description: "Kept for compatibility. Only public access is supported."
  });
  prepare = Option2.Boolean("--prepare", false, {
    description: "Prepare package before publishing"
  });
  async execute() {
    await publishContractPackage({
      access: this.access,
      prepare: this.prepare
    });
  }
};

// cli.entrypoint.ts
var clipanionClient = getClipanionClient();
clipanionClient.register(InitCommand);
clipanionClient.register(UpdateEnvironmentCommand);
clipanionClient.register(BuildCommand);
clipanionClient.register(PreparePackageCommand);
clipanionClient.register(PackPackageCommand);
clipanionClient.register(PublishPackageCommand);
void clipanionClient.runExit(process.argv.slice(2));
