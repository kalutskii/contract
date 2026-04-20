import { log } from '@clack/prompts';
import { green } from 'kleur/colors';

/** Returns spinner text shown when declaration build starts. */
export const buildSpinnerStartedMessage = (contractsCount: number): string =>
  `Building ${green(String(contractsCount))} contract declaration(s)...`;
/** Returns spinner text shown when declaration build succeeds. */
export const buildSpinnerCompletedMessage = (contractsCount: number): string =>
  `Built ${green(String(contractsCount))} contract declaration(s).`;
/** Returns spinner text shown when declaration build fails. */
export const buildSpinnerFailedMessage = (): string => 'Build failed.';
/** Logs fatal bundling error details. */
export const fatalErrorWhileBundlingMessage = (error: string): void => log.error(`Build failed: ${error}`);
