import path from 'node:path';

import fs from 'fs-extra';

import { Config, Contract } from '../../config/config.schemas.js';

const CONTRACT_DIR = path.join(process.cwd(), 'contract');

export async function fetchAndSaveExternalContract(contract: Contract, source: string): Promise<void> {
  // Fetches an external contract from a given source and saves it to the local contract directory.
  // Assumes the source URL provides a contract file at the endpoint 'contract?name={contract.name}'.

  const response = await fetch(`${source}/contract?name=${contract.name}&emit=${contract.emit ?? false}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch contract ${contract.name} from ${source}: ${response.status}`);
  }

  const content = await response.text();
  const disposition = response.headers.get('Content-Disposition');
  const fileName = disposition?.match(/filename="(.+?)"/)?.[1];

  if (!fileName) {
    throw new Error(`Filename not found in Content-Disposition header from ${source}`);
  }

  const outputPath = path.join(CONTRACT_DIR, 'synced');
  const fullPath = path.join(outputPath, fileName);

  await fs.ensureDir(outputPath);
  await fs.writeFile(fullPath, content, 'utf-8');

  console.log(`🔗 Fetched and saved contract: ${contract.name} as ${fileName} from ${source}`);
}

export async function fetchExternalConfig(source: string): Promise<Config> {
  // Fetches the external configuration from a given source URL.
  // Assumes the source URL provides a JSON configuration at the endpoint 'contract/config'.

  const response = await fetch(`${source}/contract/config`);

  if (!response.ok) {
    throw new Error(`Failed to fetch external config from ${source}: ${response.status}`);
  }

  return await response.json();
}
