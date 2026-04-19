/** Persisted hash snapshot used to detect package content changes. */
export interface ContractState {
  hash: string;
}

/** Supported semantic version bump modes. */
export type VersionBumpType = 'patch' | 'minor' | 'major';
