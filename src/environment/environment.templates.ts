import type { Config } from './environment.schemas';

/** Renders the default TypeScript config template for the user project. */
export const renderConfigTemplate = (defaultConfig: Config): string => {
  const npmConfig = defaultConfig.npm
    ? `,
  npm: {
    token: '${defaultConfig.npm.token}',
  }`
    : `,
  // npm: {
  //   token: process.env.NPM_TOKEN ?? '',
  // }`;

  return `import type { Config } from 'contract';

const contractConfig: Config = {
  app: '${defaultConfig.app}',
  contracts: ${JSON.stringify(defaultConfig.contracts)},
  emit: ${JSON.stringify(defaultConfig.emit ?? [])},
  package: {
    name: '${defaultConfig.package.name}',
    version: '${defaultConfig.package.version}',
  }${npmConfig},
};

export default contractConfig;
`;
};

/** Renders a contract manifest template source file for the selected contract. */
export const renderManifestTemplate = (contractName: string): string =>
  `// Define and export all types related to this contract (${contractName}).
// This file will be bundled into ${contractName}.d.ts during "contract build".
// If this contract is listed in config.emit, re-export runtime values only from direct leaf files.
// Keep emitted source files free of unrelated runtime imports, or they will be pulled into the bundle.

`;
