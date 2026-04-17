import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Logs start of npm publish flow. */
export const packagePublishingStartedMessage = (): void => log.info(`Publishing contract package to npm...`);
/** Logs successful npm publish for package and version. */
export const packagePublishedMessage = (packageName: string, version: string): void =>
  log.success(`Package ${green(packageName)} v${version} published successfully.`);
/** Logs that prepared package directory is missing. */
export const packageDirectoryNotFoundMessage = (): void =>
  log.error(`Contract package directory not found. Run ${green('contract prepare:package')} first.`);
/** Logs that package metadata file is missing. */
export const packageJsonNotFoundMessage = (): void =>
  log.error(`Package metadata not found. Run ${green('contract prepare:package')} first.`);
/** Logs start of prepare step for publish --prepare flow. */
export const packagePreparationStartedMessage = (): void => log.info(`Preparing package before publishing...`);
/** Logs missing npm auth token guidance. */
export const npmTokenMissingMessage = (): void => log.error(`No npm token provided. Set config.npm.token or NPM_TOKEN env variable.`);
/** Logs which token source is used for npm auth. */
export const npmTokenSourceMessage = (source: string): void => log.success(`Using npm token from ${green(source)}.`);
/** Logs package/version being published. */
export const publishingPackageMessage = (packageName: string, version: string): void =>
  log.success(`Publishing ${green(`${packageName}@${version}`)}.`);
/** Logs when version was bumped due to npm version collision. */
export const versionBumpedDueToNpmCollisionMessage = (oldVersion: string, newVersion: string): void =>
  log.success(`Version already exists on npm. Auto-bumped from ${green(oldVersion)} to ${green(newVersion)}.`);
/** Logs fatal publish command failure details. */
export const fatalErrorWhilePublishingMessage = (error: string): void => log.error(`Fatal error while publishing package: ${error}`);
