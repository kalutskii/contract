import { C as Config, a as Contract } from '../../config.schemas-JAr0VZ_k.js';
import 'zod';

declare function bundleRuntimeContract(config: Config, contract: Contract): Promise<void>;
declare function bundleDeclarationContract(config: Config, contract: Contract): Promise<void>;

export { bundleDeclarationContract, bundleRuntimeContract };
