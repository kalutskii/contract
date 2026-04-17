import { Command } from 'clipanion';

import { getConfig, handleEnvironment } from '@/environment/environment.services';

import { bundleAllContractDeclarations } from './build.services';

/** CLI command that builds all configured contract declaration bundles. */
export class BuildCommand extends Command {
  static override paths = [['build']];

  public async execute(): Promise<void> {
    const config = await getConfig();
    await handleEnvironment(config);
    await bundleAllContractDeclarations(config);
  }
}
