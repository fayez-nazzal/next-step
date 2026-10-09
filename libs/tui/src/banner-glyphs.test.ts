import { fonts, measureText } from "@opentui/core";
import { describe, expect, it } from "vitest";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const halfPixels: Record<string, [string, string]> = {
  " ": ["0", "0"],
  "▀": ["1", "0"],
  "▄": ["0", "1"],
  "█": ["1", "1"],
};

function captureAlphabet() {
  const glyphs = new Map<string, string[]>();
  for (const letter of alphabet) {
    const rows = fonts.tiny.chars[letter as keyof typeof fonts.tiny.chars];
    const dimensions = measureText({ text: letter, font: "tiny" });
    const pixels = rows.flatMap((row) => {
      const cells = [...row];
      expect(cells.length, letter).toBe(dimensions.width);
      for (const cell of cells) expect(halfPixels[cell]).toBeDefined();
      return [0, 1].map((half) => cells.map((cell) => halfPixels[cell]?.[half]).join(""));
    });
    expect(pixels.length, letter).toBe(dimensions.height * 2);
    expect(pixels).toHaveLength(8);
    expect(pixels[7]).not.toContain("1");
    glyphs.set(letter, pixels.slice(0, 7));
  }
  return glyphs;
}

function connectedInk(pixels: string[]) {
  const ink = new Set<string>();
  for (const [y, row] of pixels.entries()) {
    for (const [x, pixel] of [...row].entries()) {
      if (pixel === "1") ink.add(`${x},${y}`);
    }
  }
  const pending = [ink.values().next().value as string];
  const visited = new Set<string>();
  while (pending.length) {
    const point = pending.pop() as string;
    if (visited.has(point)) continue;
    visited.add(point);
    const [x, y] = point.split(",").map(Number);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const neighbor = `${(x as number) + dx},${(y as number) + dy}`;
        if (ink.has(neighbor) && !visited.has(neighbor)) pending.push(neighbor);
      }
    }
  }
  return visited.size === ink.size;
}

describe("compact banner letter geometry", () => {
  it("keeps every letter distinct, aligned to one baseline, and connected", () => {
    const glyphs = captureAlphabet();
    const unique = new Set<string>();
    for (const letter of alphabet) {
      const pixels = glyphs.get(letter) as string[];
      expect(pixels[0], letter).toContain("1");
      expect(pixels[6], letter).toContain("1");
      expect(connectedInk(pixels), letter).toBe(true);
      unique.add(pixels.join("\n"));
    }
    expect(unique.size).toBe(alphabet.length);
  });

  it("centers crossbars, including E, H, and S, on the actual ink bounds", () => {
    const glyphs = captureAlphabet();
    for (const letter of "ABEFGHPRS") {
      const pixels = glyphs.get(letter) as string[];
      const bars = pixels.flatMap((row, y) => (y > 0 && y < 6 && row.includes("111") ? [y] : []));
      expect(bars, letter).toEqual([(pixels.length - 1) / 2]);
    }
    for (const letter of "BCDEHIKOX") {
      const pixels = glyphs.get(letter) as string[];
      expect([...pixels].reverse(), letter).toEqual(pixels);
    }
    const s = glyphs.get("S") as string[];
    expect(s.toReversed().map((row) => [...row].reverse().join(""))).toEqual(s);
    for (const letter of "AHIMOTUVWXY") {
      const pixels = glyphs.get(letter) as string[];
      expect(
        pixels.map((row) => [...row].reverse().join("")),
        letter,
      ).toEqual(pixels);
    }
  });
});
