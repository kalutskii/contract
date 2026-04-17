import { Command, Option } from 'clipanion';

import { getConfig, handleEnvironment } from '@/environment/environment.services';

import { prepareContractPackage } from './prepare.services';

export class PreparePackageCommand extends Command {
  static override paths = [['prepare:package']];

  bump = Option.String('--bump', {
    description: 'Manual version bump: patch, minor, or major',
  });

  noBump = Option.Boolean('--no-bump', false, {
    description: 'Skip automatic version bumping',
  });

  async execute() {
    const config = await getConfig();
    await handleEnvironment(config);
    await prepareContractPackage(config, {
      bump: this.bump as 'patch' | 'minor' | 'major' | undefined,
      noBump: this.noBump,
    });
  }
}
