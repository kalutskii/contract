import { Command, Option } from 'clipanion';

import { publishContractPackage } from './publish.services';

export class PublishPackageCommand extends Command {
  static override paths = [['publish:package']];

  access = Option.String('--access', {
    description: 'Kept for compatibility. Only public access is supported.',
  });

  prepare = Option.Boolean('--prepare', false, {
    description: 'Prepare package before publishing',
  });

  async execute() {
    await publishContractPackage({
      access: this.access,
      prepare: this.prepare,
    });
  }
}
