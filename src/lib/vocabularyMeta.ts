import { ChunkColor } from "../types";

export const POS_BY_CATEGORY: Record<ChunkColor, string> = {
  green: "gap filler",
  blue: "sentence frame",
  red: "idiom / collocation",
  pink: "key term"
};

export function inferPosFromCategory(color?: string): string {
  if (color === "green" || color === "blue" || color === "red" || color === "pink") {
    return POS_BY_CATEGORY[color];
  }
  return POS_BY_CATEGORY.pink;
}
