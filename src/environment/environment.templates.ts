import type { Config } from './environment.schemas';

export const renderConfigTemplate = (defaultConfig: Config): string => {
  // Renders a TypeScript configuration file template based on the provided configuration object.
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
  package: {
    name: '${defaultConfig.package.name}',
    version: '${defaultConfig.package.version}',
  }${npmConfig},
};

export default contractConfig;
`;
};

export const renderManifestTemplate = (contractName: string): string =>
  // Renders a TypeScript manifest file template for the specified contract.
  `// Define and export all types related to this contract (${contractName}).
// This file will be bundled into ${contractName}.d.ts during "contract build".

`;
