export type Step = Readonly<{
  id: string;
  title: string;
  description?: string;
}>;

export type Queue = readonly Step[];

function validateId(id: unknown): asserts id is string {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Step id must be a non-empty string");
  }
}

function validateTitle(title: unknown): asserts title is string {
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error("Step title must be a non-empty string");
  }
}

export function validateQueue(input: unknown): Queue {
  if (!Array.isArray(input)) throw new Error("Queue must be an array");
  const ids = new Set<string>();
  const queue: Step[] = [];
  for (const value of input as unknown[]) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("Step must be an object");
    }
    const item = value as Record<string, unknown>;
    validateId(item.id);
    validateTitle(item.title);
    if (ids.has(item.id)) throw new Error(`Duplicate step id: ${item.id}`);
    ids.add(item.id);
    if (item.description !== undefined && typeof item.description !== "string") {
      throw new Error("Step description must be a string");
    }
    const title = item.title.trim();
    const description = typeof item.description === "string" ? item.description.trim() : "";
    queue.push(
      description.length === 0 ? { id: item.id, title } : { id: item.id, title, description },
    );
  }
  return queue;
}

export function addStep(queue: Queue, step: Step): Queue {
  const current = validateQueue(queue);
  validateId(step.id);
  validateTitle(step.title);
  if (current.some((item) => item.id === step.id)) {
    throw new Error(`Duplicate step id: ${step.id}`);
  }
  const title = step.title.trim();
  const description = step.description?.trim() ?? "";
  return [
    ...current,
    description.length === 0 ? { id: step.id, title } : { id: step.id, title, description },
  ];
}

export function updateStep(queue: Queue, id: string, title: string): Queue {
  validateId(id);
  validateTitle(title);
  const current = validateQueue(queue);
  if (!current.some((step) => step.id === id)) return current;
  return current.map((step) => (step.id === id ? { ...step, title: title.trim() } : step));
}

export function updateDescription(queue: Queue, id: string, description: string): Queue {
  validateId(id);
  if (typeof description !== "string") throw new Error("Step description must be a string");
  const current = validateQueue(queue);
  if (!current.some((step) => step.id === id)) return current;
  return current.map((step) => {
    if (step.id !== id) return step;
    const normalized = description.trim();
    if (normalized.length === 0) {
      const { description: _description, ...withoutDescription } = step;
      return withoutDescription;
    }
    return { ...step, description: normalized };
  });
}

export function completeStep(queue: Queue, id: string): Queue {
  validateId(id);
  return validateQueue(queue).filter((step) => step.id !== id);
}

export function removeStep(queue: Queue, id: string): Queue {
  validateId(id);
  return validateQueue(queue).filter((step) => step.id !== id);
}
