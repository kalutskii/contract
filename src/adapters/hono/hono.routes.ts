import { Hono } from 'hono';
import path from 'path';

import { honoAdapterErrors } from './hono.errors';
import { getConfigSafely, readContractFile } from './hono.utilities';

// Router for contract hono middleware adapter
export const contractRouter = new Hono();

contractRouter.get('/config', async (c) => {
  // Retrieve configuration safely, returning error if not found.

  const configResult = await getConfigSafely();
  if (!configResult) return c.json({ error: honoAdapterErrors.CONFIG_NOT_FOUND }, 500);

  return c.json(configResult);
});

contractRouter.get('/get', async (c) => {
  // Retrieve a contract file based on the provided name query parameter.

  const configResult = await getConfigSafely();
  if (!configResult) return c.json({ error: honoAdapterErrors.CONFIG_NOT_FOUND }, 500);

  // Asserting contract name query param
  const contractName = c.req.query('name');
  if (!contractName) return c.json({ error: honoAdapterErrors.MISSING_CONTRACT_NAME_QUERY_PARAM }, 400);
  if (!configResult.contracts.includes(contractName)) return c.json({ error: honoAdapterErrors.UNKNOWN_CONTRACT(contractName) }, 404);

  // Getting contract file content
  const generatedContractFile = `${configResult.app}.contract.${contractName}.d.ts`;
  const contractFilePath = path.join(process.cwd(), 'contract', 'generated', generatedContractFile);
  const contractContent = await readContractFile(contractFilePath);

  if (contractContent === null) return c.json({ error: honoAdapterErrors.CONTRACT_FILE_NOT_FOUND(generatedContractFile) }, 404);

  // Important: for sync logic (file download)
  c.header('Content-Disposition', `attachment; filename="${generatedContractFile}"`);
  return c.text(contractContent, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
});
