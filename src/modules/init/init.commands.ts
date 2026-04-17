import { Command } from 'clipanion';

import { initializePrompt } from '@/environment/environment.chat';
import { clearEnvironment, createDefaultConfigFile, getConfig, handleEnvironment } from '@/environment/environment.services';

import { environmentUpdateCompletedMessage, initializationCancelledMessage, initializationCompletedMessage } from './init.messages';

export class InitCommand extends Command {
  static override paths = [['init']];

  async execute() {
    const shouldInitialize = await initializePrompt();
    if (!shouldInitialize) return initializationCancelledMessage();

    await clearEnvironment();
    const config = await createDefaultConfigFile();
    await handleEnvironment(config);

    initializationCompletedMessage();
  }
}

export class UpdateEnvironmentCommand extends Command {
  static override paths = [['update:environment']];

  async execute() {
    const config = await getConfig();
    await handleEnvironment(config);

    environmentUpdateCompletedMessage();
  }
}
