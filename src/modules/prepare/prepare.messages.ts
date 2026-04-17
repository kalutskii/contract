import { log } from '@clack/prompts';
import { dim, green } from 'kleur/colors';

/** Logs start of package preparation for a given app. */
export const packagePreparationStartedMessage = (app: string): void => log.info(`Preparing package ${green(app)} for distribution...`);
/** Logs where package artifacts were created. */
export const packageFilesCreatedMessage = (filePath: string): void => log.success(`Package files created successfully at ${dim(filePath)}`);
/** Logs package.json generation for package name. */
export const packageJsonGeneratedMessage = (packageName: string): void =>
  log.success(`Generated ${dim('package.json')} for ${green(packageName)}`);
/** Logs successful completion of package preparation. */
export const packagePreparationCompletedMessage = (): void => log.success(`Package preparation completed. Ready for publishing.`);
/** Warns that a contract declaration is missing in generated artifacts. */
export const missingGeneratedContractsMessage = (contractName: string): void =>
  log.warn(
    `Contract ${green(contractName)} was not found in generated files. Run ${green('contract build')} first to generate contract declarations.`
  );
/** Logs automatic version bump details and reason. */
export const versionBumpedMessage = (oldVersion: string, newVersion: string, reason: string): void =>
  log.success(`Version bumped from ${green(oldVersion)} to ${green(newVersion)} (${reason}).`);
/** Logs manual version bump done via CLI option. */
export const versionForcedMessage = (newVersion: string, bumpType: string): void =>
  log.success(`Version forced to ${green(newVersion)} via --bump ${bumpType}.`);
/** Logs unchanged version when package content hash is unchanged. */
export const versionNoChangeMessage = (version: string): void => log.info(`Content unchanged. Version remains ${green(version)}.`);
/** Logs fatal prepare command failure details. */
export const fatalErrorWhilePreparingPackageMessage = (error: string): void => log.error(`Fatal error while preparing package: ${error}`);
