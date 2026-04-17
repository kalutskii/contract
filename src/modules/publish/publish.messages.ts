import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

export const packagePublishingStartedMessage = () => log.info(`Publishing contract package to npm...`);
export const packagePublishedMessage = (packageName: string, version: string) =>
  log.success(`Package ${green(packageName)} v${version} published successfully.`);
export const packageDirectoryNotFoundMessage = () =>
  log.error(`Contract package directory not found. Run ${green('contract prepare:package')} first.`);
export const packageJsonNotFoundMessage = () => log.error(`Package metadata not found. Run ${green('contract prepare:package')} first.`);
export const packagePreparationStartedMessage = () => log.info(`Preparing package before publishing...`);
export const npmTokenMissingMessage = () => log.error(`No npm token provided. Set config.npm.token or NPM_TOKEN env variable.`);
export const npmTokenSourceMessage = (source: string) => log.success(`Using npm token from ${green(source)}.`);
export const publishingPackageMessage = (packageName: string, version: string) =>
  log.success(`Publishing ${green(`${packageName}@${version}`)}.`);
export const versionBumpedDueToNpmCollisionMessage = (oldVersion: string, newVersion: string) =>
  log.success(`Version already exists on npm. Auto-bumped from ${green(oldVersion)} to ${green(newVersion)}.`);
export const fatalErrorWhilePublishingMessage = (error: string) => log.error(`Fatal error while publishing package: ${error}`);
