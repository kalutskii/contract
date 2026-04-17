import { Command } from 'clipanion';

import { packContractPackage } from './pack.services';

/** CLI command that packs the prepared contract package into a tarball. */
export class PackPackageCommand extends Command {
  static override paths = [['pack:package']];

  public async execute(): Promise<void> {
    await packContractPackage();
  }
}
