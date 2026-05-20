import fs from 'fs/promises';
import path from 'path';

export type ProjectPackageJSON = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/** Collect bare package names that should stay external in emitted runtime bundles. */
export async function getRuntimeExternalPackages(): Promise<string[]> {
  const packageJSONPath = path.join(process.cwd(), 'package.json');

  try {
    const rawPackageJSON = await fs.readFile(packageJSONPath, 'utf-8');
    const packageJSON = JSON.parse(rawPackageJSON) as ProjectPackageJSON;
    const packageNames = new Set<string>([
      ...Object.keys(packageJSON.dependencies ?? {}),
      ...Object.keys(packageJSON.devDependencies ?? {}),
      ...Object.keys(packageJSON.peerDependencies ?? {}),
      ...Object.keys(packageJSON.optionalDependencies ?? {}),
    ]);

    return [...packageNames].flatMap((packageName) => [packageName, `${packageName}/*`]);
  } catch {
    return [];
  }
}
