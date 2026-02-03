// Default error messages for the hono middleware adapter.

export const honoAdapterErrors = {
  CONFIG_NOT_FOUND: 'Contract config not found in root directory (contract.config.ts) or corrupted, initialize it first (contract init).',
  MISSING_CONTRACT_NAME_QUERY_PARAM: 'Missing query param: name (the name of the contract to retrieve).',
  UNKNOWN_CONTRACT: (name: string) => `Unknown contract: ${name}, please check your configuration.`,
  CONTRACT_FILE_NOT_FOUND: (filename: string) => `Contract file not found: ${filename}, regenerate it if necessary (contract build).`,
};
