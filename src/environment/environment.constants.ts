/** Default file name for the contract configuration module. */
export const CONFIG_FILE_NAME = 'contract.config.ts' as const;
/** Default contract keys used when bootstrapping a new config. */
export const DEFAULT_CONTRACTS = ['hono', 'types'] as const;
/** Root directory containing generated contract artifacts. */
export const CONTRACT_DIRECTORY_NAME = 'contract' as const;
/** Subdirectories required inside the contract environment root. */
export const ENVIRONMENT_DIRECTORIES = ['manifests', 'generated'] as const;
