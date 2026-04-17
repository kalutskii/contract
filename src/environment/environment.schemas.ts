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
  package: z
    .object({
      name: z.string().meta({ description: 'NPM package name, e.g. @scope/package-name' }),
      version: z
        .string()
        .regex(/^\d+\.\d+\.\d+/)
        .meta({ description: 'Semantic version, e.g. 1.0.0' }),
      exports: z.record(z.string(), z.string()).optional().meta({ description: 'Optional package exports configuration.' }),
    })
    .meta({ description: 'Package metadata for contract distribution.' }),
  npm: z
    .object({
      token: z.string().meta({ description: 'NPM authentication token used for publishing.' }),
    })
    .optional()
    .meta({ description: 'Optional npm publishing configuration.' }),
});
export type Config = z.infer<typeof ConfigSchema>;

export const EnvironmentStatusSchema = z.object({
  contractDirectoryExists: z.boolean().default(false).meta({ description: 'Indicates if the main contract directory exists.' }),
  directoriesExistence: z
    .object({
      // * Ensure keys match ENVIRONMENT_DIRECTORIES
      manifests: z.boolean(), // Folder where contract manifests are stored
      generated: z.boolean(), // Folder for generated contract d.ts files
    })
    .default({ manifests: false, generated: false })
    .meta({ description: 'Existence status of required environment directories.' }),
  manifestsExistence: z
    .record(z.string(), z.boolean()) // Cannot use config here directly, so using string keys
    .default({})
    .meta({ description: 'Existence status of required contract manifest files (contract.<contract>.manifest.ts).' }),
});
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;
