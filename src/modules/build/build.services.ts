import type { Config } from '@/environment/environment.schemas';

import { bundleContractDeclaration } from './build.bundle';
import { contractsBuildCompletedMessage } from './build.messages';

/** Bundles declaration files for every contract configured in the project. */
export async function bundleAllContractDeclarations(config: Config): Promise<void> {
  // 1) Bundle contracts one by one so progress output stays readable.
  for (const contract of config.contracts) {
    await bundleContractDeclaration(config.app, contract);
  }

  // 2) Report completion once all declarations were generated.
  contractsBuildCompletedMessage();
}
