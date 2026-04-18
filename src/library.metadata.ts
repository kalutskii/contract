interface LibraryMetadata {
  /** The name of the library, used in CLI output and package identity. */
  name: string;
  /** The current version of the library, used in CLI output and package identity. */
  version: string;
}

/**
 * Static metadata used to configure CLI identity and version output.
 * When updating library version, also update the version in package.json.
 */
export const libraryMetadata: LibraryMetadata = { name: 'contract', version: '0.1.0' };
