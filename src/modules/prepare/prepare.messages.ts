import { log } from '@clack/prompts';
import { dim, green } from 'kleur/colors';

export const packagePreparationStartedMessage = (app: string) => log.info(`Preparing package ${green(app)} for distribution...`);
export const packageFilesCreatedMessage = (filePath: string) => log.success(`Package files created successfully at ${dim(filePath)}`);
export const packageJsonGeneratedMessage = (packageName: string) =>
  log.success(`Generated ${dim('package.json')} for ${green(packageName)}`);
export const packagePreparationCompletedMessage = () => log.success(`Package preparation completed. Ready for publishing.`);
export const missingGeneratedContractsMessage = (contractName: string) =>
  log.warn(
    `Contract ${green(contractName)} was not found in generated files. Run ${green('contract build')} first to generate contract declarations.`
  );
export const versionBumpedMessage = (oldVersion: string, newVersion: string, reason: string) =>
  log.success(`Version bumped from ${green(oldVersion)} to ${green(newVersion)} (${reason}).`);
export const versionForcedMessage = (newVersion: string, bumpType: string) =>
  log.success(`Version forced to ${green(newVersion)} via --bump ${bumpType}.`);
export const versionNoChangeMessage = (version: string) => log.info(`Content unchanged. Version remains ${green(version)}.`);
export const fatalErrorWhilePreparingPackageMessage = (error: string) => log.error(`Fatal error while preparing package: ${error}`);
