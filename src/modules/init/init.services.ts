import { initializePrompt } from '@/environment/environment.chat';
import {
  clearEnvironment,
  createDefaultConfigFile,
  getConfig,
  handleEnvironment,
} from '@/environment/environment.services';

import {
  environmentUpdateCompletedMessage,
  initializationCancelledMessage,
  initializationCompletedMessage,
} from './init.messages';

/** Runs interactive project initialization from scratch. */
export async function initializeContractProject(): Promise<void> {
  // 1) Ask user for confirmation before wiping and recreating contract environment.
  const shouldInitialize = await initializePrompt();
  if (!shouldInitialize) {
    initializationCancelledMessage();
    return;
  }

  // 2) Clear old environment, create default config, then recreate folders/files.
  await clearEnvironment();
  const config = await createDefaultConfigFile();
  await handleEnvironment(config);

  // 3) Report next steps for user.
  initializationCompletedMessage();
}

/** Synchronizes folders and manifests with the current config. */
export async function updateContractEnvironment(): Promise<void> {
  // 1) Load current config.
  const config = await getConfig();

  // 2) Reconcile environment folders and manifest files with config.
  await handleEnvironment(config);

  // 3) Report completion and next step.
  environmentUpdateCompletedMessage();
}
