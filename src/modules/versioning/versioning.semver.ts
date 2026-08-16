import type { VersionBumpType } from './versioning.types';

/** Bumps semantic version according to selected mode. */
export function bumpVersion(currentVersion: string, bumpType: VersionBumpType): string {
  const parts = currentVersion.split('.');
  const [major, minor, patch] = [
    parseInt(parts[0] ?? '0', 10),
    parseInt(parts[1] ?? '0', 10),
    parseInt(parts[2] ?? '0', 10),
  ];

  const bumpedVersions = {
    major: `${major + 1}.0.0`,
    minor: `${major}.${minor + 1}.0`,
    patch: `${major}.${minor}.${patch + 1}`,
  } satisfies Record<VersionBumpType, string>;

  return bumpedVersions[bumpType];
}
