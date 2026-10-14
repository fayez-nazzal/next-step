import { fonts, measureText } from "@opentui/core";

export type BannerRole = "active" | "queued";

export function selectBanner(
  title: string,
  availableWidth: number,
  role: BannerRole,
): { font: "block" | "tiny"; width: number; height: number } | null {
  const candidates = role === "active" ? (["block", "tiny"] as const) : (["tiny"] as const);
  for (const font of candidates) {
    const dimensions = measureText({ text: title, font });
    if (dimensions.width <= availableWidth) {
      for (const character of title) {
        if (!Object.hasOwn(fonts[font].chars, character.toUpperCase())) return null;
      }
      return { font, ...dimensions };
    }
  }
  return null;
}
