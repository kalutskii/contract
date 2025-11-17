import { execa } from 'execa';

export async function executeCommand(command: string, args: string[]): Promise<void> {
  // Executes a command using execa and handles errors.
  // If the command fails, it throws an error with the command and its arguments.

  let stderr = '';

  const subprocess = execa(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  subprocess.stderr?.on('data', (data) => (stderr += data.toString()));
  const { exitCode } = await subprocess;

  if (exitCode !== 0) {
    throw new Error(`❌ Command ${command} ${args.join(' ')} failed:\n${stderr}`);
  }
}
