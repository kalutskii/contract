import { log } from '@clack/prompts';
import { execa } from 'execa';

export interface ExecutedCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorMessage?: string;
}

export async function executeCommandWithResult(command: string, args: string[], cwd?: string): Promise<ExecutedCommandResult> {
  // Executes a command using execa and returns captured stdout/stderr.

  let stdout = '';
  let stderr = '';

  try {
    const subprocess = execa(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd });
    subprocess.stdout?.on('data', (data) => (stdout += data.toString()));
    subprocess.stderr?.on('data', (data) => (stderr += data.toString()));
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

export async function executeCommand(command: string, args: string[], cwd?: string): Promise<boolean> {
  // Executes a command using execa and handles errors, capturing stderr output.
  // Optionally runs the command in a specific working directory via cwd parameter.

  const result = await executeCommandWithResult(command, args, cwd);
  if (!result.success) {
    log.error(`Error executing command: ${command} ${args.join(' ')}\n${result.stderr || result.stdout || result.errorMessage}`);
    return false;
  }

  return true;
}
