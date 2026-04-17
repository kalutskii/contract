import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import { executeCommand } from '@/utilities/exec.utilities';

import {
  fatalErrorWhilePackingMessage,
  packageDirectoryNotFoundMessage,
  packageJsonNotFoundMessage,
  packagePackedMessage,
  packagePackingStartedMessage,
} from './pack.messages';

/** Packs the prepared contract package directory into an npm tarball. */
export async function packContractPackage(): Promise<void> {
  try {
    packagePackingStartedMessage();

    const packageDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'package');
    const packageJsonPath = path.join(packageDir, 'package.json');

    // Verify package directory exists
    const packageDirExists = await fs.pathExists(packageDir);
    if (!packageDirExists) {
      packageDirectoryNotFoundMessage();
      process.exit(1);
    }

    // Verify package.json exists
    const packageJsonExists = await fs.pathExists(packageJsonPath);
    if (!packageJsonExists) {
      packageJsonNotFoundMessage();
      process.exit(1);
    }

    // Run npm pack from the package directory
    const executed = await executeCommand('npm', ['pack'], packageDir);
    if (!executed) {
      process.exit(1);
    }

    // Find the created .tgz file
    const files = await fs.readdir(packageDir);
    const tgzFile = files.find((f) => f.endsWith('.tgz'));

    if (tgzFile) {
      const tgzPath = path.join(packageDir, tgzFile);
      packagePackedMessage(tgzFile, tgzPath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePackingMessage(errorMessage);
    process.exit(1);
  }
}
