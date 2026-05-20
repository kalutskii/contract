#!/usr/bin/env bun

// src/adapters/clipanion.client.ts
import { Cli } from "clipanion";

// src/library.metadata.ts
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
var packageMetadata = require2("../package.json");
var libraryMetadata = {
  name: packageMetadata.name,
  version: packageMetadata.version
};

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
import fs3 from "fs-extra";
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
var configFileNotFoundMessage = (configPath) => log.warn(`Config not found at ${configPath}.`);
var configFileLoadFailedMessage = (configPath, errorMessage) => log.error(`Failed to load config at ${configPath}: ${errorMessage}`);

// src/environment/environment.constants.ts
var CONFIG_FILE_NAME = "contract.config.ts";
var DEFAULT_CONTRACTS = ["api", "types"];
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
  emit: z.array(z.string().regex(/^[a-zA-Z_-]+$/)).default([]).meta({ description: "Subset of contracts that should also emit runtime JavaScript artifacts." }),
  package: z.object({
    name: z.string().meta({ description: "NPM package name, e.g. @scope/package-name" }),
    version: z.string().regex(/^\d+\.\d+\.\d+/).meta({ description: "Semantic version, e.g. 1.0.0" }),
    exports: z.record(z.string(), z.string()).optional().meta({ description: "Optional package exports configuration." })
  }).meta({ description: "Package metadata for contract distribution." }),
  npm: z.object({
    token: z.string().meta({ description: "NPM authentication token used for publishing." })
  }).optional().meta({ description: "Optional npm publishing configuration." })
}).superRefine((config, context) => {
  const contractNames = new Set(config.contracts);
  for (const contract of config.emit) {
    if (!contractNames.has(contract)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emit"],
        message: `Emitted contract "${contract}" must be listed in contracts.`
      });
    }
  }
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
import fs2 from "fs-extra";
import path2 from "path";
import { pathToFileURL } from "url";
function resolveConfigModulePath(configPath) {
  return path2.join(process.cwd(), configPath);
}
async function resolveConfigModuleUrl(modulePath) {
  const fileUrl = pathToFileURL(modulePath);
  const stat = await fs2.stat(modulePath);
  fileUrl.searchParams.set("t", String(stat.mtimeMs));
  return fileUrl.href;
}
async function loadConfigFile(configPath) {
  const modulePath = resolveConfigModulePath(configPath);
  if (!await fs2.pathExists(modulePath)) {
    configFileNotFoundMessage(configPath);
    return null;
  }
  try {
    const moduleUrl = await resolveConfigModuleUrl(modulePath);
    const configModule = await import(moduleUrl);
    const config = await ConfigSchema.safeParseAsync(configModule.default);
    if (config.success)
      return config.data;
    invalidConfigMessage(configPath, config.error.message);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    configFileLoadFailedMessage(configPath, errorMessage);
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
  emit: ${JSON.stringify(defaultConfig.emit ?? [])},
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

// If this contract is listed in config.emit, re-export runtime values only from direct leaf files.
// Keep emitted source files free of unrelated local imports, or they will be pulled into the bundle.

`;

// src/environment/environment.services.ts
function getContractRootPath() {
  return path3.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
}
function getConfigFilePath() {
  return path3.resolve(CONFIG_FILE_NAME);
}
async function ensureEnvironmentDirectories(contractFolderPath, environmentStatus) {
  if (!environmentStatus.contractDirectoryExists) {
    await fs3.ensureDir(contractFolderPath);
    environmentStatus.contractDirectoryExists = true;
  }
  for (const dir of ENVIRONMENT_DIRECTORIES) {
    if (!environmentStatus.directoriesExistence[dir]) {
      await fs3.ensureDir(path3.join(contractFolderPath, dir));
      environmentStatus.directoriesExistence[dir] = true;
    }
  }
}
async function ensureManifestFiles(contractFolderPath, environmentStatus) {
  for (const [contract, exists] of Object.entries(environmentStatus.manifestsExistence)) {
    if (!exists) {
      const manifestFilePath = path3.join(contractFolderPath, "manifests", `contract.${contract}.manifest.ts`);
      await Bun.write(manifestFilePath, renderManifestTemplate(contract));
      environmentStatus.manifestsExistence[contract] = true;
    }
  }
}
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
  const contractFolderPath = getContractRootPath();
  const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);
  await ensureEnvironmentDirectories(contractFolderPath, environmentStatus);
  await ensureManifestFiles(contractFolderPath, environmentStatus);
  return environmentStatus;
}
async function clearEnvironment() {
  const contractFolderPath = getContractRootPath();
  await fs3.remove(contractFolderPath);
  environmentClearedMessage();
}
async function updateConfigVersion(newVersion) {
  const configPath = getConfigFilePath();
  const content = await fs3.readFile(configPath, "utf-8");
  const packageVersionRegex = /(package:\s*\{[\s\S]*?version:\s*['"])([^'"]+)(['"])/;
  if (!packageVersionRegex.test(content)) {
    throw new Error(`Could not find version field in ${configPath}`);
  }
  const updatedContent = content.replace(packageVersionRegex, `$1${newVersion}$3`);
  await fs3.writeFile(configPath, updatedContent, "utf-8");
}

// src/modules/build/build.services.ts
import { spinner } from "@clack/prompts";

// src/modules/build/build.bundle.ts
import { build } from "esbuild";
import { tsconfigPathsPlugin } from "esbuild-plugin-tsconfig-paths";
import path6 from "path";

// src/utilities/execution.utilities.ts
import { log as log2 } from "@clack/prompts";
import { execa } from "execa";
function createOutputBuffer() {
  return { stdout: "", stderr: "" };
}
function appendChunk(target, buffer, chunk) {
  buffer[target] += String(chunk);
}
function attachOutputListeners(subprocess, buffer) {
  subprocess.stdout?.on("data", (chunk) => appendChunk("stdout", buffer, chunk));
  subprocess.stderr?.on("data", (chunk) => appendChunk("stderr", buffer, chunk));
}
function createFailedResult(buffer, error) {
  return {
    success: false,
    stdout: buffer.stdout,
    stderr: buffer.stderr,
    errorMessage: error instanceof Error ? error.message : String(error)
  };
}
function createSuccessResult(buffer) {
  return { success: true, stdout: buffer.stdout, stderr: buffer.stderr };
}
async function executeCommandWithResult(command, args, cwd) {
  const output = createOutputBuffer();
  try {
    const subprocess = execa(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: true, cwd });
    attachOutputListeners(subprocess, output);
    await subprocess;
    return createSuccessResult(output);
  } catch (error) {
    return createFailedResult(output, error);
  }
}
async function executeCommand(command, args, cwd) {
  const result = await executeCommandWithResult(command, args, cwd);
  if (!result.success) {
    const errorMessage = result.stderr || result.stdout || result.errorMessage || "Unknown error";
    log2.error(`Error executing command: ${command} ${args.join(" ")}
${errorMessage}`);
    return false;
  }
  return true;
}

// src/modules/build/build.messages.ts
import { log as log3 } from "@clack/prompts";
import { green } from "kleur/colors";
var buildSpinnerStartedMessage = (contractsCount) => `Building ${green(String(contractsCount))} contract declaration(s)...`;
var buildSpinnerCompletedMessage = (contracts) => {
  const names = contracts.join(", ");
  return `Built ${green(String(contracts.length))} contract declaration(s): ${green(names)}.`;
};
var buildSpinnerFailedMessage = () => "Build failed.";
var fatalErrorWhileBundlingMessage = (error) => log3.error(`Build failed: ${error}`);

// src/modules/build/build.paths.ts
import path4 from "path";
function resolveContractBundlePaths(app, contract) {
  const input = path4.join(CONTRACT_DIRECTORY_NAME, "manifests", `contract.${contract}.manifest.ts`);
  const output = path4.join(CONTRACT_DIRECTORY_NAME, "generated", `${app}.contract.${contract}.d.ts`);
  const runtimeOutput = path4.join(CONTRACT_DIRECTORY_NAME, "generated", `${app}.contract.${contract}.js`);
  return { input, output, runtimeOutput };
}

// src/modules/build/build.utilities.ts
import fs4 from "fs/promises";
import path5 from "path";
async function getRuntimeExternalPackages() {
  const packageJSONPath = path5.join(process.cwd(), "package.json");
  try {
    const rawPackageJSON = await fs4.readFile(packageJSONPath, "utf-8");
    const packageJSON = JSON.parse(rawPackageJSON);
    const packageNames = /* @__PURE__ */ new Set([
      ...Object.keys(packageJSON.dependencies ?? {}),
      ...Object.keys(packageJSON.devDependencies ?? {}),
      ...Object.keys(packageJSON.peerDependencies ?? {}),
      ...Object.keys(packageJSON.optionalDependencies ?? {})
    ]);
    return [...packageNames].flatMap((packageName) => [packageName, `${packageName}/*`]);
  } catch {
    return [];
  }
}

// src/modules/build/build.bundle.ts
async function bundleContractDeclaration(app, contract) {
  const paths = resolveContractBundlePaths(app, contract);
  return executeCommand("npx", ["dts-bundle-generator", "-o", paths.output, paths.input, "--no-check"]);
}
async function bundleContractRuntime(app, contract) {
  const paths = resolveContractBundlePaths(app, contract);
  const externalPackages = await getRuntimeExternalPackages();
  try {
    await build({
      bundle: true,
      entryPoints: [paths.input],
      external: externalPackages,
      format: "esm",
      logLevel: "silent",
      outfile: paths.runtimeOutput,
      platform: "neutral",
      plugins: [tsconfigPathsPlugin()],
      target: "esnext",
      treeShaking: true,
      tsconfig: path6.join(process.cwd(), "tsconfig.json")
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhileBundlingMessage(errorMessage);
    return false;
  }
}

// src/modules/build/build.services.ts
function getEmittedContracts(config) {
  return Array.isArray(config.emit) ? config.emit : [];
}
async function bundleAllContractDeclarations(config) {
  const buildSpinner = spinner();
  const emittedContracts = getEmittedContracts(config);
  try {
    buildSpinner.start(buildSpinnerStartedMessage(config.contracts.length));
    for (const contract of config.contracts) {
      const executed = await bundleContractDeclaration(config.app, contract);
      if (!executed) {
        buildSpinner.stop(buildSpinnerFailedMessage());
        process.exit(1);
      }
      if (emittedContracts.includes(contract)) {
        const emitted = await bundleContractRuntime(config.app, contract);
        if (!emitted) {
          buildSpinner.stop(buildSpinnerFailedMessage());
          process.exit(1);
        }
      }
    }
    buildSpinner.stop(buildSpinnerCompletedMessage(config.contracts));
  } catch (error) {
    buildSpinner.stop(buildSpinnerFailedMessage());
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhileBundlingMessage(errorMessage);
    process.exit(1);
  }
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
var initializationCompletedMessage = () => log4.success(`Initialized. Edit ${green2("contract.config.ts")} and run ${green2("contract update:environment")}.`);
var environmentUpdateCompletedMessage = () => log4.success(`Environment synced. Define types in manifests, then run ${green2("contract build")}.`);

// src/modules/init/init.services.ts
async function initializeContractProject() {
  const shouldInitialize = await initializePrompt();
  if (!shouldInitialize) {
    initializationCancelledMessage();
    return;
  }
  await clearEnvironment();
  const config = await createDefaultConfigFile();
  await handleEnvironment(config);
  initializationCompletedMessage();
}
async function updateContractEnvironment() {
  const config = await getConfig();
  await handleEnvironment(config);
  environmentUpdateCompletedMessage();
}

// src/modules/init/init.commands.ts
var InitCommand = class extends Command2 {
  static paths = [["init"]];
  async execute() {
    await initializeContractProject();
  }
};
var UpdateEnvironmentCommand = class extends Command2 {
  static paths = [["update:environment"]];
  async execute() {
    await updateContractEnvironment();
  }
};

// src/modules/pack/pack.commands.ts
import { Command as Command3 } from "clipanion";

// src/modules/pack/pack.services.ts
import { spinner as spinner2 } from "@clack/prompts";
import path8 from "path";

// src/modules/pack/pack.messages.ts
import { log as log5 } from "@clack/prompts";
import { green as green3 } from "kleur/colors";
var packSpinnerStartedMessage = () => "Packing contract package...";
var packSpinnerCompletedMessage = (filename, filepath) => `Packed ${filename} (${filepath}).`;
var packSpinnerCompletedFallbackMessage = () => "Packed package successfully.";
var packSpinnerFailedMessage = () => "Pack failed.";
var packageDirectoryNotFoundMessage = () => log5.error(`Package dir missing. Run ${green3("contract prepare:package")}.`);
var packageJsonNotFoundMessage = () => log5.error(`package.json missing. Run ${green3("contract prepare:package")}.`);
var fatalErrorWhilePackingMessage = (error) => log5.error(`Pack failed: ${error}`);

// src/modules/pack/pack.validation.ts
import fs5 from "fs-extra";
import path7 from "path";
function resolvePackPaths() {
  const packageDir = path7.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "package");
  const packageJsonPath = path7.join(packageDir, "package.json");
  return { packageDir, packageJsonPath };
}
async function ensurePackPathsExist(paths) {
  if (!await fs5.pathExists(paths.packageDir)) {
    throw new Error("PACKAGE_DIR_NOT_FOUND");
  }
  if (!await fs5.pathExists(paths.packageJsonPath)) {
    throw new Error("PACKAGE_JSON_NOT_FOUND");
  }
}
async function findPackedArchive(packageDir) {
  const files = await fs5.readdir(packageDir);
  return files.find((file) => file.endsWith(".tgz")) ?? null;
}

// src/modules/pack/pack.services.ts
async function packContractPackage() {
  let packSpinner = null;
  try {
    packSpinner = spinner2();
    packSpinner.start(packSpinnerStartedMessage());
    const paths = resolvePackPaths();
    try {
      await ensurePackPathsExist(paths);
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      if (code === "PACKAGE_DIR_NOT_FOUND") {
        packageDirectoryNotFoundMessage();
        process.exit(1);
      }
      if (code === "PACKAGE_JSON_NOT_FOUND") {
        packageJsonNotFoundMessage();
        process.exit(1);
      }
      throw error;
    }
    const executed = await executeCommand("npm", ["pack"], paths.packageDir);
    if (!executed) {
      process.exit(1);
    }
    const tgzFile = await findPackedArchive(paths.packageDir);
    if (tgzFile) {
      const tgzPath = path8.join(paths.packageDir, tgzFile);
      packSpinner.stop(packSpinnerCompletedMessage(tgzFile, tgzPath));
    } else {
      packSpinner.stop(packSpinnerCompletedFallbackMessage());
    }
  } catch (error) {
    if (packSpinner) {
      packSpinner.stop(packSpinnerFailedMessage());
    }
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
import path12 from "path";

// src/modules/versioning/versioning.hash.ts
import crypto from "crypto";
import fs6 from "fs-extra";
import path9 from "path";

// src/modules/versioning/versioning.constants.ts
var PUBLISHABLE_FILES = ["package.json", "index.d.ts", "index.js"];
var CONTRACT_PACKAGE_STATE_FILE = ".contract-package-state.json";

// src/modules/versioning/versioning.hash.ts
function addContractFiles(contracts) {
  return [...PUBLISHABLE_FILES, ...contracts.flatMap((contract) => [`${contract}.d.ts`, `${contract}.js`])];
}
async function computePackageHash(packageDir, contracts) {
  const hash = crypto.createHash("sha256");
  const filesToHash = addContractFiles(contracts);
  for (const filename of filesToHash.sort()) {
    const filePath = path9.join(packageDir, filename);
    try {
      let content = await fs6.readFile(filePath, "utf-8");
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

// src/modules/versioning/versioning.state.ts
import fs7 from "fs-extra";
import path10 from "path";

// src/utilities/type.utilities.ts
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

// src/modules/versioning/versioning.state.ts
function toContractState(value) {
  if (!isRecord(value) || typeof value.hash !== "string") {
    return null;
  }
  return { hash: value.hash };
}
function getStatePath(packageDir) {
  return path10.join(path10.dirname(packageDir), CONTRACT_PACKAGE_STATE_FILE);
}
async function getContractState(packageDir) {
  const statePath = getStatePath(packageDir);
  try {
    if (await fs7.pathExists(statePath)) {
      const rawState = await fs7.readJSON(statePath);
      return toContractState(rawState);
    }
  } catch {
    return null;
  }
  return null;
}
async function writeContractState(packageDir, state) {
  const statePath = getStatePath(packageDir);
  await fs7.writeJSON(statePath, state, { spaces: 2 });
}

// src/modules/versioning/versioning.semver.ts
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

// src/modules/prepare/prepare.artifacts.ts
import fs8 from "fs-extra";
import path11 from "path";
function getGeneratedDirPath() {
  return path11.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "generated");
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
    description: `Shared TypeScript contract definitions for ${config.app}.`,
    version: config.package.version,
    private: false,
    type: "module",
    sideEffects: false,
    files,
    exports,
    types: "./index.d.ts"
  };
}
function generateIndexDts(contracts, emittedContracts) {
  const typeExports = contracts.map((contract) => `export type * from './${contract}';`).join("\n");
  const runtimeExports = emittedContracts.map((contract) => `export * from './${contract}';`).join("\n");
  return [typeExports, runtimeExports].filter(Boolean).join("\n");
}
function generateIndexJs(emittedContracts) {
  if (emittedContracts.length === 0) {
    return generateStubJs();
  }
  return emittedContracts.map((contract) => `export * from './${contract}.js';`).join("\n");
}
function generateStubJs() {
  return "export {};";
}
async function collectExistingGeneratedContracts(config, onMissing, onMissingEmitted) {
  const generatedDir = getGeneratedDirPath();
  const existing = [];
  for (const contract of config.contracts) {
    const contractFileName = `${config.app}.contract.${contract}.d.ts`;
    const contractFilePath = path11.join(generatedDir, contractFileName);
    try {
      if (await fs8.pathExists(contractFilePath)) {
        existing.push(contract);
      } else {
        onMissing(contract);
      }
      if (config.emit.includes(contract)) {
        const runtimeFilePath = path11.join(generatedDir, `${config.app}.contract.${contract}.js`);
        if (!await fs8.pathExists(runtimeFilePath)) {
          onMissingEmitted(contract);
        }
      }
    } catch {
      onMissing(contract);
    }
  }
  return existing;
}
async function writePreparedArtifacts(config, packageDir, contracts, emittedContracts) {
  const generatedDir = getGeneratedDirPath();
  await fs8.remove(packageDir);
  await fs8.ensureDir(packageDir);
  for (const contract of contracts) {
    const sourceFile = path11.join(generatedDir, `${config.app}.contract.${contract}.d.ts`);
    const destFile = path11.join(packageDir, `${contract}.d.ts`);
    const content = await fs8.readFile(sourceFile, "utf-8");
    await fs8.writeFile(destFile, content);
  }
  await fs8.writeFile(path11.join(packageDir, "index.d.ts"), generateIndexDts(contracts, emittedContracts));
  const jsStub = generateStubJs();
  await fs8.writeFile(path11.join(packageDir, "index.js"), generateIndexJs(emittedContracts));
  for (const contract of contracts) {
    if (emittedContracts.includes(contract)) {
      const sourceFile = path11.join(generatedDir, `${config.app}.contract.${contract}.js`);
      const destFile = path11.join(packageDir, `${contract}.js`);
      const content = await fs8.readFile(sourceFile, "utf-8");
      await fs8.writeFile(destFile, content);
    } else {
      await fs8.writeFile(path11.join(packageDir, `${contract}.js`), jsStub);
    }
  }
  const packageJson = generatePackageJson(config, contracts);
  const packageJsonPath = path11.join(packageDir, "package.json");
  await fs8.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
  return { packageJsonPath, baseVersion: String(packageJson.version) };
}
async function updatePackageVersion(packageJsonPath, newVersion) {
  const packageJson = await fs8.readJSON(packageJsonPath);
  packageJson.version = newVersion;
  await fs8.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

// src/modules/prepare/prepare.messages.ts
import { log as log6 } from "@clack/prompts";
import { green as green4 } from "kleur/colors";
var packagePreparationStartedMessage = (app) => log6.info(`Preparing ${green4(app)} package...`);
var packagePreparationCompletedMessage = () => log6.success("Package ready.");
var missingGeneratedContractsMessage = (contractName) => log6.warn(`Missing generated contract ${green4(contractName)}. Run ${green4("contract build")}.`);
var missingEmittedContractsMessage = (contractName) => log6.warn(`Missing emitted runtime for ${green4(contractName)}. Run ${green4("contract build")}.`);
var versionBumpedMessage = (oldVersion, newVersion, reason) => log6.success(`Version bumped from ${green4(oldVersion)} to ${green4(newVersion)} (${reason}).`);
var versionForcedMessage = (newVersion, bumpType) => log6.success(`Version forced to ${green4(newVersion)} via --bump ${bumpType}.`);
var versionNoChangeMessage = (version) => log6.info(`No changes. Version ${green4(version)}.`);
var fatalErrorWhilePreparingPackageMessage = (error) => log6.error(`Prepare failed: ${error}`);

// src/modules/prepare/prepare.versioning.ts
async function applyPrepareVersioning(context) {
  const { config, packageDir, packageJsonPath, contracts, baseVersion, previousHash, options } = context;
  if (options.bump) {
    const bumpedVersion = bumpVersion(baseVersion, options.bump);
    await updateConfigVersion(bumpedVersion);
    await updatePackageVersion(packageJsonPath, bumpedVersion);
    versionForcedMessage(bumpedVersion, options.bump);
    return;
  }
  if (options.noBump) {
    return;
  }
  const currentHash = await computePackageHash(packageDir, contracts);
  if (previousHash && previousHash !== currentHash) {
    const bumpedVersion = bumpVersion(baseVersion, "patch");
    await updateConfigVersion(bumpedVersion);
    await updatePackageVersion(packageJsonPath, bumpedVersion);
    versionBumpedMessage(config.package.version, bumpedVersion, "content changed");
  } else {
    versionNoChangeMessage(baseVersion);
  }
  await writeContractState(packageDir, { hash: currentHash });
}

// src/modules/prepare/prepare.services.ts
function getEmittedContracts2(config) {
  return Array.isArray(config.emit) ? config.emit : [];
}
async function prepareContractPackage(config, options = {}) {
  try {
    const emittedContracts = getEmittedContracts2(config);
    packagePreparationStartedMessage(config.app);
    const existingContracts = await collectExistingGeneratedContracts(config, missingGeneratedContractsMessage, missingEmittedContractsMessage);
    if (existingContracts.length === 0) {
      throw new Error('No generated contracts found. Run "contract build" first.');
    }
    const packageDir = path12.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "package");
    const previousState = await getContractState(packageDir);
    const { packageJsonPath, baseVersion } = await writePreparedArtifacts(config, packageDir, existingContracts, emittedContracts);
    await applyPrepareVersioning({
      config,
      packageDir,
      packageJsonPath,
      contracts: existingContracts,
      baseVersion,
      previousHash: previousState?.hash ?? null,
      options
    });
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
import { spinner as spinner3 } from "@clack/prompts";

// src/modules/publish/publish.auth.ts
import fs9 from "fs-extra";
import path13 from "path";
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
  const npmrcPath = path13.join(packageDir, ".npmrc");
  await fs9.writeFile(npmrcPath, `//registry.npmjs.org/:_authToken=${token}
`);
}
async function removeNpmRc(packageDir) {
  const npmrcPath = path13.join(packageDir, ".npmrc");
  await fs9.remove(npmrcPath);
}

// src/modules/publish/publish.errors.ts
function getPublishFailureMessage(output) {
  const normalizedOutput = output.toLowerCase();
  const details = output.trim().split("\n").slice(0, 3).join("\n");
  if (normalizedOutput.includes("eneedauth") || normalizedOutput.includes("e401") || normalizedOutput.includes("403") || normalizedOutput.includes("auth")) {
    return `NPM auth/permission error. Check token and package access.
${details}`;
  }
  if (normalizedOutput.includes("registry")) {
    return `NPM registry error. Verify npmjs.org target.
${details}`;
  }
  return `NPM publish failed.
${details}`;
}

// src/modules/publish/publish.messages.ts
import { log as log7 } from "@clack/prompts";
import { green as green5 } from "kleur/colors";
var publishSpinnerStartedMessage = (packageName, version) => `Publishing ${packageName}@${version} to npm...`;
var publishSpinnerCompletedMessage = (packageName, version) => `Published ${packageName}@${version}.`;
var publishSpinnerFailedMessage = () => "Publish failed.";
var packageDirectoryNotFoundMessage2 = () => log7.error(`Package dir missing. Run ${green5("contract prepare:package")}.`);
var packageJsonNotFoundMessage2 = () => log7.error(`package.json missing. Run ${green5("contract prepare:package")}.`);
var packagePreparationStartedMessage2 = () => log7.info("Preparing package...");
var npmTokenMissingMessage = () => log7.error("NPM token missing. Set config.npm.token, NPM_TOKEN, or NODE_AUTH_TOKEN.");
var fatalErrorWhilePublishingMessage = (error) => log7.error(`Publish failed: ${error}`);

// src/modules/publish/publish.registry.ts
async function versionExistsOnNpm(packageName, version) {
  const checkResult = await executeCommandWithResult("npm", ["view", `${packageName}@${version}`]);
  return checkResult.success;
}
async function assertVersionAvailableOnNpm(packageName, version) {
  const exists = await versionExistsOnNpm(packageName, version);
  if (exists) {
    throw new Error(`Version ${version} already exists on npm. Cannot publish duplicate version.
Run "contract prepare:package --bump patch" to bump the version, then try publishing again.`);
  }
}

// src/modules/publish/publish.validation.ts
import fs10 from "fs-extra";
import path14 from "path";
function resolvePublishPaths() {
  const packageDir = path14.resolve(CONTRACT_DIRECTORY_NAME, "package");
  const packageJsonPath = path14.join(packageDir, "package.json");
  return { packageDir, packageJsonPath };
}
async function ensurePublishPathsExist(paths) {
  if (!await fs10.pathExists(paths.packageDir)) {
    throw new Error("PACKAGE_DIR_NOT_FOUND");
  }
  if (!await fs10.pathExists(paths.packageJsonPath)) {
    throw new Error("PACKAGE_JSON_NOT_FOUND");
  }
}
async function readPackageJsonInfo(packageJsonPath) {
  const packageJson = await fs10.readJSON(packageJsonPath);
  if (!packageJson.name) {
    throw new Error('package.json is missing a valid "name" field.');
  }
  return packageJson;
}
async function syncPackageJsonVersion(packageJsonPath, packageJson, expectedVersion) {
  if (packageJson.version !== expectedVersion) {
    packageJson.version = expectedVersion;
    await fs10.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
  }
}

// src/modules/publish/publish.services.ts
async function publishContractPackage(options = {}) {
  let packageDirForCleanup = null;
  let publishSpinner = null;
  try {
    let config = await getConfig();
    if (options.prepare) {
      packagePreparationStartedMessage2();
      await handleEnvironment(config);
      await prepareContractPackage(config);
      config = await getConfig();
    }
    const paths = resolvePublishPaths();
    packageDirForCleanup = paths.packageDir;
    try {
      await ensurePublishPathsExist(paths);
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      if (code === "PACKAGE_DIR_NOT_FOUND") {
        packageDirectoryNotFoundMessage2();
        process.exitCode = 1;
        return;
      }
      if (code === "PACKAGE_JSON_NOT_FOUND") {
        packageJsonNotFoundMessage2();
        process.exitCode = 1;
        return;
      }
      throw error;
    }
    const packageJson = await readPackageJsonInfo(paths.packageJsonPath);
    const packageName = packageJson.name;
    const packageVersion = config.package.version;
    await assertVersionAvailableOnNpm(packageName, packageVersion);
    await syncPackageJsonVersion(paths.packageJsonPath, packageJson, packageVersion);
    const npmToken = resolveNpmToken(config);
    if (!npmToken) {
      npmTokenMissingMessage();
      process.exitCode = 1;
      return;
    }
    publishSpinner = spinner3();
    publishSpinner.start(publishSpinnerStartedMessage(packageName, packageVersion));
    await writeNpmRc(paths.packageDir, npmToken.token);
    if (options.access && options.access !== "public") {
      throw new Error("Only --access public is supported for contract publish:package.");
    }
    const publishResult = await executeCommandWithResult("npm", ["publish", "--access", "public"], paths.packageDir);
    if (!publishResult.success) {
      const errorOutput = publishResult.stderr || publishResult.stdout || publishResult.errorMessage || "Unknown error";
      throw new Error(getPublishFailureMessage(errorOutput));
    }
    publishSpinner.stop(publishSpinnerCompletedMessage(packageName, packageVersion));
  } catch (error) {
    if (publishSpinner) {
      publishSpinner.stop(publishSpinnerFailedMessage());
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePublishingMessage(errorMessage);
    process.exitCode = 1;
  } finally {
    if (packageDirForCleanup) {
      await removeNpmRc(packageDirForCleanup);
    }
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
