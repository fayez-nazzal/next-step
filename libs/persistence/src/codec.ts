import { parse, stringify } from "yaml";
import { validateQueue, type Queue } from "@next-step/domain";

const VERSION = 1;

export function encodeQueue(queue: Queue): string {
  return stringify({ version: VERSION, steps: validateQueue(queue) });
}

export function decodeQueue(serialized: string): Queue {
  let document: unknown;
  try {
    document = parse(serialized);
  } catch (error) {
    throw new Error("Invalid state YAML", { cause: error });
  }

  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new Error("Invalid state document");
  }
  const record = document as Record<string, unknown>;
  if (record.version !== VERSION) {
    throw new Error(`Unsupported state version: ${String(record.version)}`);
  }
  return validateQueue(record.steps);
}
