import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readPdfCss(paths: string[] | undefined, targetDir: string): string {
  if (paths === undefined || paths.length === 0) {
    throw new Error(
      `No PDF stylesheet configured in "${targetDir}". Set "stylesheets" to at least one custom CSS file, for example ["../style.css"] (paths are relative to the target). See docs/pdf-style.md.`,
    );
  }
  return paths.map((path) => readFileSync(resolve(targetDir, path), "utf8")).join("\n");
}
