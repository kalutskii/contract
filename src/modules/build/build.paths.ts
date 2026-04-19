import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';

/** Input/output pair used to bundle a single contract declaration. */
export interface ContractBundlePaths {
  input: string;
  output: string;
}

/** Resolves manifest input and generated output paths for a contract bundle. */
export function resolveContractBundlePaths(app: string, contract: string): ContractBundlePaths {
  const input = path.join(CONTRACT_DIRECTORY_NAME, 'manifests', `contract.${contract}.manifest.ts`);
  const output = path.join(CONTRACT_DIRECTORY_NAME, 'generated', `${app}.contract.${contract}.d.ts`);

  return { input, output };
}
