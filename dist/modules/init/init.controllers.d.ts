import { a as Contract } from '../../config.schemas-JAr0VZ_k.js';
import 'zod';

declare function ensureMissingSourceFiles(contracts: Contract[]): Promise<void>;
declare function ensureContractDirectory(): Promise<void>;
declare function createContractFolders(): Promise<void>;

export { createContractFolders, ensureContractDirectory, ensureMissingSourceFiles };
