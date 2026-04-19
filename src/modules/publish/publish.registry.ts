import { executeCommandWithResult } from '@/utilities/execution.utilities';

/** Returns true when the exact package version is already published on npm. */
export async function versionExistsOnNpm(packageName: string, version: string): Promise<boolean> {
  const checkResult = await executeCommandWithResult('npm', ['view', `${packageName}@${version}`]);
  return checkResult.success;
}

/** Throws if target version already exists on npm registry. */
export async function assertVersionAvailableOnNpm(packageName: string, version: string): Promise<void> {
  const exists = await versionExistsOnNpm(packageName, version);

  if (exists) {
    throw new Error(
      `Version ${version} already exists on npm. Cannot publish duplicate version.\n` +
        `Run "contract prepare:package --bump patch" to bump the version, then try publishing again.`
    );
  }
}
