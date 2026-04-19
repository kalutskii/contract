import fs from 'fs-extra';
import path from 'path';

import { getConfig } from '@/environment/environment.services';

import type { ResolvedNpmToken } from './publish.types';

/** Picks npm auth token from config first, then env fallbacks. */
export function resolveNpmToken(config: Awaited<ReturnType<typeof getConfig>>): ResolvedNpmToken | null {
  if (config.npm?.token) return { source: 'config', token: config.npm.token };
  if (process.env.NPM_TOKEN) return { source: 'NPM_TOKEN', token: process.env.NPM_TOKEN };
  if (process.env.NODE_AUTH_TOKEN) return { source: 'NODE_AUTH_TOKEN', token: process.env.NODE_AUTH_TOKEN };

  return null;
}

/** Writes temporary npm auth config into prepared package directory. */
export async function writeNpmRc(packageDir: string, token: string): Promise<void> {
  const npmrcPath = path.join(packageDir, '.npmrc');
  await fs.writeFile(npmrcPath, `//registry.npmjs.org/:_authToken=${token}\n`);
}

/** Removes temporary npm auth config after publish attempt completes. */
export async function removeNpmRc(packageDir: string): Promise<void> {
  const npmrcPath = path.join(packageDir, '.npmrc');
  await fs.remove(npmrcPath);
}
