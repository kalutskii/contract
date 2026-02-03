import { Cli } from 'clipanion';

import { libraryMetadata } from '@/library.metadata';

export function getClipanionClient(): Cli {
  // Creates and returns a configured Clipanion CLI client instance.

  return new Cli({
    binaryName: libraryMetadata.name,
    binaryLabel: `${libraryMetadata.name}-cli`,
    binaryVersion: libraryMetadata.version,
  });
}
