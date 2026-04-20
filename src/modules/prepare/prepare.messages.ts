import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Logs start of package preparation for a given app. */
export const packagePreparationStartedMessage = (app: string): void => log.info(`Preparing ${green(app)} package...`);
/** Logs successful completion of package preparation. */
export const packagePreparationCompletedMessage = (): void => log.success('Package ready.');
/** Warns that a contract declaration is missing in generated artifacts. */
export const missingGeneratedContractsMessage = (contractName: string): void =>
  log.warn(`Missing generated contract ${green(contractName)}. Run ${green('contract build')}.`);
/** Logs automatic version bump details and reason. */
export const versionBumpedMessage = (oldVersion: string, newVersion: string, reason: string): void =>
  log.success(`Version bumped from ${green(oldVersion)} to ${green(newVersion)} (${reason}).`);
/** Logs manual version bump done via CLI option. */
export const versionForcedMessage = (newVersion: string, bumpType: string): void =>
  log.success(`Version forced to ${green(newVersion)} via --bump ${bumpType}.`);
/** Logs unchanged version when package content hash is unchanged. */
export const versionNoChangeMessage = (version: string): void => log.info(`No changes. Version ${green(version)}.`);
/** Logs fatal prepare command failure details. */
export const fatalErrorWhilePreparingPackageMessage = (error: string): void => log.error(`Prepare failed: ${error}`);
