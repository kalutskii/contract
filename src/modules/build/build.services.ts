import { spinner } from '@clack/prompts';

import type { Config } from '@/environment/environment.schemas';

import { bundleContractDeclaration } from './build.bundle';
import {
  buildSpinnerCompletedMessage,
  buildSpinnerFailedMessage,
  buildSpinnerStartedMessage,
  fatalErrorWhileBundlingMessage,
} from './build.messages';

/** Bundles declaration files for every contract configured in the project. */
export async function bundleAllContractDeclarations(config: Config): Promise<void> {
  const buildSpinner = spinner();

  try {
    // 1) Show compact build progress for the whole command.
    buildSpinner.start(buildSpinnerStartedMessage(config.contracts.length));

    // 2) Bundle contracts one by one without extra per-contract success lines.
    for (const contract of config.contracts) {
      const executed = await bundleContractDeclaration(config.app, contract);
      if (!executed) {
        buildSpinner.stop(buildSpinnerFailedMessage());
        process.exit(1);
      }
    }

    // 3) Report success on the same spinner line.
    buildSpinner.stop(buildSpinnerCompletedMessage(config.contracts));
  } catch (error) {
    buildSpinner.stop(buildSpinnerFailedMessage());
    const errorMessage = error instanceof Error ? error.message : String(error);
    fatalErrorWhileBundlingMessage(errorMessage);
    process.exit(1);
  }
}
