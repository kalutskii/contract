import { Cli } from 'clipanion';

import { libraryMetadata } from '@/library.metadata';

/** Creates a configured Clipanion CLI client for this package. */
export function getClipanionClient(): Cli {
  return new Cli({
    binaryName: libraryMetadata.name,
    binaryLabel: `${libraryMetadata.name}-cli`,
    binaryVersion: libraryMetadata.version,
  });
}
