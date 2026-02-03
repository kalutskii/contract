import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

export const initializationCancelledMessage = () => log.info('Initialization cancelled by user.');
export const initializationCompletedMessage = () =>
  log.success(
    `Initialization complete, default configuration file created and environment set up.
Customize the configuration file ${green('contract.config.ts')}: enter app's name, define contracts to use, etc.
Then run ${green('contract update:environment')} to create manifest files and synchronize the environment.`
  );

export const environmentUpdateCompletedMessage = () =>
  log.success(
    `Manifest pulling and environment synchronization complete.
You can now export your contract's types in relevant manifest files.
Then generate the type definitions by running ${green('contract build')}.`
  );
