import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';

/** Filesystem paths needed by the pack flow. */
interface PackPaths {
  packageDir: string;
  packageJsonPath: string;
}

/** Resolves filesystem paths used by the pack flow. */
export function resolvePackPaths(): PackPaths {
  const packageDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'package');
  const packageJsonPath = path.join(packageDir, 'package.json');
  return { packageDir, packageJsonPath };
}

/** Ensures prepared package directory and package.json exist before npm pack. */
export async function ensurePackPathsExist(paths: PackPaths): Promise<void> {
  if (!(await fs.pathExists(paths.packageDir))) {
    throw new Error('PACKAGE_DIR_NOT_FOUND');
  }

  if (!(await fs.pathExists(paths.packageJsonPath))) {
    throw new Error('PACKAGE_JSON_NOT_FOUND');
  }
}

/** Returns generated tarball filename if npm pack created one. */
export async function findPackedArchive(packageDir: string): Promise<string | null> {
  const files = await fs.readdir(packageDir);
  return files.find((file) => file.endsWith('.tgz')) ?? null;
}
