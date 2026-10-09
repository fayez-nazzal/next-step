import { measureText } from "@opentui/core";
import { describe, expect, it } from "vitest";
import { selectBanner } from "./banner";

describe("responsive banner", () => {
  it("uses the largest fitting font, including exact-width boundaries", () => {
    const title = "Fix login bug";
    const blockWidth = measureText({ text: title, font: "block" }).width;
    const tinyWidth = measureText({ text: title, font: "tiny" }).width;

    expect(selectBanner(title, blockWidth)?.font).toBe("block");
    expect(selectBanner(title, blockWidth - 1)?.font).toBe("tiny");
    expect(selectBanner(title, tinyWidth)?.font).toBe("tiny");
    expect(selectBanner(title, tinyWidth - 1)).toBeNull();
  });

  it("uses native text instead of silently losing unsupported title characters", () => {
    expect(selectBanner("Deploy café", 200)).toBeNull();
  });
});
