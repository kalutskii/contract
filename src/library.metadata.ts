import { createRequire } from 'node:module';

interface LibraryMetadata {
  /** The name of the library, used in CLI output and package identity. */
  name: string;
  /** The current version of the library, used in CLI output and package identity. */
  version: string;
}

const require = createRequire(import.meta.url);
const packageMetadata = require('../package.json') as LibraryMetadata;

// Metadata is sourced from package.json to keep a single source of truth.

export const libraryMetadata: LibraryMetadata = {
  name: packageMetadata.name,
  version: packageMetadata.version,
};
