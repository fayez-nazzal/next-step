import { describe, expect, it } from "vitest";
import { decodeQueue, encodeQueue } from "./codec";

const steps = [
  { id: "step-1", title: "Write code", description: "Keep it small" },
  { id: "step-2", title: "Review" },
] as const;

describe("queue codec", () => {
  it("round-trips an ordered queue including optional descriptions", () => {
    expect(decodeQueue(encodeQueue(steps))).toEqual(steps);
  });

  it("rejects malformed YAML", () => {
    expect(() => decodeQueue("version: [")).toThrow("Invalid state YAML");
  });

  it("rejects non-object documents", () => {
    expect(() => decodeQueue("- item")).toThrow("Invalid state document");
  });

  it("rejects unsupported or missing versions", () => {
    expect(() => decodeQueue("version: 2\nsteps: []\n")).toThrow("Unsupported state version: 2");
    expect(() => decodeQueue("steps: []\n")).toThrow("Unsupported state version: undefined");
  });

  it("validates the decoded queue", () => {
    expect(() => decodeQueue("version: 1\nsteps: nope\n")).toThrow();
    expect(() =>
      decodeQueue("version: 1\nsteps: [{id: a, title: same}, {id: a, title: same}]\n"),
    ).toThrow();
  });
});
