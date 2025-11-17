import z from 'zod';

export const ContractSchema = z.object({
  name: z.string(),
  emit: z.boolean().optional(),
});

export const ConfigSchema = z.object({
  $schema: z.url(),
  appName: z.string(),
  externalSources: z.array(z.string()),
  contracts: z.array(ContractSchema),
});

export type Contract = z.infer<typeof ContractSchema>;
export type Config = z.infer<typeof ConfigSchema>;
