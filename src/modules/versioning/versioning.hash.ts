import fs from 'fs-extra';

import { PUBLISHABLE_FILES } from './versioning.constants';

import crypto from 'crypto';
import path from 'path';

/** Adds contract declaration/stub files to the baseline file list. */
function addContractFiles(contracts: string[]): string[] {
  return [...PUBLISHABLE_FILES, ...contracts.flatMap((contract) => [`${contract}.d.ts`, `${contract}.js`])];
}

/** Computes a deterministic SHA-256 hash for package file contents. */
export async function computePackageHash(packageDir: string, contracts: string[]): Promise<string> {
  const hash = crypto.createHash('sha256');
  const filesToHash = addContractFiles(contracts);

  for (const filename of filesToHash.sort()) {
    const filePath = path.join(packageDir, filename);

    try {
      let content = await fs.readFile(filePath, 'utf-8');

      // Keep version-only edits from affecting content hash.
      if (filename === 'package.json') {
        const json = JSON.parse(content) as Record<string, unknown>;
        delete json.version;
        content = JSON.stringify(json, null, 2);
      }

      content = content.replace(/\r\n/g, '\n').trim();
      hash.update(filename + ':' + content);
    } catch (_error) {
      // Missing file still contributes stable input to the hash.
      hash.update(filename + ':');
    }
  }

  return hash.digest('hex');
}
