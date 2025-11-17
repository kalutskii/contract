import prompts from 'prompts';

export async function askWhereToWriteEndpoint(): Promise<string> {
  // This function prompts the user to specify where to write the endpoint files.

  const response = await prompts({
    type: 'text',
    name: 'path',
    message: 'Where do you want to write the endpoint files?',
    initial: 'src/domain/contract',
  });

  return response.path;
}
