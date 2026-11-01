import { error } from "node:console";
import {z} from "zod";

export const workerMessageSchema = z.object({
    requestId: z.string(),
    requestType: z.enum(["http", "https"]),
    headers: z.any().optional(),
    body: z.any().optional(),
    url: z.string(),
});

export const workerResponseSchema = z.object({
    requestId: z.string(),
    message: z.string().optional(),
    error: z.string().optional(),
    responseCode: z.number().optional(),
});

export type WorkerMessage = z.infer<typeof workerMessageSchema>;
export type WorkerResponse = z.infer<typeof workerResponseSchema>;
