// Publishable files included in hash and package output.
// package.json is hashed with its version field removed.
export const PUBLISHABLE_FILES = ['package.json', 'index.d.ts', 'index.js'];

// State filename used to persist hash between prepare runs.
export const CONTRACT_PACKAGE_STATE_FILE = '.contract-package-state.json';
