# contract

A TypeScript CLI tool for building contract packages that define shared types and interfaces for distribution via npm.

Instead of syncing contracts over HTTP between services, this library generates publishable npm packages containing bundled TypeScript type definitions. Services consume these packages via standard package managers.

---

## Installation

```bash
# npm / yarn / pnpm
npm install -g @kalutskii/contract

# bun
bun add -g @kalutskii/contract
```

Or run without installing:

```bash
bunx @kalutskii/contract <command>
```

> Requires `typescript >= 5.9` and `jiti >= 2.6` as peer dependencies.

---

## What is a contract?

A contract is a versioned set of TypeScript type definitions that one service publishes and other services consume. For example:

- **Service A** defines types for "API responses", "request models", etc.
- **Service A** publishes a contract package `@company-contracts/service-a`
- **Service B** installs and imports: `import type * as ServiceAContracts from '@company-contracts/service-a/api'`

---

## Quick Start

### Initialize

```bash
bunx contract init
```

This creates:

- `contract.config.ts` - Configuration file
- `contract/manifests/` - Directory for contract definitions
- `contract/generated/` - Output directory for bundled declarations
- `contract/package/` - Output directory for publishable package

### Define Contracts

Edit `contract/manifests/contract.<name>.manifest.ts`:

```typescript
// contract/manifests/contract.api.manifest.ts

export interface UserCreateRequest {
  email: string;
  name: string;
}

export interface UserCreateResponse {
  id: string;
  createdAt: string;
}
```

For emitted runtime values, prefer this shape:

```typescript
export { PBACPermissionsRecord } from '@/app/domain/permissions/permissions.constants';
```

Keep `permissions.constants.ts` as a leaf runtime file with no unrelated runtime imports.

### Build Declarations

```bash
bunx contract build
```

This bundles each manifest into a standalone `.d.ts` file using `dts-bundle-generator`.
If a contract name is listed in `emit` inside `contract.config.ts`, the build also emits a runtime `.js` file for that manifest.

For `emit` contracts, keep runtime exports narrow:

- re-export directly from the concrete file that owns the value
- avoid barrel files for runtime exports
- keep that source file free of unrelated runtime imports when possible

### Prepare Package

```bash
bunx contract prepare:package
```

This creates a publishable package in `contract/package/`:

```
contract/package/
  ├── package.json          # Package metadata
  ├── index.d.ts            # Exports all contracts
  ├── index.js              # Runtime entrypoint for emitted contracts
  ├── api.d.ts              # Contract: api
  ├── api.js                # Runtime contract module when emitted
  ├── types.d.ts            # Contract: types
  └── types.js              # Stub
```

Hash state is stored at `contract/.contract-package-state.json`.

**Automatic versioning:**

The command automatically bumps the patch version if the generated contract files have changed:

- First run: stores a content hash, version unchanged
- Content unchanged: version stays the same
- Content changed: patch version bumps (e.g., `1.0.0 → 1.0.1`)

**Manual version overrides:**

```bash
bunx contract prepare:package --bump minor
bunx contract prepare:package --bump major
bunx contract prepare:package --no-bump
```

The `--no-bump` flag disables automatic version bumping.

### Pack Package

```bash
bunx contract pack:package
```

Creates a `.tgz` archive of the prepared package in `contract/package/`.

### Publish Package

```bash
bunx contract publish:package
```

Publishes the prepared package to npm. The CLI writes `.npmrc` inside `contract/package` and publishes with public access enabled.

If the current version already exists on npm, publishing fails with a clear message and you should run:

```bash
bunx contract prepare:package --bump patch
```

**Token priority:**

1. `config.npm.token`
2. `NPM_TOKEN`
3. `NODE_AUTH_TOKEN`

The package can also be prepared and published in one step:

```bash
bunx contract publish:package --prepare
```

The `--prepare` flag will rebuild the package before publishing.

---

## Configuration

`contract.config.ts`:

```typescript
import type { Config } from 'contract';

const contractConfig: Config = {
  app: 'admin-service',
  contracts: ['api', 'types', 'events'],
  emit: ['events'],
  package: {
    name: '@company-contracts/admin-service',
    version: '1.0.0',
  },
  npm: {
    token: process.env.NPM_TOKEN ?? '',
  },
};

export default contractConfig;
```

**Fields:**

- `app` - Service/app name (used in generated filenames)
- `contracts` - List of contract names to generate
- `emit` - Subset of contracts that should also publish runtime JavaScript
- `package.name` - NPM package name
- `package.version` - Semantic version
- `package.exports` - (Optional) Custom export field configuration
- `npm.token` - (Optional) NPM auth token used for publishing

