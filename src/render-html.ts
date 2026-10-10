import type {
  ExperienceSection,
  LinesSection,
  ResolvedCv,
  ResolvedEntry,
  ResolvedGroup,
  ResolvedHeader,
  ResolvedKeyword,
  ResolvedSection,
  SkillsSection,
} from "./resolve.ts";

/**
 * A visible separator lets an ATS split the heading fields, and the keywords.
 */
const FIELD_SEPARATOR_HTML = `<span class="field-separator"> · </span>`;

export function renderHtml(resolved: ResolvedCv, css: string): string {
  return `<!doctype html>
<html lang="${resolved.lang}">
<head>
<meta charset="utf-8">
<title>${resolved.documentTitleHtml}</title>
<style>
${css}
@page {
  size: ${resolved.paperSize};
}
</style>
</head>
<body>
${renderHeader(resolved.header)}
${resolved.sections.map(renderSection).join("\n")}
</body>
</html>
`;
}

function renderHeader(header: ResolvedHeader): string {
  const detailsHtml = header.personalDetailLinesHtml.map((line) => `<li>${line}</li>`).join("");
  const photoHtml = header.photoUrl === undefined ? "" : renderPhoto(header.photoUrl);
  return `<header class="cv-header">
<h1 class="name">${header.nameHtml}</h1>
<p class="headline">${header.headlineHtml}</p>
<ul class="personal-details">${detailsHtml}</ul>
${photoHtml}</header>`;
}

/**
 * An empty `alt` makes the photo a PDF artifact: an ATS reads no text from it.
 */
function renderPhoto(photoUrl: string): string {
  return `<img class="photo" src="${photoUrl}" alt="">
`;
}

function renderSection(section: ResolvedSection): string {
  return `<section class="section section-${section.id}">
<h2>${section.titleHtml}</h2>
${renderSectionBody(section)}
</section>`;
}

function renderSectionBody(section: ResolvedSection): string {
  switch (section.id) {
    case "summary":
      return `<p>${section.summaryHtml}</p>`;
    case "highlights":
      return renderBullets("highlights", section.itemsHtml);
    case "skills":
      return renderSkills(section);
    case "experience":
      return renderExperience(section);
    case "projects":
      return section.entries.map(renderEntry).join("\n");
    case "education":
    case "certifications":
    case "languages":
    case "publications":
      return renderLines(section);
  }
}

/**
 * The bullet is a real character, so that an ATS can tell a new item from a wrapped line.
 */
function renderBullets(className: string, itemsHtml: string[]): string {
  const itemsWithBulletHtml = itemsHtml.map(
    (item) => `<li><span class="bullet">•</span>${item}</li>`,
  );
  return `<ul class="bullets ${className}">${itemsWithBulletHtml.join("")}</ul>`;
}

function renderSkills(section: SkillsSection): string {
  const itemsHtml = section.groups
    .map((group) => {
      const skillsHtml = group.skills.map((skill) => {
        const keywordHtml = renderKeyword(skill);
        return skill.experienceHtml === undefined
          ? keywordHtml
          : `${keywordHtml} ${skill.experienceHtml}`;
      });
      return `<li><strong class="skill-group">${group.labelHtml}</strong>${skillsHtml.join(FIELD_SEPARATOR_HTML)}</li>`;
    })
    .join("");
  return `<ul class="skills">${itemsHtml}</ul>`;
}

function renderKeyword(keyword: ResolvedKeyword): string {
  const className = keyword.highlighted ? "keyword keyword-highlighted" : "keyword";
  return `<span class="${className}">${keyword.nameHtml}</span>`;
}

function renderExperience(section: ExperienceSection): string {
  return section.groups.map(renderGroup).join("\n");
}

function renderGroup(group: ResolvedGroup): string {
  const subtitleHtml = group.subtitleHtml === undefined ? "" : `<h3>${group.subtitleHtml}</h3>\n`;
  return `<div class="group">
${subtitleHtml}${group.entries.map(renderEntry).join("\n")}
</div>`;
}

/**
 * An entry without description gets a separate styling hook.
 */
function renderEntry(entry: ResolvedEntry): string {
  const className = entry.descriptionItemsHtml === undefined ? "entry entry-compact" : "entry";
  const childrenHtml = [`<h4>${renderEntryHeading(entry)}</h4>`];
  if (entry.contextHtml !== undefined) {
    childrenHtml.push(`<p class="context">${entry.contextHtml}</p>`);
  }
  if (entry.descriptionItemsHtml !== undefined) {
    childrenHtml.push(renderBullets("description", entry.descriptionItemsHtml));
  }
  if (entry.keywords.length > 0) {
    const keywordsHtml = entry.keywords.map(renderKeyword).join(FIELD_SEPARATOR_HTML);
    childrenHtml.push(
      `<p class="keywords"><span class="keywords-label">${entry.keywordsLabelHtml}</span>${keywordsHtml}</p>`,
    );
  }
  return `<article class="${className}">\n${childrenHtml.join("\n")}\n</article>`;
}

/**
 * Period, organization, place and work mode are tags, to be spotted from one entry to the next.
 */
function renderEntryHeading(entry: ResolvedEntry): string {
  return [
    renderTag("period", entry.periodHtml),
    `<span class="entry-title">${entry.titleHtml}</span>`,
    renderTag("organization", entry.organizationHtml),
    renderTag(entry.distantPlace ? "place-distant" : "place", entry.placeHtml),
    renderTag("work-mode", entry.workModeHtml),
  ]
    .filter((field) => field !== undefined)
    .join(FIELD_SEPARATOR_HTML);
}

function renderTag(kind: string, html: string | undefined): string | undefined {
  if (html === undefined) return;
  return `<span class="tag tag-${kind}">${html}</span>`;
}

function renderLines(section: LinesSection): string {
  return `<ul class="lines">${section.linesHtml.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}
