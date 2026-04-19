import { Command } from 'clipanion';

import { initializeContractProject, updateContractEnvironment } from './init.services';

/** CLI command that reinitializes contract configuration and environment. */
export class InitCommand extends Command {
  static override paths = [['init']];

  public async execute(): Promise<void> {
    await initializeContractProject();
  }
}

/** CLI command that syncs environment folders and contract manifests. */
export class UpdateEnvironmentCommand extends Command {
  static override paths = [['update:environment']];

  public async execute(): Promise<void> {
    await updateContractEnvironment();
  }
}
