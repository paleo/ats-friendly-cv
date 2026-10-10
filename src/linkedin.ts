import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Cv } from "../types/cv.d.ts";
import type { Target, TargetEntryMap, TargetGroupMap } from "../types/target.d.ts";
import { srcDir } from "./constants.ts";
import { type ResolvedCv, type ResolvedEntry, type ResolvedSection, resolveCv } from "./resolve.ts";
import { listTargetPaths, loadValidTarget } from "./targets.ts";

const CSS_PATH = join(srcDir, "linkedin.css");
const SCRIPT_PATH = join(srcDir, "linkedin.js");

/**
 * LinkedIn character limits, shown next to the fields they apply to.
 */
const HEADLINE_LIMIT = 220;
const ABOUT_LIMIT = 2600;
const DESCRIPTION_LIMIT = 2000;

main();

function main(): void {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1) throw new Error("Expected one target file");
    const [targetPath] = listTargetPaths(args);
    console.log(relative(process.cwd(), generate(targetPath)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("Usage: npm run linkedin -- <target file>");
    process.exitCode = 1;
  }
}

/**
 * Returns the path of the generated page. The profile is shared by every target of the language,
 * so the page sits next to the target directories of the CV folder.
 */
function generate(targetPath: string): string {
  const { cv, target, targetDir, cvOutputDir } = loadValidTarget(targetPath);
  const resolved = resolveCv(cv, withLongDescriptions(target, cv), {
    today: new Date(),
    targetDir,
  });
  mkdirSync(cvOutputDir, { recursive: true });
  const pagePath = join(cvOutputDir, `linkedin-${resolved.lang}.html`);
  writeFileSync(pagePath, renderLinkedInPage(resolved));
  return pagePath;
}

/**
 * A LinkedIn profile has room for every detail: each entry shows its long description, when it has
 * one, even in a group the target lists without descriptions.
 */
function withLongDescriptions(target: Target, cv: Cv): Target {
  const groups: TargetGroupMap = {};
  for (const [groupId, options] of Object.entries(target.groups ?? {})) {
    groups[groupId] = { ...options, withoutDescriptions: false };
  }
  const entries: TargetEntryMap = { ...target.entries };
  for (const entry of cv.entries) {
    if (entry.descriptions?.long === undefined) continue;
    entries[entry.id] = { ...entries[entry.id], description: "long" };
  }
  return { ...target, groups, entries };
}

/**
 * The CV as one copyable field per LinkedIn input, in the order of the target sections.
 */
function renderLinkedInPage(resolved: ResolvedCv): string {
  const { header } = resolved;
  return `<!doctype html>
<html lang="${resolved.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LinkedIn – ${header.nameHtml}</title>
<style>
${readFileSync(CSS_PATH, "utf8")}</style>
</head>
<body>
<main>
<h1>${header.nameHtml}</h1>
<section>
${renderField("Headline", header.headlineHtml, HEADLINE_LIMIT)}
${renderField("Contact info", joinLines(header.personalDetailLinesHtml))}
</section>
${resolved.sections.map(renderSection).join("\n")}
</main>
<script>
${readFileSync(SCRIPT_PATH, "utf8")}</script>
</body>
</html>
`;
}

function renderSection(section: ResolvedSection): string {
  return `<section>
<h2>${section.titleHtml}</h2>
${renderSectionBody(section)}
</section>`;
}

function renderSectionBody(section: ResolvedSection): string {
  switch (section.id) {
    case "summary":
      return renderField("About", section.summaryHtml, ABOUT_LIMIT);
    case "highlights":
      return renderField("Featured", joinLines(section.itemsHtml.map(bullet)), ABOUT_LIMIT);
    case "skills":
      return section.groups
        .map((group) =>
          renderField(group.labelHtml, group.skills.map((skill) => skill.nameHtml).join(", ")),
        )
        .join("\n");
    case "experience":
      return section.groups
        .map((group) => {
          const subtitleHtml =
            group.subtitleHtml === undefined ? "" : `<h3>${group.subtitleHtml}</h3>\n`;
          return `${subtitleHtml}${group.entries.map(renderEntry).join("\n")}`;
        })
        .join("\n");
    case "projects":
      return section.entries.map(renderEntry).join("\n");
    case "education":
    case "certifications":
    case "languages":
    case "publications":
      return section.linesHtml.map((lineHtml) => renderField("", lineHtml)).join("\n");
  }
}

function renderEntry(entry: ResolvedEntry): string {
  const fieldsHtml = [
    renderField("Title", entry.titleHtml),
    renderField("Company or organization", entry.organizationHtml),
    renderField("Location", entry.placeHtml),
    renderField("Location type", entry.workModeHtml),
    renderField("Period", entry.periodHtml),
    renderField("Description", renderDescription(entry), DESCRIPTION_LIMIT),
    renderField("Skills", entry.keywords.map((keyword) => keyword.nameHtml).join(", ")),
  ];
  return `<article>\n${fieldsHtml.filter((html) => html !== "").join("\n")}\n</article>`;
}

/**
 * The context, a blank line, then one bullet per line: the layout LinkedIn keeps when pasted.
 */
function renderDescription(entry: ResolvedEntry): string | undefined {
  const blocksHtml = [
    entry.contextHtml,
    entry.descriptionItemsHtml && joinLines(entry.descriptionItemsHtml.map(bullet)),
  ].filter((html) => html !== undefined);
  return blocksHtml.length === 0 ? undefined : blocksHtml.join("\n\n");
}

function bullet(itemHtml: string): string {
  return `• ${itemHtml}`;
}

function joinLines(linesHtml: string[]): string {
  return linesHtml.join("\n");
}

/**
 * An empty value gives no field. A limit adds a character count, checked in the browser.
 */
function renderField(labelHtml: string, valueHtml: string | undefined, limit?: number): string {
  if (valueHtml === undefined || valueHtml === "") return "";
  const limitAttribute = limit === undefined ? "" : ` data-limit="${limit}"`;
  return `<div class="field">
<div class="field-label">${labelHtml}<span class="field-count"></span></div>
<div class="field-value"${limitAttribute}>${valueHtml}</div>
<button type="button" class="copy">Copy</button>
</div>`;
}
