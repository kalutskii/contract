import { readConfigFile } from '../../config/config.controllers.js';
import { Config, Contract } from '../../config/config.schemas.js';
import { bundleDeclarationContract, bundleRuntimeContract } from './build.controllers.js';

async function buildContract(config: Config, contract: Contract): Promise<void> {
  // This function will handle the building of contracts.
  // Currently, it just reads the config file and logs the contracts.

  console.log('🔗 Building contract:', contract.name);

  if (contract.emit) {
    await bundleRuntimeContract(config, contract);
  } else await bundleDeclarationContract(config, contract);
}

export async function runCommand() {
  const config = await readConfigFile();

  await Promise.all(
    config.contracts.map(async (contract) => {
      await buildContract(config, contract);
    })
  );
}
