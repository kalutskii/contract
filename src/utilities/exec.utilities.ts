import { log } from '@clack/prompts';
import { execa } from 'execa';

/** Result envelope for shell command execution. */
export interface ExecutedCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorMessage?: string;
}

/** Executes a shell command and returns collected stdout/stderr with status. */
export async function executeCommandWithResult(command: string, args: string[], cwd?: string): Promise<ExecutedCommandResult> {
  let stdout = '';
  let stderr = '';

  try {
    const subprocess = execa(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd });
    subprocess.stdout?.on('data', (data: Buffer | string) => {
      stdout += String(data);
    });
    subprocess.stderr?.on('data', (data: Buffer | string) => {
      stderr += String(data);
    });
    await subprocess;

    return { success: true, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      stdout,
      stderr,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Executes a shell command and logs errors when the command fails. */
export async function executeCommand(command: string, args: string[], cwd?: string): Promise<boolean> {
  const result = await executeCommandWithResult(command, args, cwd);
  if (!result.success) {
    log.error(`Error executing command: ${command} ${args.join(' ')}\n${result.stderr || result.stdout || result.errorMessage}`);
    return false;
  }

  return true;
}
