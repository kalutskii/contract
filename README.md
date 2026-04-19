# contract

A TypeScript tool for building contract packages that define shared types and interfaces for distribution via npm or GitHub Packages.

Instead of syncing contracts over HTTP between services, this library generates publishable npm packages containing bundled TypeScript type definitions. Services consume these packages via standard package managers.

## What is a contract?

A contract is a versioned set of TypeScript type definitions that one service publishes and other services consume. For example:

- **Service A** defines types for "API responses", "request models", etc.
- **Service A** publishes a contract package `@company-contracts/service-a`
- **Service B** installs and imports: `import type * as ServiceAContracts from '@company-contracts/service-a/api'`

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

### Build Declarations

```bash
bunx contract build
```

This bundles each manifest into a standalone `.d.ts` file using `dts-bundle-generator`.

### Prepare Package

```bash
bunx contract prepare:package
```

This creates a publishable package in `contract/package/`:

```
contract/package/
  ├── package.json          # Package metadata
  ├── index.d.ts            # Exports all contracts
  ├── index.js              # Stub
  ├── api.d.ts              # Contract: api
  ├── api.js                # Stub
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

## Configuration

`contract.config.ts`:

```typescript
import type { Config } from 'contract';

const contractConfig: Config = {
  app: 'admin-service',
  contracts: ['api', 'types', 'events'],
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
- `package.name` - NPM package name
- `package.version` - Semantic version
- `package.exports` - (Optional) Custom export field configuration
- `npm.token` - (Optional) NPM auth token used for publishing

## Commands

| Command                       | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `contract init`               | Initialize contract environment and create default config |
| `contract update:environment` | Update directories and manifests based on current config  |
| `contract build`              | Bundle manifest files into `.d.ts` declarations           |
| `contract prepare:package`    | Generate publishable npm package directory                |
| `contract pack:package`       | Pack prepared package into a `.tgz` archive               |
| `contract publish:package`    | Publish package to npm using config/env token             |

## Directory Structure

```
contract/
  ├── manifests/        # Your contract definitions (source)
  │   ├── contract.api.manifest.ts
  │   └── contract.types.manifest.ts
  ├── generated/        # Built .d.ts files (output)
  │   ├── app.contract.api.d.ts
  │   └── app.contract.types.d.ts
  └── package/          # Publishable npm package (output)
      ├── package.json
      ├── index.d.ts
      ├── api.d.ts
      └── types.d.ts
```

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

## Build System

The project uses:

- **tsup** - Bundle and generate TypeScript declarations
- **dts-bundle-generator** - Bundle manifest files into single `.d.ts` files
- **Bun** - Runtime
- **Zod** - Config validation
- **Clipanion** - CLI framework

## Notes

- This library is **local-only** — it does not perform remote synchronization or automatic publishing
- Publishing uses a temporary `.npmrc` in `contract/package` from `config.npm.token`, `NPM_TOKEN`, or `NODE_AUTH_TOKEN` and removes it after publish attempt
- Contract manifests should contain only type definitions, not runtime code
- Use `contract update:environment` to regenerate missing files (e.g., after adding new contracts)
- Versions are automatically managed based on content changes and npm registry state
- Content hash is stored in `contract/.contract-package-state.json` for change detection
- If npm version already exists, bump version manually via `contract prepare:package --bump ...`

## License

MIT
