import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Logs when initialization is cancelled by the user. */
export const initializationCancelledMessage = (): void => log.info('Initialization cancelled by user.');
/** Logs successful project initialization instructions. */
export const initializationCompletedMessage = (): void =>
  log.success(`Initialized. Edit ${green('contract.config.ts')} and run ${green('contract update:environment')}.`);

/** Logs successful environment update instructions. */
export const environmentUpdateCompletedMessage = (): void =>
  log.success(`Environment synced. Define types in manifests, then run ${green('contract build')}.`);
