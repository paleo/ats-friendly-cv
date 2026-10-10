import { mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { printPdf } from "./print-pdf.ts";
import { renderHtml } from "./render-html.ts";
import { resolveCv } from "./resolve.ts";
import { readPdfCss } from "./stylesheets.ts";
import { listTargetPaths, loadValidTarget } from "./targets.ts";

await main();

async function main(): Promise<void> {
  try {
    const today = new Date();
    for (const targetPath of listTargetPaths(process.argv.slice(2))) {
      console.log(relative(process.cwd(), await generate(targetPath, today)));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("Usage: npm run generate -- [<target file or CV folder>...]");
    process.exitCode = 1;
  }
}

/**
 * Returns the path of the generated PDF.
 */
async function generate(targetPath: string, today: Date): Promise<string> {
  const loaded = loadValidTarget(targetPath);
  const css = readPdfCss(loaded.target.stylesheets, loaded.targetDir);
  const resolved = resolveCv(loaded.cv, loaded.target, { today, targetDir: loaded.targetDir });
  const html = renderHtml(resolved, css);
  const targetOutputDir = join(loaded.cvOutputDir, loaded.name);
  mkdirSync(targetOutputDir, { recursive: true });
  const pdfPath = join(targetOutputDir, resolved.fileName);
  const omitted = await printPdf(html, pdfPath, resolved.paperSize);
  for (const { headingText, keywords } of omitted) {
    console.log(`Keywords dropped for lack of room (${headingText}): ${keywords.join(", ")}`);
  }
  return pdfPath;
}
