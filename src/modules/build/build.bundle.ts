import { spinner } from '@clack/prompts';

import { executeCommand } from '@/utilities/execution.utilities';

import { bundlingCompletedMessage, bundlingStartedMessage } from './build.messages';
import { resolveContractBundlePaths } from './build.paths';

/** Bundles a single contract manifest into a generated declaration file. */
export async function bundleContractDeclaration(app: string, contract: string): Promise<void> {
  // 1) Resolve manifest input and declaration output paths.
  const paths = resolveContractBundlePaths(app, contract);

  const progressSpinner = spinner();
  progressSpinner.start(bundlingStartedMessage(contract));

  // 2) Run declaration bundler and fail fast if command exits with error.
  const executed = await executeCommand('npx', ['dts-bundle-generator', '-o', paths.output, paths.input, '--no-check']);
  if (!executed) {
    process.exit(1);
  }

  progressSpinner.stop(bundlingCompletedMessage(contract, paths.output));
}
