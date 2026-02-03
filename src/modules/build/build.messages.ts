import { log } from '@clack/prompts';
import { dim, green } from 'kleur/colors';

export const bundlingStartedMessage = (contract: string) => `Bundling contract declarations for ${green(contract)}`;
export const bundlingCompletedMessage = (contract: string, outputPath: string) =>
  `Contract declarations bundled successfully for ${green(contract)}, output available at: ${dim(outputPath)}`;
export const contractsBuildCompletedMessage = () => log.success(`All contract declarations have been bundled successfully.`);
export const fatalErrorWhileBundlingMessage = (contract: string) =>
  log.error(`Fatal error occurred while bundling contract declarations for ${contract}.`);
