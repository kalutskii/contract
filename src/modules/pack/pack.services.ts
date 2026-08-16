import { spinner } from '@clack/prompts';

import { executeCommand } from '@/utilities/execution.utilities';

import {
  fatalErrorWhilePackingMessage,
  packSpinnerCompletedFallbackMessage,
  packSpinnerCompletedMessage,
  packSpinnerFailedMessage,
  packSpinnerStartedMessage,
  packageDirectoryNotFoundMessage,
  packageJsonNotFoundMessage,
} from './pack.messages';
import { ensurePackPathsExist, findPackedArchive, resolvePackPaths } from './pack.validation';

import path from 'path';

/** Packs the prepared contract package directory into an npm tarball. */
export async function packContractPackage(): Promise<void> {
  let packSpinner: ReturnType<typeof spinner> | null = null;

  try {
    // Step 1: Start compact pack progress flow.
    packSpinner = spinner();
    packSpinner.start(packSpinnerStartedMessage());

    // Step 2: Resolve and validate prepared package paths.
    const paths = resolvePackPaths();
    try {
      await ensurePackPathsExist(paths);
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      if (code === 'PACKAGE_DIR_NOT_FOUND') {
        packageDirectoryNotFoundMessage();
        process.exit(1);
      }

      if (code === 'PACKAGE_JSON_NOT_FOUND') {
        packageJsonNotFoundMessage();
        process.exit(1);
      }

      throw error;
    }

    // Step 3: Run npm pack inside prepared package directory.
    const executed = await executeCommand('npm', ['pack'], paths.packageDir);
    if (!executed) {
      process.exit(1);
    }

    // Step 4: Detect produced archive and report success.
    const tgzFile = await findPackedArchive(paths.packageDir);

    if (tgzFile) {
      const tgzPath = path.join(paths.packageDir, tgzFile);
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
