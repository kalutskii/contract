import { Command } from 'clipanion';

import { getConfig, handleEnvironment } from '@/environment/environment.services';

import { bundleAllContractDeclarations } from './build.services';

export class BuildCommand extends Command {
  static override paths = [['build']];

  async execute() {
    const config = await getConfig();
    await handleEnvironment(config, false);
    await bundleAllContractDeclarations(config);
  }
}
