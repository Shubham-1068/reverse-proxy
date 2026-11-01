import { program } from "commander";
import os from "node:os";
import { parseConfig, validateConfig } from "./parser/configparser.js";
import { createServer } from "./server.js";

async function main() {
    program.option('--config <path>');
    program.parse();
    const options = program.opts();

    if (options && "config" in options) {
        const config = await validateConfig(await parseConfig(options.config));

        const port = process.env.PORT ? Number(process.env.PORT) : config.server.port;
        await createServer({ port, worker_threads: config.server.worker_threads ?? os.cpus().length, config: config });
    }

}

main();
