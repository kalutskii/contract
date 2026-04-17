import { Command } from 'clipanion';

import { initializePrompt } from '@/environment/environment.chat';
import { clearEnvironment, createDefaultConfigFile, getConfig, handleEnvironment } from '@/environment/environment.services';

import { environmentUpdateCompletedMessage, initializationCancelledMessage, initializationCompletedMessage } from './init.messages';

/** CLI command that reinitializes contract configuration and environment. */
export class InitCommand extends Command {
  static override paths = [['init']];

  public async execute(): Promise<void> {
    const shouldInitialize = await initializePrompt();
    if (!shouldInitialize) return initializationCancelledMessage();

    await clearEnvironment();
    const config = await createDefaultConfigFile();
    await handleEnvironment(config);

    initializationCompletedMessage();
  }
}

/** CLI command that syncs environment folders and contract manifests. */
export class UpdateEnvironmentCommand extends Command {
  static override paths = [['update:environment']];

  public async execute(): Promise<void> {
    const config = await getConfig();
    await handleEnvironment(config);

    environmentUpdateCompletedMessage();
  }
}
