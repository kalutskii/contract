#!/usr/bin/env bun
import { createRequire } from "node:module";
import { Cli, Command, Option } from "clipanion";
import fs from "fs-extra";
import { confirm, isCancel, log, spinner } from "@clack/prompts";
import { z } from "zod";
import path from "path";
import { pathToFileURL } from "url";
import { build } from "esbuild";
import { rolldown } from "rolldown";
import { dts } from "rolldown-plugin-dts";
import { green } from "kleur/colors";
import fs$1 from "fs/promises";
import { execa } from "execa";
import crypto from "crypto";
//#region src/library.metadata.ts
const packageMetadata = createRequire(import.meta.url)("../package.json");
const libraryMetadata = {
	name: packageMetadata.name,
	version: packageMetadata.version
};
//#endregion
//#region src/adapters/clipanion.client.ts
/** Creates a configured Clipanion CLI client for this package. */
function getClipanionClient() {
	return new Cli({
		binaryName: libraryMetadata.name,
		binaryLabel: `${libraryMetadata.name}-cli`,
		binaryVersion: libraryMetadata.version
	});
}
//#endregion
//#region src/environment/environment.chat.ts
/** Asks whether existing environment files should be reinitialized. */
async function initializePrompt() {
	const shouldInitialize = await confirm({
		message: "If contract is already initialized, reinitialization will cause existing files to be overwritten. Do you want to proceed?",
		initialValue: true
	});
	return isCancel(shouldInitialize) ? false : shouldInitialize;
}
/** Asks whether a new default config file should be created. */
async function configFileCreationPrompt() {
	const shouldCreate = await confirm({
		message: "No configuration found. Would you like to create one?",
		initialValue: true
	});
	return isCancel(shouldCreate) ? false : shouldCreate;
}
/** Logs successful environment cleanup. */
const environmentClearedMessage = () => log.success("Existing contract environment cleared.");
/** Logs schema validation issues for config files. */
const invalidConfigMessage = (configPath, errorMessage) => log.error(`Invalid config format at ${configPath}: ${errorMessage}`);
/** Logs that the config file is missing and user may create a default one. */
const configFileNotFoundMessage = (configPath) => log.warn(`Config not found at ${configPath}.`);
/** Logs that config file exists but could not be loaded as a module. */
const configFileLoadFailedMessage = (configPath, errorMessage) => log.error(`Failed to load config at ${configPath}: ${errorMessage}`);
//#endregion
//#region src/environment/environment.constants.ts
/** Default file name for the contract configuration module. */
const CONFIG_FILE_NAME = "contract.config.ts";
/** Default contract keys used when bootstrapping a new config. */
const DEFAULT_CONTRACTS = ["api", "types"];
/** Root directory containing generated contract artifacts. */
const CONTRACT_DIRECTORY_NAME = "contract";
/** Subdirectories required inside the contract environment root. */
const ENVIRONMENT_DIRECTORIES = ["manifests", "generated"];
//#endregion
//#region src/environment/environment.schemas.ts
/** Runtime schema for project contract configuration. */
const ConfigSchema = z.object({
	app: z.string().regex(/^[a-zA-Z_-]+$/).default("placeholder").meta({ description: "The name of the application, used in filenames and identifiers." }),
	contracts: z.array(z.string().regex(/^[a-zA-Z_-]+$/)).default([]).meta({ description: "Array of selected contract names." }),
	emit: z.array(z.string().regex(/^[a-zA-Z_-]+$/)).default([]).meta({ description: "Subset of contracts that should also emit runtime JavaScript artifacts." }),
	package: z.object({
		name: z.string().meta({ description: "NPM package name, e.g. @scope/package-name" }),
		version: z.string().regex(/^\d+\.\d+\.\d+/).meta({ description: "Semantic version, e.g. 1.0.0" }),
		exports: z.record(z.string(), z.string()).optional().meta({ description: "Optional package exports configuration." })
	}).meta({ description: "Package metadata for contract distribution." }),
	npm: z.object({ token: z.string().meta({ description: "NPM authentication token used for publishing." }) }).optional().meta({ description: "Optional npm publishing configuration." })
}).superRefine((config, context) => {
	const contractNames = new Set(config.contracts);
	for (const contract of config.emit) if (!contractNames.has(contract)) context.addIssue({
		code: z.ZodIssueCode.custom,
		path: ["emit"],
		message: `Emitted contract "${contract}" must be listed in contracts.`
	});
});
/** Runtime schema describing expected filesystem environment state. */
const EnvironmentStatusSchema = z.object({
	contractDirectoryExists: z.boolean().default(false).meta({ description: "Indicates if the main contract directory exists." }),
	directoriesExistence: z.object({
		manifests: z.boolean(),
		generated: z.boolean()
	}).default({
		manifests: false,
		generated: false
	}).meta({ description: "Existence status of required environment directories." }),
	manifestsExistence: z.record(z.string(), z.boolean()).default({}).meta({ description: "Existence status of required contract manifest files (contract.<contract>.manifest.ts)." })
});
//#endregion
//#region src/environment/environment.inspection.ts
/** Inspects current environment directories and manifests required by config. */
async function inspectContractEnvironment(config, contractFolderPath) {
	const environmentStatus = EnvironmentStatusSchema.parse({});
	environmentStatus.contractDirectoryExists = await fs.pathExists(contractFolderPath);
	if (!environmentStatus.contractDirectoryExists) return environmentStatus;
	for (const dir of ENVIRONMENT_DIRECTORIES) environmentStatus.directoriesExistence[dir] = await fs.pathExists(path.join(contractFolderPath, dir));
	for (const contract of config.contracts) {
		const manifestFilePath = path.join(contractFolderPath, "manifests", `contract.${contract}.manifest.ts`);
		environmentStatus.manifestsExistence[contract] = await fs.pathExists(manifestFilePath);
	}
	return environmentStatus;
}
//#endregion
//#region src/environment/environment.loader.ts
/** Resolves an absolute config path inside the current workspace. */
function resolveConfigModulePath(configPath) {
	return path.join(process.cwd(), configPath);
}
/** Builds a file URL with cache-busting query so repeated reads see latest config file content. */
async function resolveConfigModuleUrl(modulePath) {
	const fileUrl = pathToFileURL(modulePath);
	const stat = await fs.stat(modulePath);
	fileUrl.searchParams.set("t", String(stat.mtimeMs));
	return fileUrl.href;
}
/** Loads and validates a config module from the given relative path. */
async function loadConfigFile(configPath) {
	const modulePath = resolveConfigModulePath(configPath);
	if (!await fs.pathExists(modulePath)) {
		configFileNotFoundMessage(configPath);
		return null;
	}
	try {
		const configModule = await import(await resolveConfigModuleUrl(modulePath));
		const config = await ConfigSchema.safeParseAsync(configModule.default);
		if (config.success) return config.data;
		invalidConfigMessage(configPath, config.error.message);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		configFileLoadFailedMessage(configPath, errorMessage);
	}
	return null;
}
//#endregion
//#region src/environment/environment.templates.ts
/** Renders the default TypeScript config template for the user project. */
const renderConfigTemplate = (defaultConfig) => {
	const npmConfig = defaultConfig.npm ? `,
  npm: {
    token: '${defaultConfig.npm.token}',
  }` : `,
  // npm: {
  //   token: process.env.NPM_TOKEN ?? '',
  // }`;
	return `import type { Config } from '@kalutskii/contract';

// Configuration for contract generation, do not edit this file if you are not sure what you are doing.
// More details about this custom contract library: https://github.com/kalutskii/contract#quick-start

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
/** Renders a contract manifest template source file for the selected contract. */
const renderManifestTemplate = (contractName) => `// Define and export all types related to this contract (${contractName}).
// This file will be bundled into ${contractName}.d.ts during "contract build".

// If this contract is listed in config.emit, re-export runtime values only from direct leaf files.
// Keep emitted source files free of unrelated local imports, or they will be pulled into the bundle.

`;
//#endregion
//#region src/environment/environment.services.ts
/** Resolves the root directory for generated contract environment artifacts. */
function getContractRootPath() {
	return path.join(process.cwd(), CONTRACT_DIRECTORY_NAME);
}
/** Resolves the project config file path on disk. */
function getConfigFilePath() {
	return path.resolve(CONFIG_FILE_NAME);
}
/** Ensures required environment directories exist and updates status in place. */
async function ensureEnvironmentDirectories(contractFolderPath, environmentStatus) {
	if (!environmentStatus.contractDirectoryExists) {
		await fs.ensureDir(contractFolderPath);
		environmentStatus.contractDirectoryExists = true;
	}
	for (const dir of ENVIRONMENT_DIRECTORIES) if (!environmentStatus.directoriesExistence[dir]) {
		await fs.ensureDir(path.join(contractFolderPath, dir));
		environmentStatus.directoriesExistence[dir] = true;
	}
}
/** Creates missing manifest files for contracts enabled in config. */
async function ensureManifestFiles(contractFolderPath, environmentStatus) {
	for (const [contract, exists] of Object.entries(environmentStatus.manifestsExistence)) if (!exists) {
		const manifestFilePath = path.join(contractFolderPath, "manifests", `contract.${contract}.manifest.ts`);
		await Bun.write(manifestFilePath, renderManifestTemplate(contract));
		environmentStatus.manifestsExistence[contract] = true;
	}
}
/** Creates a default contract config file and returns its parsed config object. */
async function createDefaultConfigFile() {
	const defaultConfig = ConfigSchema.parse({
		contracts: DEFAULT_CONTRACTS,
		package: {
			name: "@scope/contracts",
			version: "1.0.0"
		}
	});
	await Bun.write(CONFIG_FILE_NAME, renderConfigTemplate(defaultConfig));
	return defaultConfig;
}
/** Returns current config, optionally creating a default one if the user agrees. */
async function getConfig() {
	const config = await loadConfigFile(CONFIG_FILE_NAME);
	if (!config) {
		if (await configFileCreationPrompt()) return createDefaultConfigFile();
		return process.exit(0);
	}
	return config;
}
/** Ensures required environment directories and manifest files exist for all contracts. */
async function handleEnvironment(config) {
	const contractFolderPath = getContractRootPath();
	const environmentStatus = await inspectContractEnvironment(config, contractFolderPath);
	await ensureEnvironmentDirectories(contractFolderPath, environmentStatus);
	await ensureManifestFiles(contractFolderPath, environmentStatus);
	return environmentStatus;
}
/** Removes the generated contract environment directory. */
async function clearEnvironment() {
	const contractFolderPath = getContractRootPath();
	await fs.remove(contractFolderPath);
	environmentClearedMessage();
}
/** Updates only the version field inside the project config file. */
async function updateConfigVersion(newVersion) {
	const configPath = getConfigFilePath();
	const content = await fs.readFile(configPath, "utf-8");
	const packageVersionRegex = /(package:\s*\{[\s\S]*?version:\s*['"])([^'"]+)(['"])/;
	if (!packageVersionRegex.test(content)) throw new Error(`Could not find version field in ${configPath}`);
	const updatedContent = content.replace(packageVersionRegex, `$1${newVersion}$3`);
	await fs.writeFile(configPath, updatedContent, "utf-8");
}
//#endregion
//#region src/modules/build/build.messages.ts
/** Returns spinner text shown when declaration build starts. */
const buildSpinnerStartedMessage = (contractsCount) => `Building ${green(String(contractsCount))} contract declaration(s)...`;
/** Returns spinner text shown when declaration build succeeds. */
const buildSpinnerCompletedMessage = (contracts) => {
	const names = contracts.join(", ");
	return `Built ${green(String(contracts.length))} contract declaration(s): ${green(names)}.`;
};
/** Returns spinner text shown when declaration build fails. */
const buildSpinnerFailedMessage = () => "Build failed.";
/** Logs fatal bundling error details. */
const fatalErrorWhileBundlingMessage = (error) => log.error(`Build failed: ${error}`);
//#endregion
//#region src/modules/build/build.paths.ts
/** Resolves manifest input and generated output paths for a contract bundle. */
function resolveContractBundlePaths(app, contract) {
	return {
		input: path.join(CONTRACT_DIRECTORY_NAME, "manifests", `contract.${contract}.manifest.ts`),
		output: path.join(CONTRACT_DIRECTORY_NAME, "generated", `${app}.contract.${contract}.d.ts`),
		runtimeOutput: path.join(CONTRACT_DIRECTORY_NAME, "generated", `${app}.contract.${contract}.js`)
	};
}
//#endregion
//#region src/modules/build/build.utilities.ts
/** Collect bare package names that should stay external in generated bundles. */
async function getRuntimeExternalPackages() {
	const packageJSONPath = path.join(process.cwd(), "package.json");
	try {
		const rawPackageJSON = await fs$1.readFile(packageJSONPath, "utf-8");
		const packageJSON = JSON.parse(rawPackageJSON);
		return [.../* @__PURE__ */ new Set([
			...Object.keys(packageJSON.dependencies ?? {}),
			...Object.keys(packageJSON.devDependencies ?? {}),
			...Object.keys(packageJSON.peerDependencies ?? {}),
			...Object.keys(packageJSON.optionalDependencies ?? {})
		])].flatMap((packageName) => [packageName, `${packageName}/*`]);
	} catch {
		return [];
	}
}
//#endregion
//#region src/modules/build/build.bundle.ts
/** Bundles a single contract manifest into a generated declaration file. */
async function bundleContractDeclaration(app, contract) {
	const paths = resolveContractBundlePaths(app, contract);
	const externalPackages = await getRuntimeExternalPackages();
	const isExternalPackage = (id) => externalPackages.some((packageName) => id === packageName || packageName.endsWith("/*") && id.startsWith(packageName.slice(0, -1)));
	try {
		const bundle = await rolldown({
			external: isExternalPackage,
			input: paths.input,
			logLevel: "silent",
			plugins: [dts({
				emitDtsOnly: true,
				tsconfig: path.join(process.cwd(), "tsconfig.json")
			})]
		});
		try {
			const declaration = (await bundle.generate({
				dir: path.dirname(paths.output),
				entryFileNames: path.basename(paths.output),
				format: "es"
			})).output.find((output) => output.type === "chunk" && output.facadeModuleId?.endsWith(".d.ts"));
			if (!declaration || declaration.type !== "chunk") throw new Error(`Failed to produce declaration output for ${paths.input}.`);
			await fs$1.writeFile(paths.output, declaration.code);
		} finally {
			await bundle.close();
		}
		return true;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		fatalErrorWhileBundlingMessage(errorMessage);
		return false;
	}
}
/** Bundles a single contract manifest into a runtime JavaScript file. */
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
			target: "esnext",
			treeShaking: true,
			tsconfig: path.join(process.cwd(), "tsconfig.json")
		});
		return true;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		fatalErrorWhileBundlingMessage(errorMessage);
		return false;
	}
}
//#endregion
//#region src/modules/build/build.services.ts
/** Returns a safe list of emitted contracts from config. */
function getEmittedContracts$1(config) {
	return Array.isArray(config.emit) ? config.emit : [];
}
/** Bundles declaration files for every contract configured in the project. */
async function bundleAllContractDeclarations(config) {
	const buildSpinner = spinner();
	const emittedContracts = getEmittedContracts$1(config);
	try {
		buildSpinner.start(buildSpinnerStartedMessage(config.contracts.length));
		for (const contract of config.contracts) {
			if (!await bundleContractDeclaration(config.app, contract)) {
				buildSpinner.stop(buildSpinnerFailedMessage());
				process.exit(1);
			}
			if (emittedContracts.includes(contract)) {
				if (!await bundleContractRuntime(config.app, contract)) {
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
//#endregion
//#region src/modules/build/build.commands.ts
/** CLI command that builds all configured contract declaration bundles. */
var BuildCommand = class extends Command {
	static paths = [["build"]];
	async execute() {
		const config = await getConfig();
		await handleEnvironment(config);
		await bundleAllContractDeclarations(config);
	}
};
//#endregion
//#region src/modules/init/init.messages.ts
/** Logs when initialization is cancelled by the user. */
const initializationCancelledMessage = () => log.info("Initialization cancelled by user.");
/** Logs successful project initialization instructions. */
const initializationCompletedMessage = () => log.success(`Initialized. Edit ${green("contract.config.ts")} and run ${green("contract update:environment")}.`);
/** Logs successful environment update instructions. */
const environmentUpdateCompletedMessage = () => log.success(`Environment synced. Define types in manifests, then run ${green("contract build")}.`);
//#endregion
//#region src/modules/init/init.services.ts
/** Runs interactive project initialization from scratch. */
async function initializeContractProject() {
	if (!await initializePrompt()) {
		initializationCancelledMessage();
		return;
	}
	await clearEnvironment();
	await handleEnvironment(await createDefaultConfigFile());
	initializationCompletedMessage();
}
/** Synchronizes folders and manifests with the current config. */
async function updateContractEnvironment() {
	await handleEnvironment(await getConfig());
	environmentUpdateCompletedMessage();
}
//#endregion
//#region src/modules/init/init.commands.ts
/** CLI command that reinitializes contract configuration and environment. */
var InitCommand = class extends Command {
	static paths = [["init"]];
	async execute() {
		await initializeContractProject();
	}
};
/** CLI command that syncs environment folders and contract manifests. */
var UpdateEnvironmentCommand = class extends Command {
	static paths = [["update:environment"]];
	async execute() {
		await updateContractEnvironment();
	}
};
//#endregion
//#region src/utilities/execution.utilities.ts
function createOutputBuffer() {
	return {
		stdout: "",
		stderr: ""
	};
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
	return {
		success: true,
		stdout: buffer.stdout,
		stderr: buffer.stderr
	};
}
/** Executes a shell command and returns collected stdout/stderr with status. */
async function executeCommandWithResult(command, args, cwd) {
	const output = createOutputBuffer();
	try {
		const subprocess = execa(command, args, {
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			shell: true,
			cwd
		});
		attachOutputListeners(subprocess, output);
		await subprocess;
		return createSuccessResult(output);
	} catch (error) {
		return createFailedResult(output, error);
	}
}
/** Executes a shell command and logs errors when the command fails. */
async function executeCommand(command, args, cwd) {
	const result = await executeCommandWithResult(command, args, cwd);
	if (!result.success) {
		const errorMessage = result.stderr || result.stdout || result.errorMessage || "Unknown error";
		log.error(`Error executing command: ${command} ${args.join(" ")}\n${errorMessage}`);
		return false;
	}
	return true;
}
//#endregion
//#region src/modules/pack/pack.messages.ts
/** Returns spinner text when package packing starts. */
const packSpinnerStartedMessage = () => "Packing contract package...";
/** Returns spinner text when package packing succeeds with archive details. */
const packSpinnerCompletedMessage = (filename, filepath) => `Packed ${filename} (${filepath}).`;
/** Returns spinner text when package packing succeeds but archive name is unavailable. */
const packSpinnerCompletedFallbackMessage = () => "Packed package successfully.";
/** Returns spinner text when package packing fails. */
const packSpinnerFailedMessage = () => "Pack failed.";
/** Logs that prepared package directory is missing. */
const packageDirectoryNotFoundMessage$1 = () => log.error(`Package dir missing. Run ${green("contract prepare:package")}.`);
/** Logs that package metadata file is missing. */
const packageJsonNotFoundMessage$1 = () => log.error(`package.json missing. Run ${green("contract prepare:package")}.`);
/** Logs fatal pack command failure details. */
const fatalErrorWhilePackingMessage = (error) => log.error(`Pack failed: ${error}`);
//#endregion
//#region src/modules/pack/pack.validation.ts
/** Resolves filesystem paths used by the pack flow. */
function resolvePackPaths() {
	const packageDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "package");
	return {
		packageDir,
		packageJsonPath: path.join(packageDir, "package.json")
	};
}
/** Ensures prepared package directory and package.json exist before npm pack. */
async function ensurePackPathsExist(paths) {
	if (!await fs.pathExists(paths.packageDir)) throw new Error("PACKAGE_DIR_NOT_FOUND");
	if (!await fs.pathExists(paths.packageJsonPath)) throw new Error("PACKAGE_JSON_NOT_FOUND");
}
/** Returns generated tarball filename if npm pack created one. */
async function findPackedArchive(packageDir) {
	return (await fs.readdir(packageDir)).find((file) => file.endsWith(".tgz")) ?? null;
}
//#endregion
//#region src/modules/pack/pack.services.ts
/** Packs the prepared contract package directory into an npm tarball. */
async function packContractPackage() {
	let packSpinner = null;
	try {
		packSpinner = spinner();
		packSpinner.start(packSpinnerStartedMessage());
		const paths = resolvePackPaths();
		try {
			await ensurePackPathsExist(paths);
		} catch (error) {
			const code = error instanceof Error ? error.message : String(error);
			if (code === "PACKAGE_DIR_NOT_FOUND") {
				packageDirectoryNotFoundMessage$1();
				process.exit(1);
			}
			if (code === "PACKAGE_JSON_NOT_FOUND") {
				packageJsonNotFoundMessage$1();
				process.exit(1);
			}
			throw error;
		}
		if (!await executeCommand("npm", ["pack"], paths.packageDir)) process.exit(1);
		const tgzFile = await findPackedArchive(paths.packageDir);
		if (tgzFile) {
			const tgzPath = path.join(paths.packageDir, tgzFile);
			packSpinner.stop(packSpinnerCompletedMessage(tgzFile, tgzPath));
		} else packSpinner.stop(packSpinnerCompletedFallbackMessage());
	} catch (error) {
		if (packSpinner) packSpinner.stop(packSpinnerFailedMessage());
		const errorMessage = error instanceof Error ? error.message : String(error);
		fatalErrorWhilePackingMessage(errorMessage);
		process.exit(1);
	}
}
//#endregion
//#region src/modules/pack/pack.commands.ts
/** CLI command that packs the prepared contract package into a tarball. */
var PackPackageCommand = class extends Command {
	static paths = [["pack:package"]];
	async execute() {
		await packContractPackage();
	}
};
//#endregion
//#region src/modules/versioning/versioning.constants.ts
const PUBLISHABLE_FILES = [
	"package.json",
	"index.d.ts",
	"index.js"
];
const CONTRACT_PACKAGE_STATE_FILE = ".contract-package-state.json";
//#endregion
//#region src/modules/versioning/versioning.hash.ts
/** Adds contract declaration/stub files to the baseline file list. */
function addContractFiles(contracts) {
	return [...PUBLISHABLE_FILES, ...contracts.flatMap((contract) => [`${contract}.d.ts`, `${contract}.js`])];
}
/** Computes a deterministic SHA-256 hash for package file contents. */
async function computePackageHash(packageDir, contracts) {
	const hash = crypto.createHash("sha256");
	const filesToHash = addContractFiles(contracts);
	for (const filename of filesToHash.sort()) {
		const filePath = path.join(packageDir, filename);
		try {
			let content = await fs.readFile(filePath, "utf-8");
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
//#endregion
//#region src/utilities/type.utilities.ts
/** Returns true when value is a non-null object record. */
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
//#endregion
//#region src/modules/versioning/versioning.state.ts
/** Convert parsed JSON to a valid ContractState when possible. */
function toContractState(value) {
	if (!isRecord(value) || typeof value.hash !== "string") return null;
	return { hash: value.hash };
}
/** Resolves the persistent state file path for a package directory. */
function getStatePath(packageDir) {
	return path.join(path.dirname(packageDir), CONTRACT_PACKAGE_STATE_FILE);
}
/** Reads the saved hash state from disk. */
async function getContractState(packageDir) {
	const statePath = getStatePath(packageDir);
	try {
		if (await fs.pathExists(statePath)) return toContractState(await fs.readJSON(statePath));
	} catch {
		return null;
	}
	return null;
}
/** Writes the latest hash state to disk. */
async function writeContractState(packageDir, state) {
	const statePath = getStatePath(packageDir);
	await fs.writeJSON(statePath, state, { spaces: 2 });
}
//#endregion
//#region src/modules/versioning/versioning.semver.ts
/** Bumps semantic version according to selected mode. */
function bumpVersion(currentVersion, bumpType) {
	const parts = currentVersion.split(".");
	const [major, minor, patch] = [
		parseInt(parts[0] ?? "0", 10),
		parseInt(parts[1] ?? "0", 10),
		parseInt(parts[2] ?? "0", 10)
	];
	return {
		major: `${major + 1}.0.0`,
		minor: `${major}.${minor + 1}.0`,
		patch: `${major}.${minor}.${patch + 1}`
	}[bumpType];
}
//#endregion
//#region src/modules/prepare/prepare.artifacts.ts
/** Resolves the generated declarations directory path. */
function getGeneratedDirPath() {
	return path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "generated");
}
/** Builds package.json payload for prepared contract package. */
function generatePackageJson(config, contracts) {
	const exports = { ".": {
		types: "./index.d.ts",
		default: "./index.js"
	} };
	for (const contract of contracts) exports[`./${contract}`] = {
		types: `./${contract}.d.ts`,
		default: `./${contract}.js`
	};
	const files = [
		"index.d.ts",
		"index.js",
		...contracts.flatMap((c) => [`${c}.d.ts`, `${c}.js`])
	];
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
/** Generates index declaration that re-exports contract types and emitted runtime values. */
function generateIndexDts(contracts, emittedContracts) {
	return [contracts.map((contract) => `export type * from './${contract}';`).join("\n"), emittedContracts.map((contract) => `export * from './${contract}';`).join("\n")].filter(Boolean).join("\n");
}
/** Generates index runtime module that re-exports emitted contract values. */
function generateIndexJs(emittedContracts) {
	if (emittedContracts.length === 0) return generateStubJs();
	return emittedContracts.map((contract) => `export * from './${contract}.js';`).join("\n");
}
/** Minimal runtime stub for package JS files. */
function generateStubJs() {
	return "export {};";
}
/** Returns configured contracts that already have generated .d.ts files. */
async function collectExistingGeneratedContracts(config, onMissing, onMissingEmitted) {
	const generatedDir = getGeneratedDirPath();
	const existing = [];
	for (const contract of config.contracts) {
		const contractFileName = `${config.app}.contract.${contract}.d.ts`;
		const contractFilePath = path.join(generatedDir, contractFileName);
		try {
			if (await fs.pathExists(contractFilePath)) existing.push(contract);
			else onMissing(contract);
			if (config.emit.includes(contract)) {
				const runtimeFilePath = path.join(generatedDir, `${config.app}.contract.${contract}.js`);
				if (!await fs.pathExists(runtimeFilePath)) onMissingEmitted(contract);
			}
		} catch {
			onMissing(contract);
		}
	}
	return existing;
}
/** Recreates package directory and writes declarations/stubs/package.json. */
async function writePreparedArtifacts(config, packageDir, contracts, emittedContracts) {
	const generatedDir = getGeneratedDirPath();
	await fs.remove(packageDir);
	await fs.ensureDir(packageDir);
	for (const contract of contracts) {
		const sourceFile = path.join(generatedDir, `${config.app}.contract.${contract}.d.ts`);
		const destFile = path.join(packageDir, `${contract}.d.ts`);
		const content = await fs.readFile(sourceFile, "utf-8");
		await fs.writeFile(destFile, content);
	}
	await fs.writeFile(path.join(packageDir, "index.d.ts"), generateIndexDts(contracts, emittedContracts));
	const jsStub = generateStubJs();
	await fs.writeFile(path.join(packageDir, "index.js"), generateIndexJs(emittedContracts));
	for (const contract of contracts) if (emittedContracts.includes(contract)) {
		const sourceFile = path.join(generatedDir, `${config.app}.contract.${contract}.js`);
		const destFile = path.join(packageDir, `${contract}.js`);
		const content = await fs.readFile(sourceFile, "utf-8");
		await fs.writeFile(destFile, content);
	} else await fs.writeFile(path.join(packageDir, `${contract}.js`), jsStub);
	const packageJson = generatePackageJson(config, contracts);
	const packageJsonPath = path.join(packageDir, "package.json");
	await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
	return {
		packageJsonPath,
		baseVersion: String(packageJson.version)
	};
}
/** Updates the version field in prepared package.json. */
async function updatePackageVersion(packageJsonPath, newVersion) {
	const packageJson = await fs.readJSON(packageJsonPath);
	packageJson.version = newVersion;
	await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
//#endregion
//#region src/modules/prepare/prepare.messages.ts
/** Logs start of package preparation for a given app. */
const packagePreparationStartedMessage$1 = (app) => log.info(`Preparing ${green(app)} package...`);
/** Logs successful completion of package preparation. */
const packagePreparationCompletedMessage = () => log.success("Package ready.");
/** Warns that a contract declaration is missing in generated artifacts. */
const missingGeneratedContractsMessage = (contractName) => log.warn(`Missing generated contract ${green(contractName)}. Run ${green("contract build")}.`);
/** Warns that an emitted runtime file is missing in generated artifacts. */
const missingEmittedContractsMessage = (contractName) => log.warn(`Missing emitted runtime for ${green(contractName)}. Run ${green("contract build")}.`);
/** Logs automatic version bump details and reason. */
const versionBumpedMessage = (oldVersion, newVersion, reason) => log.success(`Version bumped from ${green(oldVersion)} to ${green(newVersion)} (${reason}).`);
/** Logs manual version bump done via CLI option. */
const versionForcedMessage = (newVersion, bumpType) => log.success(`Version forced to ${green(newVersion)} via --bump ${bumpType}.`);
/** Logs unchanged version when package content hash is unchanged. */
const versionNoChangeMessage = (version) => log.info(`No changes. Version ${green(version)}.`);
/** Logs fatal prepare command failure details. */
const fatalErrorWhilePreparingPackageMessage = (error) => log.error(`Prepare failed: ${error}`);
//#endregion
//#region src/modules/prepare/prepare.versioning.ts
/** Applies manual/automatic version rules and persists updated hash state. */
async function applyPrepareVersioning(context) {
	const { config, packageDir, packageJsonPath, contracts, baseVersion, previousHash, options } = context;
	if (options.bump) {
		const bumpedVersion = bumpVersion(baseVersion, options.bump);
		await updateConfigVersion(bumpedVersion);
		await updatePackageVersion(packageJsonPath, bumpedVersion);
		versionForcedMessage(bumpedVersion, options.bump);
		return;
	}
	if (options.noBump) return;
	const currentHash = await computePackageHash(packageDir, contracts);
	if (previousHash && previousHash !== currentHash) {
		const bumpedVersion = bumpVersion(baseVersion, "patch");
		await updateConfigVersion(bumpedVersion);
		await updatePackageVersion(packageJsonPath, bumpedVersion);
		versionBumpedMessage(config.package.version, bumpedVersion, "content changed");
	} else versionNoChangeMessage(baseVersion);
	await writeContractState(packageDir, { hash: currentHash });
}
//#endregion
//#region src/modules/prepare/prepare.services.ts
/** Returns a safe list of emitted contracts from config. */
function getEmittedContracts(config) {
	return Array.isArray(config.emit) ? config.emit : [];
}
/** Builds the publishable package directory from generated contract declarations. */
async function prepareContractPackage(config, options = {}) {
	try {
		const emittedContracts = getEmittedContracts(config);
		packagePreparationStartedMessage$1(config.app);
		const existingContracts = await collectExistingGeneratedContracts(config, missingGeneratedContractsMessage, missingEmittedContractsMessage);
		if (existingContracts.length === 0) throw new Error("No generated contracts found. Run \"contract build\" first.");
		const packageDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, "package");
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
//#endregion
//#region src/modules/prepare/prepare.commands.ts
/** CLI command that assembles a publishable package from generated contracts. */
var PreparePackageCommand = class extends Command {
	static paths = [["prepare:package"]];
	bump = Option.String("--bump", { description: "Manual version bump: patch, minor, or major" });
	noBump = Option.Boolean("--no-bump", false, { description: "Skip automatic version bumping" });
	async execute() {
		const config = await getConfig();
		await handleEnvironment(config);
		await prepareContractPackage(config, {
			bump: this.bump,
			noBump: this.noBump
		});
	}
};
//#endregion
//#region src/modules/publish/publish.auth.ts
/** Picks npm auth token from config first, then env fallbacks. */
function resolveNpmToken(config) {
	if (config.npm?.token) return {
		source: "config",
		token: config.npm.token
	};
	if (process.env.NPM_TOKEN) return {
		source: "NPM_TOKEN",
		token: process.env.NPM_TOKEN
	};
	if (process.env.NODE_AUTH_TOKEN) return {
		source: "NODE_AUTH_TOKEN",
		token: process.env.NODE_AUTH_TOKEN
	};
	return null;
}
/** Writes temporary npm auth config into prepared package directory. */
async function writeNpmRc(packageDir, token) {
	const npmrcPath = path.join(packageDir, ".npmrc");
	await fs.writeFile(npmrcPath, `//registry.npmjs.org/:_authToken=${token}\n`);
}
/** Removes temporary npm auth config after publish attempt completes. */
async function removeNpmRc(packageDir) {
	const npmrcPath = path.join(packageDir, ".npmrc");
	await fs.remove(npmrcPath);
}
//#endregion
//#region src/modules/publish/publish.errors.ts
/** Maps npm output into a user-friendly publish failure message. */
function getPublishFailureMessage(output) {
	const normalizedOutput = output.toLowerCase();
	const details = output.trim().split("\n").slice(0, 3).join("\n");
	if (normalizedOutput.includes("eneedauth") || normalizedOutput.includes("e401") || normalizedOutput.includes("403") || normalizedOutput.includes("auth")) return `NPM auth/permission error. Check token and package access.\n${details}`;
	if (normalizedOutput.includes("registry")) return `NPM registry error. Verify npmjs.org target.\n${details}`;
	return `NPM publish failed.\n${details}`;
}
//#endregion
//#region src/modules/publish/publish.messages.ts
/** Returns spinner text when npm publish starts. */
const publishSpinnerStartedMessage = (packageName, version) => `Publishing ${packageName}@${version} to npm...`;
/** Returns spinner text when npm publish succeeds. */
const publishSpinnerCompletedMessage = (packageName, version) => `Published ${packageName}@${version}.`;
/** Returns spinner text when npm publish fails. */
const publishSpinnerFailedMessage = () => "Publish failed.";
/** Logs that prepared package directory is missing. */
const packageDirectoryNotFoundMessage = () => log.error(`Package dir missing. Run ${green("contract prepare:package")}.`);
/** Logs that package metadata file is missing. */
const packageJsonNotFoundMessage = () => log.error(`package.json missing. Run ${green("contract prepare:package")}.`);
/** Logs start of prepare step for publish --prepare flow. */
const packagePreparationStartedMessage = () => log.info("Preparing package...");
/** Logs missing npm auth token guidance. */
const npmTokenMissingMessage = () => log.error("NPM token missing. Set config.npm.token, NPM_TOKEN, or NODE_AUTH_TOKEN.");
/** Logs fatal publish command failure details. */
const fatalErrorWhilePublishingMessage = (error) => log.error(`Publish failed: ${error}`);
//#endregion
//#region src/modules/publish/publish.registry.ts
/** Returns true when the exact package version is already published on npm. */
async function versionExistsOnNpm(packageName, version) {
	return (await executeCommandWithResult("npm", ["view", `${packageName}@${version}`])).success;
}
/** Throws if target version already exists on npm registry. */
async function assertVersionAvailableOnNpm(packageName, version) {
	if (await versionExistsOnNpm(packageName, version)) throw new Error(`Version ${version} already exists on npm. Cannot publish duplicate version.\nRun "contract prepare:package --bump patch" to bump the version, then try publishing again.`);
}
//#endregion
//#region src/modules/publish/publish.validation.ts
/** Resolves file-system paths used by publish flow. */
function resolvePublishPaths() {
	const packageDir = path.resolve(CONTRACT_DIRECTORY_NAME, "package");
	return {
		packageDir,
		packageJsonPath: path.join(packageDir, "package.json")
	};
}
/** Ensures prepared package directory and package.json exist. */
async function ensurePublishPathsExist(paths) {
	if (!await fs.pathExists(paths.packageDir)) throw new Error("PACKAGE_DIR_NOT_FOUND");
	if (!await fs.pathExists(paths.packageJsonPath)) throw new Error("PACKAGE_JSON_NOT_FOUND");
}
/** Reads package.json and validates required fields. */
async function readPackageJsonInfo(packageJsonPath) {
	const packageJson = await fs.readJSON(packageJsonPath);
	if (!packageJson.name) throw new Error("package.json is missing a valid \"name\" field.");
	return packageJson;
}
/** Synchronizes package.json version with source-of-truth config version. */
async function syncPackageJsonVersion(packageJsonPath, packageJson, expectedVersion) {
	if (packageJson.version !== expectedVersion) {
		packageJson.version = expectedVersion;
		await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
	}
}
//#endregion
//#region src/modules/publish/publish.services.ts
/** Publishes prepared contract package artifacts to npm with auth and validation checks. */
async function publishContractPackage(options = {}) {
	let packageDirForCleanup = null;
	let publishSpinner = null;
	try {
		let config = await getConfig();
		if (options.prepare) {
			packagePreparationStartedMessage();
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
				packageDirectoryNotFoundMessage();
				process.exitCode = 1;
				return;
			}
			if (code === "PACKAGE_JSON_NOT_FOUND") {
				packageJsonNotFoundMessage();
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
		publishSpinner = spinner();
		publishSpinner.start(publishSpinnerStartedMessage(packageName, packageVersion));
		await writeNpmRc(paths.packageDir, npmToken.token);
		if (options.access && options.access !== "public") throw new Error("Only --access public is supported for contract publish:package.");
		const publishResult = await executeCommandWithResult("npm", [
			"publish",
			"--access",
			"public"
		], paths.packageDir);
		if (!publishResult.success) {
			const errorOutput = publishResult.stderr || publishResult.stdout || publishResult.errorMessage || "Unknown error";
			throw new Error(getPublishFailureMessage(errorOutput));
		}
		publishSpinner.stop(publishSpinnerCompletedMessage(packageName, packageVersion));
	} catch (error) {
		if (publishSpinner) publishSpinner.stop(publishSpinnerFailedMessage());
		const errorMessage = error instanceof Error ? error.message : String(error);
		fatalErrorWhilePublishingMessage(errorMessage);
		process.exitCode = 1;
	} finally {
		if (packageDirForCleanup) await removeNpmRc(packageDirForCleanup);
	}
}
//#endregion
//#region src/modules/publish/publish.commands.ts
/** CLI command that publishes prepared contract package to npm. */
var PublishPackageCommand = class extends Command {
	static paths = [["publish:package"]];
	access = Option.String("--access", { description: "Kept for compatibility. Only public access is supported." });
	prepare = Option.Boolean("--prepare", false, { description: "Prepare package before publishing" });
	async execute() {
		await publishContractPackage({
			access: this.access,
			prepare: this.prepare
		});
	}
};
//#endregion
//#region cli.entrypoint.ts
const clipanionClient = getClipanionClient();
clipanionClient.register(InitCommand);
clipanionClient.register(UpdateEnvironmentCommand);
clipanionClient.register(BuildCommand);
clipanionClient.register(PreparePackageCommand);
clipanionClient.register(PackPackageCommand);
clipanionClient.register(PublishPackageCommand);
clipanionClient.runExit(process.argv.slice(2));
//#endregion
export {};
