import { computePackageHash } from './versioning.hash';
import { getContractState } from './versioning.state';

/** Returns true when current package hash differs from saved previous hash. */
export async function shouldBumpVersion(packageDir: string, contracts: string[]): Promise<boolean> {
  const currentHash = await computePackageHash(packageDir, contracts);
  const previousState = await getContractState(packageDir);

  if (!previousState) return false;

  return previousState.hash !== currentHash;
}
