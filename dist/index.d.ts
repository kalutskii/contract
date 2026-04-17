import { z } from 'zod';

declare const ConfigSchema: z.ZodObject<{
    app: z.ZodDefault<z.ZodString>;
    contracts: z.ZodDefault<z.ZodArray<z.ZodString>>;
    package: z.ZodObject<{
        name: z.ZodString;
        version: z.ZodString;
        exports: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>;
    npm: z.ZodOptional<z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
type Config = z.infer<typeof ConfigSchema>;

export type { Config };
