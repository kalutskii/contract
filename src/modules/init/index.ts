import { readConfigFile } from '../../config/config.controllers.js';
import type { Contract } from '../../config/config.schemas.js';
import { createContractFolders, ensureContractDirectory, ensureMissingSourceFiles } from './init.controllers.js';

async function initContractStructure({ contracts }: { contracts: Contract[] }): Promise<void> {
  // Ensure the contract directory is clean and set up the necessary folders and files,
  // including the configuration files and source files for the contracts.

  await ensureContractDirectory();
  await createContractFolders();
  await ensureMissingSourceFiles(contracts);

  console.log('✅ Contract structure initialized.');
}

export async function runCommand({ ensureSources = false }: { ensureSources?: boolean } = {}): Promise<void> {
  // Entry point for initializing the contract structure or only ensuring source files.

  const config = await readConfigFile();

  if (ensureSources) {
    return await ensureMissingSourceFiles(config.contracts);
  }

  await initContractStructure({ contracts: config.contracts });
}
