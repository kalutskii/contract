import fs from 'fs-extra';
import path from 'path';

import { CONTRACT_ENDPOINT_PREFIX } from '@/adapters/hono/hono.constants';
import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';
import { type Config, ConfigSchema } from '@/environment/environment.schemas';

import { contractFileDownloadCompletedMessage, externalServicesSynchronizationCompletedMessage, syncCommandErrors } from './sync.messages';

async function getExternalServiceConfig(url: string): Promise<Config> {
  // Fetches and validates the configuration from an external service.

  const configUrl = new URL(`${CONTRACT_ENDPOINT_PREFIX}/config`, url);

  const configResponse = await fetch(configUrl);
  if (!configResponse.ok) throw new Error(syncCommandErrors.FAILED_TO_FETCH_CONFIG(url));
  const configResponseData = await configResponse.json();

  const externalConfig = ConfigSchema.safeParse(configResponseData); // Should be validated against the Config schema
  if (!externalConfig.success) throw new Error(syncCommandErrors.INVALID_CONFIG_FORMAT(url, JSON.stringify(externalConfig.error.message)));
  return externalConfig.data;
}

async function downloadContract(contractName: string, serviceUrl: string, serviceName: string): Promise<void> {
  // Downloads the contract declaration from the external service.

  const contractUrl = new URL(`${CONTRACT_ENDPOINT_PREFIX}/get?name=${contractName}`, serviceUrl);
  const contractResponse = await fetch(contractUrl);
  if (!contractResponse.ok) throw new Error(syncCommandErrors.FAILED_TO_FETCH_CONTRACT(contractName, serviceUrl));

  // Extract filename from Content-Disposition header
  const contractDisposition = contractResponse.headers.get('Content-Disposition');
  const contractFilename = contractDisposition?.match(/filename="(.+?)"/)?.[1];
  if (!contractFilename) throw new Error(syncCommandErrors.CONTRACT_FILE_DISPOSITION_MISSING(contractName, serviceUrl));

  // Save the contract content to the designated directory
  const contractContent = await contractResponse.text();
  const outputDir = path.join(process.cwd(), CONTRACT_DIRECTORY_NAME, 'synchronized');
  const outputFilePath = path.join(outputDir, contractFilename);

  await fs.writeFile(outputFilePath, contractContent);
  contractFileDownloadCompletedMessage(serviceName, contractName, 'contract/synchronized/' + contractFilename);
}

export async function synchronizeExternalServicesContracts(config: Config): Promise<void> {
  // Synchronizes contracts from external services defined in the config.

  for (const service of config.externalServices) {
    // Fetch the external service configuration
    const externalConfig = await getExternalServiceConfig(service);

    for (const contract of externalConfig.contracts) {
      // Download each contract from the external service
      await downloadContract(contract, service, externalConfig.app);
    }
  }

  externalServicesSynchronizationCompletedMessage(config.externalServices.length);
}
