import { describe, expect, it } from "vitest";
import {
  addStep,
  completeStep,
  removeStep,
  updateDescription,
  updateStep,
  validateQueue,
} from "./index";

describe("domain queue", () => {
  it("normalizes titles and descriptions while copying in stable order", () => {
    const source = [
      { id: "a", title: " First ", description: " Details " },
      { id: "b", title: "Second", description: "  " },
    ];
    const result = validateQueue(source);
    expect(result).toEqual([
      { id: "a", title: "First", description: "Details" },
      { id: "b", title: "Second" },
    ]);
    expect(result).not.toBe(source);
    expect(result[0]).not.toBe(source[0]);
  });

  it.each([
    null,
    {},
    "",
    [null],
    [[]],
    [{ title: "Missing id" }],
    [{ id: 3, title: "Invalid id" }],
    [{ id: " ", title: "Invalid id" }],
    [{ id: "a", title: 3 }],
    [{ id: "a", title: " " }],
    [{ id: "a", title: "x", description: 4 }],
    [
      { id: "a", title: "x" },
      { id: "a", title: "y" },
    ],
  ])("rejects malformed queue %j", (input) => {
    expect(() => validateQueue(input)).toThrow(Error);
  });

  it("adds at the end without mutating the queue", () => {
    const initial = [{ id: "a", title: "First" }];
    expect(addStep(initial, { id: "b", title: " Second ", description: " Details " })).toEqual([
      ...initial,
      { id: "b", title: "Second", description: "Details" },
    ]);
    expect(addStep(initial, { id: "b", title: "Second", description: " " })).toEqual([
      ...initial,
      { id: "b", title: "Second" },
    ]);
    expect(initial).toEqual([{ id: "a", title: "First" }]);
    expect(() => addStep(initial, { id: "a", title: "Duplicate" })).toThrow();
    expect(() => addStep(initial, { id: "b", title: " " })).toThrow();
  });

  it("updates title and description by id, retaining order and ignoring missing ids", () => {
    const initial = [
      { id: "a", title: "First" },
      { id: "b", title: "Second", description: "Old" },
    ];
    expect(updateStep(initial, "b", " Changed ")).toEqual([
      { id: "a", title: "First" },
      { id: "b", title: "Changed", description: "Old" },
    ]);
    expect(updateDescription(initial, "a", " Details ")).toEqual([
      { id: "a", title: "First", description: "Details" },
      initial[1],
    ]);
    expect(updateDescription(initial, "b", " ")).toEqual(
      initial.map(({ description: _description, ...step }) => step),
    );
    expect(updateStep(initial, "missing", "Changed")).toEqual(initial);
    expect(updateDescription(initial, "missing", "Details")).toEqual(initial);
    expect(() => updateStep(initial, "a", " ")).toThrow();
    expect(() => updateDescription(initial, "a", 2 as never)).toThrow(
      "Step description must be a string",
    );
  });

  it("completes and removes only the requested step as distinct operations", () => {
    const initial = [
      { id: "a", title: "First" },
      { id: "b", title: "Second" },
    ];
    expect(completeStep(initial, "a")).toEqual([initial[1]]);
    expect(removeStep(initial, "b")).toEqual([initial[0]]);
    expect(completeStep(initial, "missing")).toEqual(initial);
    expect(removeStep(initial, "missing")).toEqual(initial);
    expect(initial).toHaveLength(2);
  });
});
