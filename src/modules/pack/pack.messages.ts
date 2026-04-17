import { log } from '@clack/prompts';
import { dim, green } from 'kleur/colors';

export const packagePackingStartedMessage = () => log.info(`Packing contract package...`);
export const packagePackedMessage = (filename: string, filepath: string) =>
  log.success(`Package packed successfully: ${green(filename)} (${dim(filepath)})`);
export const packageDirectoryNotFoundMessage = () =>
  log.error(`Contract package directory not found. Run ${green('contract prepare:package')} first.`);
export const packageJsonNotFoundMessage = () => log.error(`Package metadata not found. Run ${green('contract prepare:package')} first.`);
export const fatalErrorWhilePackingMessage = (error: string) => log.error(`Fatal error while packing package: ${error}`);
