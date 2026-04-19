import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Returns spinner text when npm publish starts. */
export const publishSpinnerStartedMessage = (packageName: string, version: string): string =>
  `Publishing ${packageName}@${version} to npm...`;
/** Returns spinner text when npm publish succeeds. */
export const publishSpinnerCompletedMessage = (packageName: string, version: string): string =>
  `Published ${packageName}@${version}.`;
/** Returns spinner text when npm publish fails. */
export const publishSpinnerFailedMessage = (): string => 'Publish failed.';

/** Logs that prepared package directory is missing. */
export const packageDirectoryNotFoundMessage = (): void =>
  log.error(`Contract package directory not found. Run ${green('contract prepare:package')} first.`);
/** Logs that package metadata file is missing. */
export const packageJsonNotFoundMessage = (): void =>
  log.error(`Package metadata not found. Run ${green('contract prepare:package')} first.`);
/** Logs start of prepare step for publish --prepare flow. */
export const packagePreparationStartedMessage = (): void => log.info(`Preparing package before publishing...`);
/** Logs missing npm auth token guidance. */
export const npmTokenMissingMessage = (): void =>
  log.error(`No npm token provided. Set config.npm.token or NPM_TOKEN env variable.`);
/** Logs fatal publish command failure details. */
export const fatalErrorWhilePublishingMessage = (error: string): void =>
  log.error(`Fatal error while publishing package: ${error}`);
