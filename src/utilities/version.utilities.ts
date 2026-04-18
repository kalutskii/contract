import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

/** Persisted hash snapshot used to detect package content changes. */
export interface ContractState {
  hash: string;
}

// Publishable files that are included in the package hash and npm tarball.
const PUBLISHABLE_FILES = ['index.d.ts', 'index.js'];

/** Utility to determine if a value is a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Converts a raw value to a ContractState if it has the expected shape. */
function toContractState(value: unknown): ContractState | null {
  if (!isRecord(value) || typeof value.hash !== 'string') {
    return null;
  }

  return { hash: value.hash };
}

/** Adds contract files to the list of publishable files for hashing and packaging. */
function addContractFiles(contracts: string[]): string[] {
  return [...PUBLISHABLE_FILES, ...contracts.flatMap((c) => [`${c}.d.ts`, `${c}.js`])];
}

/** Computes a deterministic hash of package files excluding package version. */
export async function computePackageHash(packageDir: string, contracts: string[]): Promise<string> {
  const hash = crypto.createHash('sha256');
  const filesToHash = addContractFiles(contracts);

  for (const filename of filesToHash.sort()) {
    const filePath = path.join(packageDir, filename);

    try {
      let content = await fs.readFile(filePath, 'utf-8');

      if (filename === 'package.json') {
        const json = JSON.parse(content) as Record<string, unknown>;
        delete json.version;
        content = JSON.stringify(json, null, 2);
      }

      content = content.replace(/\r\n/g, '\n').trim();
      hash.update(filename + ':' + content);
    } catch (_error) {
      hash.update(filename + ':');
    }
  }

  return hash.digest('hex');
}

/** Reads the saved contract package state from the workspace state file. */
export async function getContractState(packageDir: string): Promise<ContractState | null> {
  const stateDir = path.dirname(packageDir);
  const statePath = path.join(stateDir, '.contract-package-state.json');

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

/** Persists contract package hash state for the next prepare run. */
export async function writeContractState(packageDir: string, state: ContractState): Promise<void> {
  const stateDir = path.dirname(packageDir);
  const statePath = path.join(stateDir, '.contract-package-state.json');
  await fs.writeJSON(statePath, state, { spaces: 2 });
}

/** Bumps a semantic version according to the selected bump type. */
export function bumpVersion(currentVersion: string, bumpType: 'patch' | 'minor' | 'major'): string {
  const parts = currentVersion.split('.');
  const [major, minor, patch] = [
    parseInt(parts[0] ?? '0', 10),
    parseInt(parts[1] ?? '0', 10),
    parseInt(parts[2] ?? '0', 10),
  ];

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

/** Returns whether package content changed since the previous saved state. */
export async function shouldBumpVersion(packageDir: string, contracts: string[]): Promise<boolean> {
  const currentHash = await computePackageHash(packageDir, contracts);
  const previousState = await getContractState(packageDir);

  if (!previousState) return false;

  return previousState.hash !== currentHash;
}
