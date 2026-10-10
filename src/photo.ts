import { readFileSync } from "node:fs";
import { extname } from "node:path";

const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/**
 * The photo inlined as a data URL, like the fonts: the HTML needs no file next to it.
 */
export function loadPhotoDataUrl(path: string): string {
  const base64 = readFileSync(path).toString("base64");
  return `data:${MEDIA_TYPES[mediaTypeKey(path)]};base64,${base64}`;
}

export function isSupportedPhoto(path: string): boolean {
  return mediaTypeKey(path) in MEDIA_TYPES;
}

function mediaTypeKey(path: string): string {
  return extname(path).toLowerCase();
}
