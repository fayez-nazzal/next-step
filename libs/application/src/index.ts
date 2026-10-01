import {
  addStep,
  completeStep,
  removeStep,
  updateDescription,
  updateStep,
  type Queue,
} from "@next-step/domain";

export interface StepRepository {
  load(): Promise<Queue>;
  save(steps: Queue): Promise<void>;
}

export interface StepApplication {
  load(): Promise<Queue>;
  add(title: string): Promise<Queue>;
  update(id: string, title: string): Promise<Queue>;
  describe(id: string, description: string): Promise<Queue>;
  complete(id: string): Promise<Queue>;
  remove(id: string): Promise<Queue>;
}

export function createApplication(
  repository: StepRepository,
  createId: () => string,
): StepApplication {
  let mutations: Promise<void> = Promise.resolve();

  function mutate(change: (steps: Queue) => Queue): Promise<Queue> {
    const operation = mutations.then(async () => {
      const steps = await repository.load();
      const updated = change(steps);
      await repository.save(updated);
      return updated;
    });
    mutations = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  return {
    load: () => repository.load(),
    add: (title) => mutate((steps) => addStep(steps, { id: createId(), title })),
    update: (id, title) => mutate((steps) => updateStep(steps, id, title)),
    describe: (id, description) => mutate((steps) => updateDescription(steps, id, description)),
    complete: (id) => mutate((steps) => completeStep(steps, id)),
    remove: (id) => mutate((steps) => removeStep(steps, id)),
  };
}
