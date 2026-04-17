import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Logs when initialization is cancelled by the user. */
export const initializationCancelledMessage = (): void => log.info('Initialization cancelled by user.');
/** Logs successful project initialization instructions. */
export const initializationCompletedMessage = (): void =>
  log.success(
    `Initialization complete, default configuration file created and environment set up.
Customize the configuration file ${green('contract.config.ts')}: enter app's name, define contracts to use, etc.
Then run ${green('contract update:environment')} to create manifest files and synchronize the environment.`
  );

/** Logs successful environment update instructions. */
export const environmentUpdateCompletedMessage = (): void =>
  log.success(
    `Manifest pulling and environment synchronization complete.
You can now export your contract's types in relevant manifest files.
Then generate the type definitions by running ${green('contract build')}.`
  );
