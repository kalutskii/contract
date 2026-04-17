import { Command } from 'clipanion';

import { packContractPackage } from './pack.services';

export class PackPackageCommand extends Command {
  static override paths = [['pack:package']];

  async execute() {
    await packContractPackage();
  }
}
