import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Returns spinner text when package packing starts. */
export const packSpinnerStartedMessage = (): string => 'Packing contract package...';
/** Returns spinner text when package packing succeeds with archive details. */
export const packSpinnerCompletedMessage = (filename: string, filepath: string): string =>
  `Packed ${filename} (${filepath}).`;
/** Returns spinner text when package packing succeeds but archive name is unavailable. */
export const packSpinnerCompletedFallbackMessage = (): string => 'Packed package successfully.';
/** Returns spinner text when package packing fails. */
export const packSpinnerFailedMessage = (): string => 'Pack failed.';

/** Logs that prepared package directory is missing. */
export const packageDirectoryNotFoundMessage = (): void =>
  log.error(`Package dir missing. Run ${green('contract prepare:package')}.`);
/** Logs that package metadata file is missing. */
export const packageJsonNotFoundMessage = (): void =>
  log.error(`package.json missing. Run ${green('contract prepare:package')}.`);
/** Logs fatal pack command failure details. */
export const fatalErrorWhilePackingMessage = (error: string): void => log.error(`Pack failed: ${error}`);
