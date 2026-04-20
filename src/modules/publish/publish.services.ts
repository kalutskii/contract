import { spinner } from '@clack/prompts';

import { getConfig, handleEnvironment } from '@/environment/environment.services';
import { prepareContractPackage } from '@/modules/prepare/prepare.services';
import { executeCommandWithResult } from '@/utilities/execution.utilities';

import { removeNpmRc, resolveNpmToken, writeNpmRc } from './publish.auth';
import { getPublishFailureMessage } from './publish.errors';
import {
  fatalErrorWhilePublishingMessage,
  npmTokenMissingMessage,
  packageDirectoryNotFoundMessage,
  packageJsonNotFoundMessage,
  packagePreparationStartedMessage,
  publishSpinnerCompletedMessage,
  publishSpinnerFailedMessage,
  publishSpinnerStartedMessage,
} from './publish.messages';
import { assertVersionAvailableOnNpm } from './publish.registry';
import {
  ensurePublishPathsExist,
  readPackageJsonInfo,
  resolvePublishPaths,
  syncPackageJsonVersion,
} from './publish.validation';

/** Publishes prepared contract package artifacts to npm with auth and validation checks. */
export async function publishContractPackage(options: { access?: string; prepare?: boolean } = {}): Promise<void> {
  let packageDirForCleanup: string | null = null;
  let publishSpinner: ReturnType<typeof spinner> | null = null;

  try {
    // Step 1: Load config.
    let config = await getConfig();

    // Step 2: Optionally prepare package artifacts before publish.
    if (options.prepare) {
      packagePreparationStartedMessage();
      await handleEnvironment(config);
      await prepareContractPackage(config);

      // Re-read config because prepare can bump and persist package.version.
      config = await getConfig();
    }

    // Step 3: Resolve and validate package paths/metadata.
    const paths = resolvePublishPaths();
    packageDirForCleanup = paths.packageDir;

    try {
      await ensurePublishPathsExist(paths);
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

    const packageJson = await readPackageJsonInfo(paths.packageJsonPath);
    const packageName = packageJson.name;

    // Step 4: Enforce config version as source-of-truth for publish.
    const packageVersion = config.package.version;
    await assertVersionAvailableOnNpm(packageName, packageVersion);
    await syncPackageJsonVersion(paths.packageJsonPath, packageJson, packageVersion);

    // Step 5: Resolve npm auth and write local .npmrc for publish.
    const npmToken = resolveNpmToken(config);
    if (!npmToken) {
      npmTokenMissingMessage();
      process.exit(1);
    }

    // Step 6: Show compact publish progress and write auth config.
    publishSpinner = spinner();
    publishSpinner.start(publishSpinnerStartedMessage(packageName, packageVersion));

    await writeNpmRc(paths.packageDir, npmToken.token);

    // Step 6: Validate CLI options and execute npm publish.
    if (options.access && options.access !== 'public') {
      throw new Error('Only --access public is supported for contract publish:package.');
    }

    const publishResult = await executeCommandWithResult('npm', ['publish', '--access', 'public'], paths.packageDir);

    // Step 7: Treat only non-zero exit as failure; npm notice in stderr is allowed.
    if (!publishResult.success) {
      const errorOutput = publishResult.stderr || publishResult.stdout || publishResult.errorMessage || 'Unknown error';
      throw new Error(getPublishFailureMessage(errorOutput));
    }

    // Step 8: Report success in the same progress line.
    publishSpinner.stop(publishSpinnerCompletedMessage(packageName, packageVersion));
  } catch (error) {
    if (publishSpinner) {
      publishSpinner.stop(publishSpinnerFailedMessage());
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePublishingMessage(errorMessage);
    process.exit(1);
  } finally {
    if (packageDirForCleanup) {
      await removeNpmRc(packageDirForCleanup);
    }
  }
}
