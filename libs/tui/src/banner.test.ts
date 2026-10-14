import { measureText } from "@opentui/core";
import { describe, expect, it } from "vitest";
import { selectBanner } from "./banner";

describe("responsive banner", () => {
  it("gives the active title the largest fitting font, including exact-width boundaries", () => {
    const title = "Fix login bug";
    const blockWidth = measureText({ text: title, font: "block" }).width;
    const tinyWidth = measureText({ text: title, font: "tiny" }).width;

    expect(selectBanner(title, blockWidth, "active")?.font).toBe("block");
    expect(selectBanner(title, blockWidth - 1, "active")?.font).toBe("tiny");
    expect(selectBanner(title, tinyWidth, "active")?.font).toBe("tiny");
    expect(selectBanner(title, tinyWidth - 1, "active")).toBeNull();
  });

  it("keeps queued titles on the compact font even when the block font would fit", () => {
    const title = "Fix login bug";
    const blockWidth = measureText({ text: title, font: "block" }).width;
    const tinyWidth = measureText({ text: title, font: "tiny" }).width;

    expect(selectBanner(title, blockWidth, "queued")?.font).toBe("tiny");
    expect(selectBanner(title, tinyWidth, "queued")?.font).toBe("tiny");
    expect(selectBanner(title, tinyWidth - 1, "queued")).toBeNull();
  });

  it("uses native text instead of silently losing unsupported title characters", () => {
    expect(selectBanner("Deploy café", 200, "active")).toBeNull();
    expect(selectBanner("Deploy café", 200, "queued")).toBeNull();
  });

  it("returns native text when no width is available", () => {
    expect(selectBanner("NEXT", 0, "active")).toBeNull();
    expect(selectBanner("NEXT", -1, "queued")).toBeNull();
  });
});
