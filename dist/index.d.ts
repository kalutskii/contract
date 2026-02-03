import { z } from 'zod';

declare const ConfigSchema: z.ZodObject<{
    app: z.ZodDefault<z.ZodString>;
    contracts: z.ZodDefault<z.ZodArray<z.ZodString>>;
    externalServices: z.ZodDefault<z.ZodArray<z.ZodUnion<readonly [z.ZodURL, z.ZodIPv4]>>>;
}, z.core.$strip>;
type Config = z.infer<typeof ConfigSchema>;

declare function contractMiddleware(): Promise<(c: any, next: any) => Promise<any>>;

export { type Config, contractMiddleware };
