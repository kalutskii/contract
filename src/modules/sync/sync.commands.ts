import { Command } from 'clipanion';

import { getConfig, handleEnvironment } from '@/environment/environment.services';

import { synchronizeExternalServicesContracts } from './sync.services';

export class SyncCommand extends Command {
  static override paths = [['sync']];

  async execute() {
    const config = await getConfig();
    await handleEnvironment(config, false);
    await synchronizeExternalServicesContracts(config);
  }
}
