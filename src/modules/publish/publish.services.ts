import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import type { Config } from '@/environment/environment.schemas';
import { getConfig, handleEnvironment } from '@/environment/environment.services';
import { executeCommandWithResult } from '@/utilities/exec.utilities';

import { prepareContractPackage } from '../prepare/prepare.services';
import {
  fatalErrorWhilePublishingMessage,
  npmTokenMissingMessage,
  npmTokenSourceMessage,
  packageDirectoryNotFoundMessage,
  packageJsonNotFoundMessage,
  packagePreparationStartedMessage,
  packagePublishedMessage,
  packagePublishingStartedMessage,
  publishingPackageMessage,
  versionBumpedDueToNpmCollisionMessage,
} from './publish.messages';

function resolveNpmToken(config: Awaited<ReturnType<typeof getConfig>>): { source: string; token: string } | null {
  if (config.npm?.token) return { source: 'config', token: config.npm.token };
  if (process.env.NPM_TOKEN) return { source: 'NPM_TOKEN', token: process.env.NPM_TOKEN };
  if (process.env.NODE_AUTH_TOKEN) return { source: 'NODE_AUTH_TOKEN', token: process.env.NODE_AUTH_TOKEN };

  return null;
}

async function writeNpmRc(packageDir: string, token: string): Promise<void> {
  const npmrcPath = path.join(packageDir, '.npmrc');
  await fs.writeFile(npmrcPath, `//registry.npmjs.org/:_authToken=${token}\n`);
}

function getPublishFailureMessage(output: string): string {
  const normalizedOutput = output.toLowerCase();

  if (
    normalizedOutput.includes('eneedauth') ||
    normalizedOutput.includes('e401') ||
    normalizedOutput.includes('403') ||
    normalizedOutput.includes('auth')
  ) {
    return `NPM publish failed due to authentication or permission issues. Verify the token and package access settings.\n${output}`;
  }

  if (normalizedOutput.includes('registry')) {
    return `NPM publish failed due to registry configuration. Verify the package is being published to npmjs.org.\n${output}`;
  }

  return `NPM publish failed.\n${output}`;
}

async function versionExistsOnNpm(packageName: string, version: string): Promise<boolean> {
  // Checks if a specific version exists on npm registry.

  const checkResult = await executeCommandWithResult('npm', ['view', `${packageName}@${version}`]);

  return checkResult.success;
}

async function resolveVersionCollision(packageName: string, version: string): Promise<void> {
  // Checks if target version already exists on npm.
  // If it does, this is a fatal error - the user must bump the version manually.

  const exists = await versionExistsOnNpm(packageName, version);

  if (exists) {
    throw new Error(
      `Version ${version} already exists on npm. Cannot publish duplicate version.\n` +
        `Run "contract prepare:package --bump patch" to bump the version, then try publishing again.`
    );
  }
}

export async function publishContractPackage(options: { access?: string; prepare?: boolean } = {}): Promise<void> {
  // Publishes the prepared contract package to npm.
  // Optional --prepare flag will prepare the package first.
  // Public access is always used to support scoped public packages.

  try {
    packagePublishingStartedMessage();

    const config = await getConfig();

    // Optionally prepare package first
    if (options.prepare) {
      packagePreparationStartedMessage();
      await handleEnvironment(config);
      await prepareContractPackage(config);
    }

    const packageDir = path.resolve(CONTRACT_DIRECTORY_NAME, 'package');
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

    // Read package.json to get name
    const packageJson = await fs.readJSON(packageJsonPath);
    const packageName = packageJson.name as string;

    // Use config version (source of truth, updated by prepare if needed)
    const packageVersion = config.package.version;

    // Verify version doesn't already exist on npm
    await resolveVersionCollision(packageName, packageVersion);

    // Ensure package.json has the correct version from config
    if (packageJson.version !== packageVersion) {
      packageJson.version = packageVersion;
      await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }

    const npmToken = resolveNpmToken(config);
    if (!npmToken) {
      npmTokenMissingMessage();
      process.exit(1);
    }

    npmTokenSourceMessage(npmToken.source);
    publishingPackageMessage(packageName, packageVersion);
    await writeNpmRc(packageDir, npmToken.token);

    if (options.access && options.access !== 'public') {
      throw new Error('Only --access public is supported for contract publish:package.');
    }

    const publishResult = await executeCommandWithResult('npm', ['publish', '--access', 'public'], packageDir);

    // Only fail on actual error (non-zero exit code)
    // Note: npm notice messages go to stderr but are informational, not errors
    if (!publishResult.success) {
      const errorOutput = publishResult.stderr || publishResult.stdout || publishResult.errorMessage || 'Unknown error';
      throw new Error(getPublishFailureMessage(errorOutput));
    }

    packagePublishedMessage(packageName, packageVersion);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhilePublishingMessage(errorMessage);
    process.exit(1);
  }
}
