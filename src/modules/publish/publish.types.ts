/** Basic shape of package metadata needed for publish flow. */
export interface PackageJsonInfo {
  name: string;
  version?: string;
}

/** Resolved npm token and where it came from. */
export interface ResolvedNpmToken {
  source: string;
  token: string;
}
