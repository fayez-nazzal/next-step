import { describe, expect, it } from "vitest";
import { createApplication, type StepRepository } from "./index";
import type { Queue } from "@next-step/domain";

function memoryRepository(initial: Queue = []) {
  let state = [...initial];
  const repository: StepRepository = {
    async load() {
      return state;
    },
    async save(steps) {
      state = [...steps];
    },
  };
  return { repository, state: () => state };
}

describe("application", () => {
  it("loads and runs add, update, describe, complete, and remove as separate persisted mutations", async () => {
    const store = memoryRepository();
    let id = 0;
    const app = createApplication(store.repository, () => `step-${++id}`);
    expect(await app.load()).toEqual([]);
    expect(await app.add("First")).toEqual([{ id: "step-1", title: "First" }]);
    expect(await app.add("Second")).toEqual([
      { id: "step-1", title: "First" },
      { id: "step-2", title: "Second" },
    ]);
    expect(await app.update("step-1", "Renamed")).toEqual([
      { id: "step-1", title: "Renamed" },
      { id: "step-2", title: "Second" },
    ]);
    expect(await app.describe("step-2", "Details")).toEqual([
      { id: "step-1", title: "Renamed" },
      { id: "step-2", title: "Second", description: "Details" },
    ]);
    expect(await app.complete("step-1")).toEqual([
      { id: "step-2", title: "Second", description: "Details" },
    ]);
    expect(await app.remove("step-2")).toEqual([]);
    expect(store.state()).toEqual([]);
  });

  it("propagates load and save errors and permits later mutations after a failed operation", async () => {
    const failure = new Error("disk failure");
    let shouldFail = true;
    let state: Queue = [];
    const repository: StepRepository = {
      async load() {
        if (shouldFail) throw failure;
        return state;
      },
      async save(steps) {
        state = [...steps];
      },
    };
    const app = createApplication(repository, () => "a");
    await expect(app.add("First")).rejects.toBe(failure);
    shouldFail = false;
    expect(await app.add("First")).toEqual([{ id: "a", title: "First" }]);

    const saveFailure = new Error("write failure");
    const brokenSave: StepRepository = {
      async load() {
        return state;
      },
      async save() {
        throw saveFailure;
      },
    };
    await expect(createApplication(brokenSave, () => "b").add("Second")).rejects.toBe(saveFailure);
  });

  it("serializes rapid local mutations so every mutation loads the preceding saved state", async () => {
    let state: Queue = [];
    const { promise: gate, resolve } = Promise.withResolvers<void>();
    const { promise: entered, resolve: markEntered } = Promise.withResolvers<void>();
    const loads: Queue[] = [];
    let first = true;
    const repository: StepRepository = {
      async load() {
        loads.push(state);
        if (first) {
          first = false;
          markEntered();
          await gate;
        }
        return state;
      },
      async save(steps) {
        state = [...steps];
      },
    };
    let id = 0;
    const app = createApplication(repository, () => `id-${++id}`);
    const firstMutation = app.add("One");
    await entered;
    const secondMutation = app.add("Two");
    const thirdMutation = app.add("Three");
    resolve();
    const results = await Promise.all([firstMutation, secondMutation, thirdMutation]);
    expect(results).toEqual([
      [{ id: "id-1", title: "One" }],
      [
        { id: "id-1", title: "One" },
        { id: "id-2", title: "Two" },
      ],
      [
        { id: "id-1", title: "One" },
        { id: "id-2", title: "Two" },
        { id: "id-3", title: "Three" },
      ],
    ]);
    expect(loads).toEqual([[], results[0], results[1]]);
    expect(state).toEqual(results[2]);
  });
});
