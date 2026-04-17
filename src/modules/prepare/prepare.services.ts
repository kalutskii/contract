import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import type { Config } from '@/environment/environment.schemas';
import { updateConfigVersion } from '@/environment/environment.services';
import { bumpVersion, computePackageHash, getContractState, writeContractState } from '@/utilities/version.utilities';

import {
  fatalErrorWhilePreparingPackageMessage,
  missingGeneratedContractsMessage,
  packageFilesCreatedMessage,
  packageJsonGeneratedMessage,
  packagePreparationCompletedMessage,
  packagePreparationStartedMessage,
  versionBumpedMessage,
  versionForcedMessage,
  versionNoChangeMessage,
} from './prepare.messages';

interface PackageJsonWithVersion {
  /** The version of the package. */
  version: string;
}

async function collectGeneratedContracts(config: Config): Promise<Map<string, boolean>> {
  // Verifies that all configured contracts have generated .d.ts files.

  const contractsMap = new Map<string, boolean>();
  const generatedDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'generated');

  for (const contract of config.contracts) {
    const contractFileName = `${config.app}.contract.${contract}.d.ts`;
    const contractFilePath = path.join(generatedDir, contractFileName);

    try {
      const exists = await fs.pathExists(contractFilePath);
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

function generateIndexDts(contracts: string[]): string {
  // Generates an index.d.ts file that re-exports all contract types.

  const exports = contracts.map((contract) => `export type * from './${contract}';`).join('\n');
  return exports;
}

function generateStubJs(): string {
  // Generates a minimal JavaScript stub file.

  return 'export {};';
}

function generatePackageJson(config: Config, contracts: string[]): Record<string, unknown> {
  // Generates a package.json file for the contract package.

  const exports: Record<string, Record<string, string>> = {
    '.': {
      types: './index.d.ts',
      default: './index.js',
    },
  };

  // Add per-contract exports
  for (const contract of contracts) {
    exports[`./${contract}`] = {
      types: `./${contract}.d.ts`,
      default: `./${contract}.js`,
    };
  }

  const files = ['index.d.ts', 'index.js', ...contracts.flatMap((c) => [`${c}.d.ts`, `${c}.js`])];

  return {
    name: config.package.name,
    version: config.package.version,
    private: false,
    type: 'module',
    sideEffects: false,
    files,
    exports,
    types: './index.d.ts',
  };
}

async function updatePackageVersion(packageJsonPath: string, newVersion: string): Promise<void> {
  // Updates the version field in package.json.

  const packageJson = (await fs.readJSON(packageJsonPath)) as PackageJsonWithVersion;
  packageJson.version = newVersion;
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

/** Builds the publishable package directory from generated contract declarations. */
export async function prepareContractPackage(
  config: Config,
  options: { bump?: 'patch' | 'minor' | 'major'; noBump?: boolean } = {}
): Promise<void> {
  // Prepares a publishable contract package directory with all generated declarations.
  // Automatically bumps version if content changes, unless --no-bump is set.
  // Manual bumps can be forced with --bump patch|minor|major.

  try {
    packagePreparationStartedMessage(config.app);

    // Verify all generated contracts exist
    const contractsMap = await collectGeneratedContracts(config);
    const existingContracts = config.contracts.filter((contract) => contractsMap.get(contract) === true);

    if (existingContracts.length === 0) {
      throw new Error('No generated contracts found. Run "contract build" first.');
    }

    // Create package directory
    const packageDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'package');

    // **CRITICAL**: Read previous state BEFORE removing package directory
    const previousState = await getContractState(packageDir);

    // Clear and recreate package directory
    await fs.remove(packageDir);
    await fs.ensureDir(packageDir);

    // Copy and rename generated .d.ts files
    const generatedDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'generated');

    for (const contract of existingContracts) {
      const sourceFile = path.join(generatedDir, `${config.app}.contract.${contract}.d.ts`);
      const destFile = path.join(packageDir, `${contract}.d.ts`);

      const content = await fs.readFile(sourceFile, 'utf-8');
      await fs.writeFile(destFile, content);
    }

    packageFilesCreatedMessage(packageDir);

    // Generate index.d.ts
    const indexDts = generateIndexDts(existingContracts);
    await fs.writeFile(path.join(packageDir, 'index.d.ts'), indexDts);

    // Generate .js stub files
    const jsStub = generateStubJs();
    await fs.writeFile(path.join(packageDir, 'index.js'), jsStub);

    for (const contract of existingContracts) {
      await fs.writeFile(path.join(packageDir, `${contract}.js`), jsStub);
    }

    // Generate package.json
    const packageJson = generatePackageJson(config, existingContracts);

    // Version comes from the canonical source: contract.config.ts
    const version = String(packageJson.version);

    // Update package.json with the correct version
    packageJson.version = version;
    const packageJsonPath = path.join(packageDir, 'package.json');
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // Version management
    if (options.bump) {
      // Manual bump override
      const bumpedVersion = bumpVersion(version, options.bump);
      await updateConfigVersion(bumpedVersion);
      await updatePackageVersion(packageJsonPath, bumpedVersion);
      versionForcedMessage(bumpedVersion, options.bump);
    } else if (!options.noBump) {
      // Automatic bump based on content hash
      const currentHash = await computePackageHash(packageDir, existingContracts);

      if (previousState && previousState.hash !== currentHash) {
        // Content changed → bump patch version
        const bumpedVersion = bumpVersion(version, 'patch');
        await updateConfigVersion(bumpedVersion);
        await updatePackageVersion(packageJsonPath, bumpedVersion);
        versionBumpedMessage(config.package.version, bumpedVersion, 'content changed');
      } else if (!previousState) {
        // First time → just store hash, version stays the same
        versionNoChangeMessage(version);
      } else {
        // Content unchanged → version stays the same
        versionNoChangeMessage(version);
      }

      // Store the new hash (in contract/.contract-package-state.json)
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