---

## Commands

| Command                       | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `contract init`               | Initialize contract environment and create default config |
| `contract update:environment` | Update directories and manifests based on current config  |
| `contract build`              | Bundle manifest files into `.d.ts` declarations           |
| `contract prepare:package`    | Generate publishable npm package directory                |
| `contract pack:package`       | Pack prepared package into a `.tgz` archive               |
| `contract publish:package`    | Publish package to npm using config/env token             |

---

## Directory Structure

```
contract/
  ├── manifests/        # Your contract definitions (source)
  │   ├── contract.api.manifest.ts
  │   └── contract.types.manifest.ts
  ├── generated/        # Built .d.ts files (output)
  │   ├── app.contract.api.d.ts
  │   ├── app.contract.events.js
  │   └── app.contract.types.d.ts
  └── package/          # Publishable npm package (output)
      ├── package.json
      ├── index.d.ts
      ├── index.js
      ├── api.d.ts
      ├── events.js
      └── types.d.ts
```

---

## Consumer Usage

After publishing your contract package, consumers install and import it:

```typescript
// Consumer service
import type { UserCreateRequest } from '@company-contracts/admin-service/api';

const user: UserCreateRequest = {
  email: 'user@example.com',
  name: 'John Doe',
};
```

---

## Development Workflow

### Producer Service (publishes contracts)

```bash
# Define contracts in contract/manifests/
# Update contract.config.ts

bunx contract update:environment   # Sync manifest files
bunx contract build                # Generate .d.ts from manifests
bunx contract prepare:package      # Create npm package (auto-versions if content changed)
bunx contract publish:package      # Publish to npm
```

**Versioning behavior:**

- `prepare:package` detects content changes and bumps patch version automatically
- `publish:package` checks whether target version already exists on npm
- if version exists, publish fails and asks for manual bump (`--bump patch|minor|major`)
- Use `--bump major|minor` to manually override during prepare
- Use `--no-bump` to disable automatic bumping

**Requirements:**

- provide `npm.token` in `contract.config.ts`, or set `NPM_TOKEN` / `NODE_AUTH_TOKEN`

### Consumer Service (uses contracts)

```bash
# Install the contract package
bun add @company-contracts/admin-service

# Import types
import type * as AdminAPI from '@company-contracts/admin-service/api';
```

---

## Notes

- This library is **local-only** — it does not perform remote synchronization or automatic publishing
- Publishing uses a temporary `.npmrc` in `contract/package` from `config.npm.token`, `NPM_TOKEN`, or `NODE_AUTH_TOKEN` and removes it after the publish attempt
- Contract manifests can export runtime values for contracts listed in `emit`
- For `emit`, import or re-export from direct leaf files instead of barrels or service modules with broader dependency graphs
- Use `contract update:environment` to regenerate missing files (e.g., after adding new contracts)
- Versions are automatically managed based on content changes and npm registry state
- Content hash is stored in `contract/.contract-package-state.json` for change detection
- If npm version already exists, bump version manually via `contract prepare:package --bump ...`

---

## Contributing

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 20 (for tooling compatibility)

### Setup

```bash
git clone https://github.com/kalutskii/contract.git
cd contract
bun install
```

### Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `bun run build`     | Compile CLI and library via tsup         |
| `bun run typecheck` | Run TypeScript compiler without emitting |
| `bun run lint`      | Run ESLint across all TypeScript sources |

### Project Layout

```
src/
  adapters/       # CLI framework wiring (Clipanion)
  environment/    # Config loading, validation, and env helpers
  modules/
    build/        # contract build command
    init/         # contract init command
    pack/         # contract pack:package command
    prepare/      # contract prepare:package command
    publish/      # contract publish:package command
    versioning/   # Content hashing and semver bump logic
  utilities/      # Shared utility functions
cli.entrypoint.ts # CLI entry point
index.ts          # Library public API
```

### Tech Stack

- **tsup** — bundle and emit TypeScript declarations
- **dts-bundle-generator** — bundle manifest files into single `.d.ts` files
- **Bun** — runtime and package manager
- **Clipanion** — CLI framework
- **Zod** — config schema validation
- **@clack/prompts** — interactive terminal prompts

### Making Changes

1. Edit source under `src/`
2. Run `bun run typecheck` and `bun run lint` to validate
3. Run `bun run build` to compile
4. Test the CLI locally: `./dist/cli.entrypoint.js <command>`

---

## License

MIT
