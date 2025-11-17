import { readConfigFile } from '../../config/config.controllers.js';
import { Config } from '../../config/config.schemas.js';
import { fetchAndSaveExternalContract, fetchExternalConfig } from './sync.controllers.js';

async function synchronizeExternalContracts(externalSources: string[]): Promise<void> {
  // This function will handle the synchronization of external contracts.

  await Promise.all(
    externalSources.map(async (source) => {
      console.log(`🔗 Synchronizing external contracts from: ${source}`);
      const externalConfig: Config = await fetchExternalConfig(source);

      for (const contract of externalConfig.contracts) {
        fetchAndSaveExternalContract(contract, source);
      }
    })
  ).then(() => {
    console.log('✅ All external contracts synchronized successfully.');
  });
}

export async function runCommand(): Promise<void> {
  // Entry point for initializing the contract structure or only ensuring source files.

  const config = await readConfigFile();

  await synchronizeExternalContracts(config.externalSources);
}
