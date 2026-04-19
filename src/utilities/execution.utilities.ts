import { log } from '@clack/prompts';
import { execa } from 'execa';

/** Result envelope for shell command execution. */
export interface ExecutedCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorMessage?: string;
}

interface CommandOutputBuffer {
  stdout: string;
  stderr: string;
}

// 1) Create an empty accumulator for process output.
function createOutputBuffer(): CommandOutputBuffer {
  return { stdout: '', stderr: '' };
}

// 2) Append each incoming chunk to the corresponding output stream.
function appendChunk(target: 'stdout' | 'stderr', buffer: CommandOutputBuffer, chunk: Buffer | string): void {
  buffer[target] += String(chunk);
}

// 3) Subscribe once; keep execute flow clean.
function attachOutputListeners(subprocess: ReturnType<typeof execa>, buffer: CommandOutputBuffer): void {
  subprocess.stdout?.on('data', (chunk: Buffer | string) => appendChunk('stdout', buffer, chunk));
  subprocess.stderr?.on('data', (chunk: Buffer | string) => appendChunk('stderr', buffer, chunk));
}

// Build a unified failure shape used by callers.
function createFailedResult(buffer: CommandOutputBuffer, error: unknown): ExecutedCommandResult {
  return {
    success: false,
    stdout: buffer.stdout,
    stderr: buffer.stderr,
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

// Build a unified success shape used by callers.
function createSuccessResult(buffer: CommandOutputBuffer): ExecutedCommandResult {
  return { success: true, stdout: buffer.stdout, stderr: buffer.stderr };
}

/** Executes a shell command and returns collected stdout/stderr with status. */
export async function executeCommandWithResult(
  command: string,
  args: string[],
  cwd?: string
): Promise<ExecutedCommandResult> {
  // Keep stdout/stderr from the whole command lifecycle.
  const output = createOutputBuffer();

  try {
    // Start process in shell mode to match existing command usage.
    const subprocess = execa(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd });

    // Stream output chunks into our local buffer.
    attachOutputListeners(subprocess, output);

    // Wait for completion (throws on non-zero exit).
    await subprocess;

    return createSuccessResult(output);
  } catch (error) {
    // Return a structured failure instead of throwing from utility layer.
    return createFailedResult(output, error);
  }
}

/** Executes a shell command and logs errors when the command fails. */
export async function executeCommand(command: string, args: string[], cwd?: string): Promise<boolean> {
  // Thin convenience wrapper for modules that only need success/failure.
  const result = await executeCommandWithResult(command, args, cwd);

  // Centralized error formatting for CLI output.
  if (!result.success) {
    const errorMessage = result.stderr || result.stdout || result.errorMessage || 'Unknown error';
    log.error(`Error executing command: ${command} ${args.join(' ')}\n${errorMessage}`);

    return false;
  }

  return true;
}
