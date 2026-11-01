import { z } from "zod";

const headersSchemaValidator = z.object({
    key: z.string(),
    value: z.string()
})

const rulesSchemaValidator = z.object({
    path: z.string(),
    upstream: z.string()
})

const upstreamsSchemaValidator = z.record(z.string(), z.string());

const configSchemaValidator = z.object({
    port: z.number(),
    worker_threads: z.number(),
    headers: z.array(headersSchemaValidator).optional(),
    rules: z.array(rulesSchemaValidator),
    upstreams: z.array(upstreamsSchemaValidator)
})

export const rootConfigSchemaValidator = z.object({
    server: configSchemaValidator
});

export type ConfigSchema = z.infer<typeof rootConfigSchemaValidator>;
