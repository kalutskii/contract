// Facade for versioning module.
// Keep this file as the stable import surface for other modules.

export type { ContractState, VersionBumpType } from './versioning.types';
export { computePackageHash } from './versioning.hash';
export { getContractState, writeContractState } from './versioning.state';
export { bumpVersion } from './versioning.semver';
export { shouldBumpVersion } from './versioning.decision';
