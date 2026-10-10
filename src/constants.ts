import { dirname, join } from "node:path";

export const srcDir = import.meta.dirname;
export const packageDir = dirname(srcDir);
export const distDir = join(packageDir, "dist");
export const labelsDir = join(packageDir, "labels");
export const outputDir = join(packageDir, "output");
