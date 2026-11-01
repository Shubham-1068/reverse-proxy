import fs from "node:fs/promises";
import { parse } from "yaml";
import { rootConfigSchemaValidator } from "../schemas/config-schema.js";

export async function parseConfig(path: string) {
    const config = await fs.readFile(path, "utf-8");

    return JSON.stringify(parse(config));
}

export async function validateConfig(config: string) {
    const validConfig = await rootConfigSchemaValidator.parseAsync(JSON.parse(config));

    return validConfig;
}