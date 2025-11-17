import prompts from 'prompts';

export async function askWhereToWriteRoutes(): Promise<string> {
  // This function prompts the user to specify where to write the routes files.

  const response = await prompts({
    type: 'text',
    name: 'path',
    message: 'Where do you want to write the routes files?',
    initial: 'src/domain/contract',
  });

  return response.path;
}
