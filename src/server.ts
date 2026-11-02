import cluster, { Worker } from "node:cluster";
import http, { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { rootConfigSchemaValidator } from "./schemas/config-schema.js";
import type serverConfig from "./schemas/server-config.js";
import type { WorkerMessage, WorkerResponse } from "./schemas/worker-schema.js";
import { workerMessageSchema, workerResponseSchema } from "./schemas/worker-schema.js";
import { findMatchingRule } from "./route-matcher.js";

export async function createServer(config: serverConfig) {
    const { worker_threads, port } = config;
    
    const workers: Worker[] = [];

    if (cluster.isPrimary) {
        const pendingResponses = new Map<string, http.ServerResponse>();

        for (let i = 0; i < worker_threads; i++) {
            const currentWorker = cluster.fork({ config: JSON.stringify(config.config) });
            workers.push(currentWorker);
            currentWorker.on("message", async (message: string) => {
                const response = await workerResponseSchema.parseAsync(JSON.parse(message));
                const res = pendingResponses.get(response.requestId);
                if (!res) return;

                pendingResponses.delete(response.requestId);
                res.writeHead(response.responseCode as number);
                res.end(response.error ?? response.message);
            });
        }

        const server = http.createServer((req, res) => {
            if (new URL(req.url ?? "/", "http://localhost").pathname === "/") {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end("<!doctype html><html><head><title>Welcome</title></head><body style=\"display: flex; justify-content: center; align-items: center; height: 10vh; background-color: #000; color: #fff;\"><h1>Welcome to my custom Reverse Proxy!</h1></body></html>");
                return;
            }

            const randomWorker = Math.floor(Math.random() * workers.length);
            const worker = workers[randomWorker];

            if (!worker) throw new Error("Worker not found");

            const workerPayload: WorkerMessage = {
                requestId: randomUUID(),
                requestType: "http",
                headers: req.headers,
                body: "",
                url: `${req.url}`,
            }

            pendingResponses.set(workerPayload.requestId, res);
            worker.send(JSON.stringify(workerPayload));
        });

        server.listen(port, "0.0.0.0", () => {
            console.log(`Reverse proxy listening on port ${port}`);
        });

    } else {
        const config = await rootConfigSchemaValidator.parseAsync(
            JSON.parse(process.env.config as string),
        );

        process.on("message", async (message: string) => {
            const validatedMessage = await workerMessageSchema.parseAsync(JSON.parse(message));

            const requestUrl = validatedMessage.url;

            const pathname = new URL(requestUrl, "http://localhost").pathname;
            const rule = findMatchingRule(config.server.rules, pathname);

            if(!rule) {
                const response: WorkerResponse = {
                    requestId: validatedMessage.requestId,
                    error: "Rule not found",
                    responseCode: 404
                }

                if (process.send) process.send(JSON.stringify(response));
                return;
            }

            const upstream = config.server.upstreams.find((upstream) => upstream[rule.upstream]);

            if(!upstream) {
                const response: WorkerResponse = {
                    requestId: validatedMessage.requestId,
                    error: "Upstream not found",
                    responseCode: 500
                }

                if (process.send) process.send(JSON.stringify(response));
                return;
            }

            const request = http.request({
                host: upstream[rule.upstream],
                path: requestUrl,
                method: 'GET',
            }, (res) => {
                let body = "";

                res.on("data", (chunk) => {
                    body += chunk;
                });

                res.on("end", () => {
                    const response: WorkerResponse = {
                        requestId: validatedMessage.requestId,
                        message: body,
                        responseCode: res.statusCode
                    }

                    if (process.send) process.send(JSON.stringify(response));
                });
            });

            request.end();

        });
    }
}
