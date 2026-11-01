import type { ConfigSchema } from "./config-schema";

export default interface serverConfig{
    port: number;
    worker_threads: number;
    config: ConfigSchema;
}