import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { packageDir } from "../src/constants.ts";
import { printPdf } from "../src/print-pdf.ts";
import { readPdfCss } from "../src/stylesheets.ts";

test("PDF stylesheets are required, with setup guidance", () => {
  for (const paths of [undefined, []]) {
    assert.throws(() => readPdfCss(paths, "/targets"), /stylesheets.*docs\/pdf-style\.md/);
  }
});

test("CSS contains only the user's files, in target order", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cv-css-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "base.css"), "body { font-size: 12pt; }");
  writeFileSync(join(dir, "override.css"), "body { font-size: 11pt; }");
  assert.equal(
    readPdfCss(["./base.css", "./override.css"], dir),
    "body { font-size: 12pt; }\nbody { font-size: 11pt; }",
  );
  assert.throws(() => readPdfCss(["missing.css"], dir), /ENOENT/);
});

test("data-only examples fail PDF setup but remain usable for skill computation", () => {
  for (const folder of ["examples/starter", "examples/advanced"]) {
    const pdf = runCommand("src/main.ts", folder);
    assert.equal(pdf.status, 1);
    assert.match(pdf.stderr, /No PDF stylesheet configured/);
    assert.match(pdf.stderr, /docs\/pdf-style\.md/);
    const skills = runCommand("src/skill-years.ts", folder);
    assert.equal(skills.status, 0, skills.stderr);
  }
});

test("custom block and column layouts preserve compact keywords", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cv-pdf-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const layout of ["display: block", "display: flex; flex-direction: column"]) {
    const path = join(dir, "custom.pdf");
    const omitted = await printPdf(compactEntryHtml(layout), path, "A4");
    assert.deepEqual(omitted, []);
    assert.equal(readFileSync(path).subarray(0, 5).toString(), "%PDF-");
  }
});

test("custom row-flex layouts opt into compact keyword fitting", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "cv-pdf-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const omitted = await printPdf(
    compactEntryHtml("display: flex; flex-wrap: wrap"),
    join(dir, "custom.pdf"),
    "Letter",
  );
  assert.deepEqual(omitted, [{ headingText: "Compact heading", keywords: ["Example skill"] }]);
});

function runCommand(script: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: packageDir,
    encoding: "utf8",
  });
}

function compactEntryHtml(layout: string): string {
  return `<!doctype html>
<html lang="en">
<head><style>
@page { margin: 12mm; }
body { margin: 0; }
h4, p { margin: 0; }
.entry-compact { ${layout} }
h4 { width: 100%; }
</style></head>
<body><article class="entry-compact">
<h4>Compact heading</h4>
<p class="keywords"><span class="keywords-label">Skills: </span><span class="keyword">Example skill</span></p>
</article></body>
</html>`;
}
