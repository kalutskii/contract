import { log } from '@clack/prompts';
import { execa } from 'execa';

export async function executeCommand(command: string, args: string[]): Promise<boolean> {
  // Executes a command using execa and handles errors, capturing stderr output.

  let stderr = '';

  try {
    // Spawns the subprocess with piped stdio to capture stderr
    const subprocess = execa(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    subprocess.stderr?.on('data', (data) => (stderr += data.toString()));
    await subprocess; // Waits for the subprocess to complete
  } catch (error) {
    log.error(`Error executing command: ${command} ${args.join(' ')}\n${stderr}`);
    return false;
  }

  return true;
}
