import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';

export interface ContractState {
  hash: string;
}

const PUBLISHABLE_FILES = ['index.d.ts', 'index.js'];

function addContractFiles(contracts: string[]): string[] {
  return [...PUBLISHABLE_FILES, ...contracts.flatMap((c) => [`${c}.d.ts`, `${c}.js`])];
}

export async function computePackageHash(packageDir: string, contracts: string[]): Promise<string> {
  // Computes a deterministic SHA-256 hash of publishable package files.
  // Excludes version field from package.json to allow version-only changes.

  const hash = crypto.createHash('sha256');
  const filesToHash = addContractFiles(contracts);

  // Process files in sorted order for determinism
  for (const filename of filesToHash.sort()) {
    const filePath = path.join(packageDir, filename);

    try {
      let content = await fs.readFile(filePath, 'utf-8');

      // For package.json, remove version field before hashing
      if (filename === 'package.json') {
        const json = JSON.parse(content);
        delete json.version;
        content = JSON.stringify(json, null, 2);
      }

      // Normalize line endings and trim for consistent hashing
      content = content.replace(/\r\n/g, '\n').trim();
      hash.update(filename + ':' + content);
    } catch (error) {
      // If file doesn't exist yet, hash an empty string for it
      hash.update(filename + ':');
    }
  }

  return hash.digest('hex');
}

export async function getContractState(packageDir: string): Promise<ContractState | null> {
  // Reads the stored contract state (previous hash).
  // State is stored at contract/.contract-package-state.json (outside package directory)
  // to survive package directory cleanup during prepare.

  const stateDir = path.dirname(packageDir); // contract/
  const statePath = path.join(stateDir, '.contract-package-state.json');

  try {
    if (await fs.pathExists(statePath)) {
      return await fs.readJSON(statePath);
    }
  } catch {
    // If state file is invalid, treat as missing
  }

  return null;
}

export async function writeContractState(packageDir: string, state: ContractState): Promise<void> {
  // Writes the contract state (current hash).
  // State is stored at contract/.contract-package-state.json (outside package directory)
  // to survive package directory cleanup during prepare.

  const stateDir = path.dirname(packageDir); // contract/
  const statePath = path.join(stateDir, '.contract-package-state.json');
  await fs.writeJSON(statePath, state, { spaces: 2 });
}

export function bumpVersion(currentVersion: string, bumpType: 'patch' | 'minor' | 'major'): string {
  // Bumps the semantic version based on the bump type.

  const parts = currentVersion.split('.');
  const [major, minor, patch] = [parseInt(parts[0] ?? '0', 10), parseInt(parts[1] ?? '0', 10), parseInt(parts[2] ?? '0', 10)];

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

export async function shouldBumpVersion(packageDir: string, contracts: string[]): Promise<boolean> {
  // Determines if version should be bumped based on content hash.

  const currentHash = await computePackageHash(packageDir, contracts);
  const previousState = await getContractState(packageDir);

  if (!previousState) {
    // First time or state lost → no bump needed, just store hash
    return false;
  }

  return previousState.hash !== currentHash;
}
