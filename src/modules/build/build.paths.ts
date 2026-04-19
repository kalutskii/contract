import path from 'path';

import { CONTRACT_DIRECTORY_NAME } from '@/environment/environment.constants';

import type { ContractBundlePaths } from './build.types';

/** Resolves manifest input and generated output paths for a contract bundle. */
export function resolveContractBundlePaths(app: string, contract: string): ContractBundlePaths {
  const input = path.join(CONTRACT_DIRECTORY_NAME, 'manifests', `contract.${contract}.manifest.ts`);
  const output = path.join(CONTRACT_DIRECTORY_NAME, 'generated', `${app}.contract.${contract}.d.ts`);

  return { input, output };
}
