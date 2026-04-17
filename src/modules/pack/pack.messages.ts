import { log } from '@clack/prompts';
import { dim, green } from 'kleur/colors';

/** Logs package packing start. */
export const packagePackingStartedMessage = (): void => log.info(`Packing contract package...`);
/** Logs successful package archive creation. */
export const packagePackedMessage = (filename: string, filepath: string): void =>
  log.success(`Package packed successfully: ${green(filename)} (${dim(filepath)})`);
/** Logs that prepared package directory is missing. */
export const packageDirectoryNotFoundMessage = (): void =>
  log.error(`Contract package directory not found. Run ${green('contract prepare:package')} first.`);
/** Logs that package metadata file is missing. */
export const packageJsonNotFoundMessage = (): void =>
  log.error(`Package metadata not found. Run ${green('contract prepare:package')} first.`);
/** Logs fatal pack command failure details. */
export const fatalErrorWhilePackingMessage = (error: string): void => log.error(`Fatal error while packing package: ${error}`);
