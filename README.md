# contract

Utility for types contract generation and synchronization between projects.

## Commands

### `contract init`

Initializes project structure and creates missing source contract files in `contract/source/` directory.

### `contract build`

Builds runtime contracts from source files into `contract/export/` directory. Uses esbuild for optimization and bundling.

### `contract sync`

Synchronizes contracts with external sources. Downloads contracts via HTTP and saves them to `contract/synced/` directory.

### `contract create-routes`

Generates hono routes files based on contracts. Interactively prompts for file placement path.

## Options

- `--ensure-sources, -u` - Updates source contract files (available for `init` command only)

## Configuration

Project uses a configuration file with:

- `appName` - application name
- `externalSources` - array of external contract sources
- `contracts` - array of contract objects with name and optional `emit` flag
