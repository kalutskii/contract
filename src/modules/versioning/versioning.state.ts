import fs from 'fs-extra';
import path from 'path';

import { isRecord } from '@/utilities/type.utilities';

import { CONTRACT_PACKAGE_STATE_FILE } from './versioning.constants';
import type { ContractState } from './versioning.types';

/** Convert parsed JSON to a valid ContractState when possible. */
function toContractState(value: unknown): ContractState | null {
  if (!isRecord(value) || typeof value.hash !== 'string') {
    return null;
  }

  return { hash: value.hash };
}

/** Resolves the persistent state file path for a package directory. */
function getStatePath(packageDir: string): string {
  return path.join(path.dirname(packageDir), CONTRACT_PACKAGE_STATE_FILE);
}

/** Reads the saved hash state from disk. */
export async function getContractState(packageDir: string): Promise<ContractState | null> {
  const statePath = getStatePath(packageDir);

  try {
    if (await fs.pathExists(statePath)) {
      const rawState = (await fs.readJSON(statePath)) as unknown;
      return toContractState(rawState);
    }
  } catch {
    return null;
  }

  return null;
}

/** Writes the latest hash state to disk. */
export async function writeContractState(packageDir: string, state: ContractState): Promise<void> {
  const statePath = getStatePath(packageDir);
  await fs.writeJSON(statePath, state, { spaces: 2 });
}
