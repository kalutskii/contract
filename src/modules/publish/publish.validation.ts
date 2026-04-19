import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';

import type { PackageJsonInfo } from './publish.types';

/** Filesystem paths needed by the publish flow. */
interface PublishPaths {
  packageDir: string;
  packageJsonPath: string;
}

/** Resolves file-system paths used by publish flow. */
export function resolvePublishPaths(): PublishPaths {
  // Keep all publish path rules in one place.
  const packageDir = path.resolve(CONTRACT_DIRECTORY_NAME, 'package');
  const packageJsonPath = path.join(packageDir, 'package.json');
  return { packageDir, packageJsonPath };
}

/** Ensures prepared package directory and package.json exist. */
export async function ensurePublishPathsExist(paths: PublishPaths): Promise<void> {
  // Fail with explicit codes so caller can map to user-friendly messages.
  if (!(await fs.pathExists(paths.packageDir))) {
    throw new Error('PACKAGE_DIR_NOT_FOUND');
  }

  if (!(await fs.pathExists(paths.packageJsonPath))) {
    throw new Error('PACKAGE_JSON_NOT_FOUND');
  }
}

/** Reads package.json and validates required fields. */
export async function readPackageJsonInfo(packageJsonPath: string): Promise<PackageJsonInfo> {
  // Parse once and validate minimum fields required for npm publish.
  const packageJson = (await fs.readJSON(packageJsonPath)) as PackageJsonInfo;

  if (!packageJson.name) {
    throw new Error('package.json is missing a valid "name" field.');
  }

  return packageJson;
}

/** Synchronizes package.json version with source-of-truth config version. */
export async function syncPackageJsonVersion(
  packageJsonPath: string,
  packageJson: PackageJsonInfo,
  expectedVersion: string
): Promise<void> {
  // Update only when needed to avoid unnecessary writes.
  if (packageJson.version !== expectedVersion) {
    packageJson.version = expectedVersion;
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
  }
}
