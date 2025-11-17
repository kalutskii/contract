import { a as Contract, C as Config } from '../../config.schemas-JAr0VZ_k.js';
import 'zod';

declare function fetchAndSaveExternalContract(contract: Contract, source: string): Promise<void>;
declare function fetchExternalConfig(source: string): Promise<Config>;

export { fetchAndSaveExternalContract, fetchExternalConfig };
