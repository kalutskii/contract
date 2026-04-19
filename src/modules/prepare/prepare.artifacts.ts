import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import type { Config } from '@/environment/environment.schemas';

import type { PackageJsonWithVersion } from './prepare.types';

/** Resolves the generated declarations directory path. */
function getGeneratedDirPath(): string {
  return path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'generated');
}

/** Builds package.json payload for prepared contract package. */
function generatePackageJson(config: Config, contracts: string[]): Record<string, unknown> {
  const exports: Record<string, Record<string, string>> = {
    '.': {
      types: './index.d.ts',
      default: './index.js',
    },
  };

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

/** Generates index declaration that re-exports contract types. */
function generateIndexDts(contracts: string[]): string {
  return contracts.map((contract) => `export type * from './${contract}';`).join('\n');
}

/** Minimal runtime stub for package JS files. */
function generateStubJs(): string {
  return 'export {};';
}

/** Returns configured contracts that already have generated .d.ts files. */
export async function collectExistingGeneratedContracts(
  config: Config,
  onMissing: (contractName: string) => void
): Promise<string[]> {
  // 1) Scan generated folder and keep only contracts that have compiled declarations.
  // 2) Report missing contracts via callback so caller can show warnings.
  const generatedDir = getGeneratedDirPath();
  const existing: string[] = [];

  for (const contract of config.contracts) {
    const contractFileName = `${config.app}.contract.${contract}.d.ts`;
    const contractFilePath = path.join(generatedDir, contractFileName);

    try {
      if (await fs.pathExists(contractFilePath)) {
        existing.push(contract);
      } else {
        onMissing(contract);
      }
    } catch {
      onMissing(contract);
    }
  }

  return existing;
}

/** Recreates package directory and writes declarations/stubs/package.json. */
export async function writePreparedArtifacts(
  config: Config,
  packageDir: string,
  contracts: string[]
): Promise<{ packageJsonPath: string; baseVersion: string }> {
  // 1) Start from a clean output directory.
  const generatedDir = getGeneratedDirPath();

  await fs.remove(packageDir);
  await fs.ensureDir(packageDir);

  // 2) Copy generated declarations into package root with short names.
  for (const contract of contracts) {
    const sourceFile = path.join(generatedDir, `${config.app}.contract.${contract}.d.ts`);
    const destFile = path.join(packageDir, `${contract}.d.ts`);
    const content = await fs.readFile(sourceFile, 'utf-8');
    await fs.writeFile(destFile, content);
  }

  // 3) Write aggregate type entrypoint.
  await fs.writeFile(path.join(packageDir, 'index.d.ts'), generateIndexDts(contracts));

  // 4) Write runtime stubs required by package exports map.
  const jsStub = generateStubJs();
  await fs.writeFile(path.join(packageDir, 'index.js'), jsStub);
  for (const contract of contracts) {
    await fs.writeFile(path.join(packageDir, `${contract}.js`), jsStub);
  }

  // 5) Generate package metadata and return key values for next steps.
  const packageJson = generatePackageJson(config, contracts);
  const packageJsonPath = path.join(packageDir, 'package.json');
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

  return { packageJsonPath, baseVersion: String(packageJson.version) };
}

/** Updates the version field in prepared package.json. */
export async function updatePackageVersion(packageJsonPath: string, newVersion: string): Promise<void> {
  // Read-modify-write keeps existing package fields untouched.
  const packageJson = (await fs.readJSON(packageJsonPath)) as PackageJsonWithVersion;
  packageJson.version = newVersion;
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
