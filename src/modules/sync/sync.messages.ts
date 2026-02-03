import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

export const syncCommandErrors = {
  FAILED_TO_FETCH_CONFIG: (url: string) =>
    `Failed to fetch external service config from ${url}, ensure you added ${green('contractMiddleware')} to your service. It should be accessible at the ${green('/contract/... endpoint.')}`,
  INVALID_CONFIG_FORMAT: (url: string, details: string) => `Invalid config format received from ${url}, details: ${details}`,
  FAILED_TO_FETCH_CONTRACT: (contractName: string, url: string) =>
    `Failed to fetch contract ${contractName} from ${url}, ensure the contract exists and is accessible.`,
  CONTRACT_FILE_DISPOSITION_MISSING: (contractName: string, url: string) =>
    `Missing Content-Disposition header for contract ${contractName} from ${url}, unable to determine filename.`,
};

export const contractFileDownloadCompletedMessage = (serviceName: string, contractName: string, filePath: string) =>
  log.success(`Contract ${green(contractName)} from service ${green(serviceName)} downloaded successfully to ${green(filePath)}`);

export const externalServicesSynchronizationCompletedMessage = (servicesTotal: number) =>
  log.success(`All ${green(`(${servicesTotal}/${servicesTotal})`)} external services contracts have been synchronized successfully.`);
