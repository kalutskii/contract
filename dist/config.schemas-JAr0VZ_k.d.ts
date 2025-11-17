import z from 'zod';

declare const ContractSchema: z.ZodObject<{
    name: z.ZodString;
    emit: z.ZodOptional<z.ZodBoolean>;
}, z.z.core.$strip>;
declare const ConfigSchema: z.ZodObject<{
    $schema: z.ZodURL;
    appName: z.ZodString;
    externalSources: z.ZodArray<z.ZodString>;
    contracts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        emit: z.ZodOptional<z.ZodBoolean>;
    }, z.z.core.$strip>>;
}, z.z.core.$strip>;
type Contract = z.infer<typeof ContractSchema>;
type Config = z.infer<typeof ConfigSchema>;

export type { Config as C, Contract as a };
