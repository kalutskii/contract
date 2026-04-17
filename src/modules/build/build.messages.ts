import { log } from '@clack/prompts';
import { dim, green } from 'kleur/colors';

/** Returns text shown when declaration bundling starts for a contract. */
export const bundlingStartedMessage = (contract: string): string => `Bundling contract declarations for ${green(contract)}`;
/** Returns text shown when declaration bundling is completed. */
export const bundlingCompletedMessage = (contract: string, outputPath: string): string =>
  `Contract declarations bundled successfully for ${green(contract)}, output available at: ${dim(outputPath)}`;
/** Logs completion of all contract declaration bundling tasks. */
export const contractsBuildCompletedMessage = (): void => log.success(`All contract declarations have been bundled successfully.`);
/** Logs a fatal bundling error for a specific contract. */
export const fatalErrorWhileBundlingMessage = (contract: string): void =>
  log.error(`Fatal error occurred while bundling contract declarations for ${contract}.`);
