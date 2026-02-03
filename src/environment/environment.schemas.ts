import { z } from 'zod';

export const ConfigSchema = z.object({
  app: z
    .string()
    .regex(/^[a-zA-Z_-]+$/)
    .default('placeholder')
    .meta({ description: 'The name of the application, used in filenames and identifiers.' }),
  contracts: z
    .array(z.string().regex(/^[a-zA-Z_-]+$/))
    .default([])
    .meta({ description: 'Array of selected contract names.' }),
  externalServices: z
    .array(z.union([z.url(), z.ipv4()]))
    .default([])
    .meta({ description: 'List of external service URLs or IP addresses the application interacts with.' }),
});
export type Config = z.infer<typeof ConfigSchema>;

export const EnvironmentStatusSchema = z.object({
  contractDirectoryExists: z.boolean().default(false).meta({ description: 'Indicates if the main contract directory exists.' }),
  directoriesExistence: z
    .object({
      // * Ensure keys match ENVIRONMENT_DIRECTORIES
      manifests: z.boolean(), // Folder where contract manifests are stored
      synchronized: z.boolean(), // Folder for synchronized contracts from external sources
      generated: z.boolean(), // Folder for generated contract d.ts files
    })
    .default({ manifests: false, synchronized: false, generated: false })
    .meta({ description: 'Existence status of required environment directories.' }),
  manifestsExistence: z
    .record(z.string(), z.boolean()) // Cannot use config here directly, so using string keys
    .default({})
    .meta({ description: 'Existence status of required contract manifest files (contract.<contract>.manifest.ts).' }),
});
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;
