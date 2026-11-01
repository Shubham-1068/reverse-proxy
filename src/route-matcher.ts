import { match } from "path-to-regexp";
import type { ConfigSchema } from "./schemas/config-schema.js";

type RouteRule = ConfigSchema["server"]["rules"][number];

export function findMatchingRule(rules: RouteRule[], pathname: string): RouteRule | undefined {
    return rules.find((rule) => match(rule.path)(pathname) !== false);
}
