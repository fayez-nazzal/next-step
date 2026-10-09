import { fonts, measureText } from "@opentui/core";

export function selectBanner(title: string, availableWidth: number) {
  for (const font of ["block", "tiny"] as const) {
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
