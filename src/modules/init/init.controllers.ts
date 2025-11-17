import path from 'node:path';

import fs from 'fs-extra';
import prompts from 'prompts';

import { Contract } from '../../config/config.schemas.js';

const CONTRACT_DIR = path.join(process.cwd(), 'contract');

export async function ensureMissingSourceFiles(contracts: Contract[]): Promise<void> {
  // Ensure that all source files for the contracts exist, creating them if necessary.

  await Promise.all(
    contracts.map(async (contract) => {
      const filename = `contract.${contract.name}.source.ts`;
      const destination = path.join(CONTRACT_DIR, 'source', filename);

      const comment =
        `// This file is pre-generated for contract: ${contract.name}\n` +
        (contract.emit ? '// !! Never re-export from index.ts — use direct file exports.\n' : '');

      if (!(await fs.pathExists(destination))) {
        await fs.writeFile(destination, comment);
        console.log(`✅ Created source file: ${filename}`);
      }
    })
  );
}

async function askForRewriteDirectory(): Promise<boolean> {
  // Prompt the user to confirm if they want to rewrite the config file with default values.

  const response = await prompts({
    type: 'confirm',
    name: 'rewrite',
    message: 'The contract directory already exists. Do you want to rewrite it?',
    initial: true,
  });

  return response.rewrite;
}

export async function ensureContractDirectory(): Promise<void> {
  // Rewrite the contract directory by removing it and creating a new one.

  if (await fs.pathExists(CONTRACT_DIR)) {
    if (await askForRewriteDirectory()) {
      await fs.remove(CONTRACT_DIR);
      await fs.ensureDir(CONTRACT_DIR);
    } else return console.log('❌ Contract directory already exists, aborting initialization.');
  }

  await fs.ensureDir(CONTRACT_DIR);

  console.log('📂 Contract directory ensured.');
}

export async function createContractFolders(): Promise<void> {
  // Initialize the contract directory structure with necessary subdirectories.

  await fs.ensureDir(path.join(CONTRACT_DIR, 'source'));
  await fs.ensureDir(path.join(CONTRACT_DIR, 'export'));
  await fs.ensureDir(path.join(CONTRACT_DIR, 'synced'));

  console.log('📂 Contract folders created.');
}
