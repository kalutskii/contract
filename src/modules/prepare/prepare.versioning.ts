import { updateConfigVersion } from '@/environment/environment.services';
import { bumpVersion, computePackageHash, writeContractState } from '@/modules/versioning/versioning.services';

import { updatePackageVersion } from './prepare.artifacts';
import { versionBumpedMessage, versionForcedMessage, versionNoChangeMessage } from './prepare.messages';
import type { PrepareVersioningContext } from './prepare.types';

/** Applies manual/automatic version rules and persists updated hash state. */
export async function applyPrepareVersioning(context: PrepareVersioningContext): Promise<void> {
  const { config, packageDir, packageJsonPath, contracts, baseVersion, previousHash, options } = context;

  // Branch A: explicit manual bump from CLI flag.
  if (options.bump) {
    const bumpedVersion = bumpVersion(baseVersion, options.bump);
    // Keep config and generated package.json in sync.
    await updateConfigVersion(bumpedVersion);
    await updatePackageVersion(packageJsonPath, bumpedVersion);
    versionForcedMessage(bumpedVersion, options.bump);
    return;
  }

  // Branch B: user disabled auto-bump for this run.
  if (options.noBump) {
    return;
  }

  // Branch C: automatic bump based on package content hash.
  const currentHash = await computePackageHash(packageDir, contracts);

  if (previousHash && previousHash !== currentHash) {
    // Content changed compared to previous run -> patch bump.
    const bumpedVersion = bumpVersion(baseVersion, 'patch');
    await updateConfigVersion(bumpedVersion);
    await updatePackageVersion(packageJsonPath, bumpedVersion);
    versionBumpedMessage(config.package.version, bumpedVersion, 'content changed');
  } else {
    // First run or unchanged content -> keep current version.
    versionNoChangeMessage(baseVersion);
  }

  // Persist current hash so next run can compare against it.
  await writeContractState(packageDir, { hash: currentHash });
}
