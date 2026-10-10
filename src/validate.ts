import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Cv, Entry, Place, Taxonomy, Text } from "../types/cv.d.ts";
import type { SectionId, Target } from "../types/target.d.ts";
import { hasLabels, hasTranslation, labelsPath } from "./l10n.ts";
import { isSupportedPhoto } from "./photo.ts";
import { BUILT_IN_PERSONAL_DETAILS, SUMMARY_MARKERS } from "./resolve.ts";
import { listSkillNames } from "./skills.ts";

const YEAR_MONTH: DateFormat = { pattern: /^\d{4}-(0[1-9]|1[0-2])$/, label: "yyyy-mm" };
const YEAR_MONTH_DAY: DateFormat = {
  pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  label: "yyyy-mm-dd",
};
const YEAR_OR_YEAR_MONTH: DateFormat = {
  pattern: /^\d{4}(-(0[1-9]|1[0-2]))?$/,
  label: "yyyy or yyyy-mm",
};
const MARKER = /\{[^}]*\}/g;
const FILE_NAME_MARKERS = new Set([
  "{firstName}",
  "{lastName}",
  "{headline}",
  "{lang}",
  "{LANG}",
  "{year}",
]);

interface DateFormat {
  pattern: RegExp;
  label: string;
}

export function assertValidCv(cv: Cv, path: string): void {
  throwIfProblems(validateCv(cv), path);
}

export function assertValidTarget(target: Target, cv: Cv, path: string): void {
  throwIfProblems(validateTarget(target, cv, dirname(path)), path);
}

function throwIfProblems(problems: string[], path: string): void {
  if (problems.length === 0) return;
  const lines = problems.map((problem) => `- ${problem}`);
  throw new Error([`Inconsistent data in "${path}":`, ...lines].join("\n"));
}

function validateCv(cv: Cv): string[] {
  const problems: string[] = [];
  checkNoEmptyValues(cv, "", problems);
  checkCvDates(cv, problems);
  checkUniqueIds(cv.entries, "entries", problems);
  checkUniqueIds(cv.publications ?? [], "publications", problems);
  checkCvReferences(cv, problems);
  checkPersonalDetailKeys(cv, problems);
  checkTaxonomies(cv, problems);
  checkSummaryMarkers(cv, problems);
  return problems;
}

/**
 * Rejects blank strings, empty lists and empty translation objects.
 */
function checkNoEmptyValues(value: unknown, path: string, problems: string[]): void {
  if (typeof value === "string") {
    if (value.trim() === "") problems.push(`${path}: empty string`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) problems.push(`${path}: empty list`);
    value.forEach((item, index) => {
      checkNoEmptyValues(item, itemPath(path, index, idOf(item)), problems);
    });
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    checkNoEmptyValues(child, path === "" ? key : `${path}.${key}`, problems);
  }
}

function itemPath(path: string, index: number, id?: string): string {
  return id === undefined ? `${path}[${index}]` : `${path}[${index}] (${id})`;
}

function idOf(item: unknown): string | undefined {
  if (typeof item !== "object" || item === null || !("id" in item)) return;
  return typeof item.id === "string" ? item.id : undefined;
}

function checkCvDates(cv: Cv, problems: string[]): void {
  if (cv.person.birthDate !== undefined) {
    checkDateFormat(cv.person.birthDate, "person.birthDate", YEAR_MONTH_DAY, problems);
  }
  cv.entries.forEach((entry, index) => {
    checkPeriod(entry, entryPath(entry, index), YEAR_MONTH, problems);
  });
  (cv.education ?? []).forEach((education, index) => {
    checkPeriod(education, itemPath("education", index), YEAR_OR_YEAR_MONTH, problems);
  });
  (cv.certifications ?? []).forEach((certification, index) => {
    const path = `${itemPath("certifications", index)}.date`;
    checkDateFormat(certification.date, path, YEAR_OR_YEAR_MONTH, problems);
  });
  (cv.publications ?? []).forEach((publication, index) => {
    const path = `${itemPath("publications", index, publication.id)}.date`;
    checkDateFormat(publication.date, path, YEAR_OR_YEAR_MONTH, problems);
  });
}

/**
 * Returns `true` when the date is valid.
 */
function checkDateFormat(
  date: string,
  path: string,
  format: DateFormat,
  problems: string[],
): boolean {
  if (format.pattern.test(date)) return true;
  problems.push(`${path}: invalid date "${date}", expected ${format.label}`);
  return false;
}

function entryPath(entry: Entry, index: number): string {
  return itemPath("entries", index, entry.id);
}

interface Period {
  start?: string;
  end?: string;
}

function checkPeriod(period: Period, path: string, format: DateFormat, problems: string[]): void {
  const startValid =
    period.start !== undefined && checkDateFormat(period.start, `${path}.start`, format, problems);
  if (period.end === undefined) return;
  const endValid = checkDateFormat(period.end, `${path}.end`, format, problems);
  if (startValid && endValid && isLater(period.start ?? "", period.end)) {
    problems.push(`${path}: start "${period.start}" is after end "${period.end}"`);
  }
}

/**
 * Compares two dates at their common precision (`"2020"` is not later than `"2020-03"`).
 */
function isLater(date: string, other: string): boolean {
  const length = Math.min(date.length, other.length);
  return date.slice(0, length) > other.slice(0, length);
}

interface Identified {
  id: string;
}

function checkUniqueIds(items: Identified[], path: string, problems: string[]): void {
  const ids = items.map((item) => item.id);
  for (const index of findDuplicateIndexes(ids)) {
    problems.push(`${itemPath(path, index, ids[index])}: duplicate id`);
  }
}

function findDuplicateIndexes(values: string[]): number[] {
  const seen = new Set<string>();
  const duplicates: number[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) duplicates.push(index);
    seen.add(value);
  });
  return duplicates;
}

function checkCvReferences(cv: Cv, problems: string[]): void {
  const countryIds = keysOf(cv.countries ?? {});
  const address = cv.person.contact?.address;
  if (address !== undefined) {
    const path = "person.contact.address.country";
    checkReference(address.country, path, countryIds, "unknown country", problems);
  }
  cv.entries.forEach((entry, index) => {
    const path = entryPath(entry, index);
    checkNoDuplicates(entry.skills ?? [], `${path}.skills`, problems);
    checkSkillUsage(entry, path, problems);
    if (entry.kind === "position" && entry.neverOnSite && entry.workMode !== "remote") {
      problems.push(`${path}.neverOnSite: requires workMode "remote"`);
    }
    if (entry.kind !== "project" && entry.location !== undefined) {
      checkPlace(entry.location, `${path}.location`, countryIds, problems);
    }
  });
}

function checkPlace(place: Place, path: string, countryIds: Set<string>, problems: string[]): void {
  const countryPath = `${path}.country`;
  if (!Array.isArray(place.country)) {
    checkReference(place.country, countryPath, countryIds, "unknown country", problems);
    return;
  }
  if (place.country.length < 2) {
    problems.push(`${countryPath}: a list requires at least two countries`);
  }
  if (place.locality) problems.push(`${path}.locality: incompatible with a list of countries`);
  checkReferences(place.country, countryPath, countryIds, "unknown country", problems);
  checkNoDuplicates(place.country, countryPath, problems);
}

function keysOf(map: object): Set<string> {
  return new Set(Object.keys(map));
}

function checkReferences(
  ids: string[],
  path: string,
  knownIds: Set<string>,
  unknownLabel: string,
  problems: string[],
): void {
  ids.forEach((id, index) => {
    checkReference(id, `${path}[${index}]`, knownIds, unknownLabel, problems);
  });
}

function checkReference(
  id: string,
  path: string,
  knownIds: Set<string>,
  unknownLabel: string,
  problems: string[],
): void {
  if (!knownIds.has(id)) problems.push(`${path}: ${unknownLabel} "${id}"`);
}

function checkNoDuplicates(values: string[], path: string, problems: string[]): void {
  for (const index of findDuplicateIndexes(values)) {
    problems.push(`${path}[${index}]: duplicate "${values[index]}"`);
  }
}

function checkSkillUsage(entry: Entry, entryPath: string, problems: string[]): void {
  for (const [name, usage] of Object.entries(entry.skillUsage ?? {})) {
    const path = `${entryPath}.skillUsage.${name}`;
    if (!entry.skills?.includes(name)) problems.push(`${path}: skill absent from the entry skills`);
    if (usage.share !== undefined && !(usage.share > 0 && usage.share <= 1)) {
      problems.push(
        `${path}.share: invalid share ${usage.share}, expected between 0 (excluded) and 1`,
      );
    }
    if (usage.start === undefined) continue;
    if (!checkDateFormat(usage.start, `${path}.start`, YEAR_MONTH, problems)) continue;
    const outOfEntry =
      usage.start < entry.start || (entry.end !== undefined && usage.start > entry.end);
    if (outOfEntry) problems.push(`${path}.start: "${usage.start}" outside the entry period`);
  }
}

/**
 * A target references links and free details by key: a key must name one detail only.
 */
function checkPersonalDetailKeys(cv: Cv, problems: string[]): void {
  const builtIns = new Set(BUILT_IN_PERSONAL_DETAILS);
  const linkKeys = Object.keys(cv.person.contact?.links ?? {});
  for (const key of linkKeys) {
    if (builtIns.has(key)) {
      problems.push(`person.contact.links.${key}: reserved name, choose another key`);
    }
  }
  for (const key of Object.keys(cv.person.details ?? {})) {
    if (builtIns.has(key) || linkKeys.includes(key)) {
      problems.push(`person.details.${key}: name already used by a built-in detail or a link`);
    }
  }
}

/**
 * Projects have their own section and stay out of the taxonomies.
 */
function checkTaxonomies(cv: Cv, problems: string[]): void {
  const entryIds = new Set(
    cv.entries.filter((entry) => entry.kind !== "project").map((entry) => entry.id),
  );
  for (const [taxonomyId, taxonomy] of Object.entries(cv.taxonomies ?? {})) {
    checkTaxonomy(taxonomy, `taxonomies.${taxonomyId}.groups`, entryIds, problems);
  }
}

function checkTaxonomy(
  taxonomy: Taxonomy,
  groupsPath: string,
  entryIds: Set<string>,
  problems: string[],
): void {
  checkUniqueIds(taxonomy.groups, groupsPath, problems);
  const groupIdByMember = new Map<string, string>();
  taxonomy.groups.forEach((group, index) => {
    const membersPath = `${itemPath(groupsPath, index, group.id)}.members`;
    checkReferences(group.members, membersPath, entryIds, "unknown entry or project", problems);
    group.members.forEach((member, memberIndex) => {
      const previousGroupId = groupIdByMember.get(member);
      if (previousGroupId === undefined) {
        groupIdByMember.set(member, group.id);
        return;
      }
      problems.push(
        `${membersPath}[${memberIndex}]: entry "${member}" already in group "${previousGroupId}"`,
      );
    });
  });
}

function checkSummaryMarkers(cv: Cv, problems: string[]): void {
  const allowed = new Set(SUMMARY_MARKERS);
  for (const [summaryKey, summary] of Object.entries(cv.summaries ?? {})) {
    const texts = typeof summary === "string" ? { "": summary } : summary;
    for (const [lang, text] of Object.entries(texts)) {
      const path = lang === "" ? `summaries.${summaryKey}` : `summaries.${summaryKey}.${lang}`;
      for (const [marker] of text.matchAll(MARKER)) {
        if (!allowed.has(marker)) problems.push(`${path}: unknown marker "${marker}"`);
      }
    }
  }
}

function validateTarget(target: Target, cv: Cv, targetDir: string): string[] {
  const problems: string[] = [];
  checkNoEmptyValues(target, "", problems);
  if (!hasLabels(target.lang)) {
    problems.push(`lang: no labels for "${target.lang}", create ${labelsPath(target.lang)}`);
  }
  checkTargetKeys(target, cv, problems);
  checkTargetSections(target, cv, problems);
  checkTargetPersonalDetails(target, cv, problems);
  checkTargetGroups(target, cv, problems);
  checkTargetEntries(target, cv, problems);
  checkTargetLists(target, cv, problems);
  checkTargetSkillGroups(target, cv, problems);
  checkTargetFiles(target, targetDir, problems);
  checkTargetFileName(target, problems);
  if (problems.length === 0) checkTranslations(target, cv, problems);
  return problems;
}

function checkTargetKeys(target: Target, cv: Cv, problems: string[]): void {
  if (target.jobCountry !== undefined) {
    const countryIds = keysOf(cv.countries ?? {});
    checkReference(target.jobCountry, "jobCountry", countryIds, "unknown country", problems);
  }
  checkReference(target.headline, "headline", keysOf(cv.headlines), "unknown headline", problems);
  if (target.summary !== undefined) {
    const summaryIds = keysOf(cv.summaries ?? {});
    checkReference(target.summary, "summary", summaryIds, "unknown summary", problems);
  }
  if (target.taxonomy !== undefined) {
    const taxonomyIds = keysOf(cv.taxonomies ?? {});
    checkReference(target.taxonomy, "taxonomy", taxonomyIds, "unknown taxonomy", problems);
  }
}

/**
 * A shown section requires its content.
 */
function checkTargetSections(target: Target, cv: Cv, problems: string[]): void {
  checkNoDuplicates(target.sections, "sections", problems);
  const requirements: Partial<Record<SectionId, [boolean, string]>> = {
    summary: [target.summary !== undefined, "requires the target's summary"],
    highlights: [(cv.highlights ?? []).length > 0, "requires highlights in the CV"],
    skills: [(target.skillGroups ?? []).length > 0, "requires the target's skillGroups"],
    projects: [cv.entries.some((entry) => entry.kind === "project"), "requires a project entry"],
    education: [(cv.education ?? []).length > 0, "requires education in the CV"],
    certifications: [(cv.certifications ?? []).length > 0, "requires certifications in the CV"],
    languages: [(cv.languages ?? []).length > 0, "requires languages in the CV"],
    publications: [(cv.publications ?? []).length > 0, "requires publications in the CV"],
  };
  for (const section of target.sections) {
    const requirement = requirements[section];
    if (requirement && !requirement[0]) problems.push(`sections: "${section}" ${requirement[1]}`);
  }
}

function checkTargetPersonalDetails(target: Target, cv: Cv, problems: string[]): void {
  const { person } = cv;
  const contact = person.contact ?? {};
  const available: Record<string, boolean> = {
    birthDate: person.birthDate !== undefined,
    age: person.birthDate !== undefined,
    location: contact.address !== undefined,
    postalAddress: contact.address !== undefined,
    phone: contact.phone !== undefined,
    email: contact.email !== undefined,
  };
  for (const key of Object.keys(contact.links ?? {})) available[key] = true;
  for (const key of Object.keys(person.details ?? {})) available[key] = true;
  target.personalDetails.forEach((line, lineIndex) => {
    if (line.length === 0) problems.push(`personalDetails[${lineIndex}]: empty line`);
    line.forEach((detail, index) => {
      const path = `personalDetails[${lineIndex}][${index}]`;
      if (!Object.hasOwn(available, detail)) {
        problems.push(
          `${path}: unknown detail "${detail}", expected a built-in detail, a key of contact.links or of person.details`,
        );
      } else if (!available[detail]) {
        problems.push(`${path}: "${detail}" requires its data in the CV person`);
      }
    });
  });
  checkNoDuplicates(target.personalDetails.flat(), "personalDetails", problems);
}

function checkTargetGroups(target: Target, cv: Cv, problems: string[]): void {
  if (!target.groups) return;
  const taxonomy = target.taxonomy === undefined ? undefined : cv.taxonomies?.[target.taxonomy];
  if (taxonomy === undefined) {
    problems.push("groups: requires a valid taxonomy");
    return;
  }
  const groupIds = new Set(taxonomy.groups.map((group) => group.id));
  for (const groupId of Object.keys(target.groups)) {
    if (groupIds.has(groupId)) continue;
    problems.push(`groups.${groupId}: unknown group in taxonomy "${target.taxonomy}"`);
  }
}

function checkTargetEntries(target: Target, cv: Cv, problems: string[]): void {
  if (!target.entries) return;
  const entriesById = new Map(cv.entries.map((entry) => [entry.id, entry]));
  for (const [entryId, options] of Object.entries(target.entries)) {
    const entry = entriesById.get(entryId);
    if (!entry) {
      problems.push(`entries.${entryId}: unknown entry`);
      continue;
    }
    const entrySkills = new Set(entry.skills);
    for (const key of ["skillPriority", "highlightedSkills"] as const) {
      const names = options[key] ?? [];
      const path = `entries.${entryId}.${key}`;
      checkReferences(names, path, entrySkills, "skill absent from the entry", problems);
      checkNoDuplicates(names, path, problems);
      for (const name of names) {
        if (cv.skills?.[name]?.hiddenByDefault && !target.shownSkills?.includes(name)) {
          problems.push(`${path}: "${name}" is hidden by default, add it to shownSkills`);
        }
      }
    }
    if (options.hideContext && entry.context === undefined) {
      problems.push(`entries.${entryId}.hideContext: the entry has no context`);
    }
    const description = options.description;
    if (typeof description !== "string") continue;
    if (entry.descriptions && Object.hasOwn(entry.descriptions, description)) continue;
    problems.push(`entries.${entryId}.description: no description "${description}" in the entry`);
  }
}

function checkTargetLists(target: Target, cv: Cv, problems: string[]): void {
  const skillNames = new Set(listSkillNames(cv));
  const skillLists = {
    skillPriority: target.skillPriority ?? [],
    shownSkills: target.shownSkills ?? [],
  };
  for (const [path, names] of Object.entries(skillLists)) {
    checkReferences(names, path, skillNames, "unknown skill", problems);
    checkNoDuplicates(names, path, problems);
  }
  const publicationIds = new Set((cv.publications ?? []).map((publication) => publication.id));
  const hiddenPublications = target.hiddenPublications ?? [];
  checkReferences(
    hiddenPublications,
    "hiddenPublications",
    publicationIds,
    "unknown publication",
    problems,
  );
}

function checkTargetSkillGroups(target: Target, cv: Cv, problems: string[]): void {
  const skillNames = new Set(listSkillNames(cv));
  const groups = target.skillGroups ?? [];
  groups.forEach((group, index) => {
    const path = `skillGroups[${index}]`;
    checkReferences(group.skills, `${path}.skills`, skillNames, "unknown skill", problems);
    for (const key of ["withExperience", "highlighted"] as const) {
      const subset = group[key] ?? [];
      const groupSkills = new Set(group.skills);
      checkReferences(
        subset,
        `${path}.${key}`,
        groupSkills,
        "skill absent from the group",
        problems,
      );
      checkNoDuplicates(subset, `${path}.${key}`, problems);
    }
  });
  checkNoDuplicates(
    groups.flatMap((group) => group.skills),
    "skillGroups",
    problems,
  );
}

function checkTargetFiles(target: Target, targetDir: string, problems: string[]): void {
  if (target.photo !== undefined) {
    if (!isSupportedPhoto(target.photo)) {
      problems.push("photo: unsupported format, expected JPEG or PNG");
    } else if (!existsSync(resolve(targetDir, target.photo))) {
      problems.push(`photo: file not found "${target.photo}"`);
    }
  }
  (target.stylesheets ?? []).forEach((path, index) => {
    if (!existsSync(resolve(targetDir, path))) {
      problems.push(`stylesheets[${index}]: file not found "${path}"`);
    }
  });
}

function checkTargetFileName(target: Target, problems: string[]): void {
  if (target.fileName === undefined) return;
  if (!target.fileName.endsWith(".pdf")) problems.push('fileName: must end with ".pdf"');
  for (const [marker] of target.fileName.matchAll(MARKER)) {
    if (!FILE_NAME_MARKERS.has(marker)) problems.push(`fileName: unknown marker "${marker}"`);
  }
}

/**
 * Every text the target shows needs a translation in the target language. Runs after the other
 * checks, on valid references.
 */
function checkTranslations(target: Target, cv: Cv, problems: string[]): void {
  const { lang } = target;
  const sections = new Set(target.sections);
  const check = (value: Text | undefined, path: string) => {
    if (value !== undefined && !hasTranslation(value, lang)) {
      problems.push(`${path}: no "${lang}" translation in the CV`);
    }
  };
  const { person } = cv;
  for (const detail of target.personalDetails.flat())
    check(person.details?.[detail], `person.details.${detail}`);
  check(person.contact?.address?.locality, "person.contact.address.locality");
  for (const [code, name] of Object.entries(cv.countries ?? {})) check(name, `countries.${code}`);
  check(cv.headlines[target.headline], `headlines.${target.headline}`);
  if (sections.has("summary") && target.summary !== undefined) {
    check(cv.summaries?.[target.summary], `summaries.${target.summary}`);
  }
  if (sections.has("highlights")) {
    (cv.highlights ?? []).forEach((highlight, index) => {
      check(highlight, `highlights[${index}]`);
    });
  }
  for (const [name, options] of Object.entries(cv.skills ?? {}))
    check(options.label, `skills.${name}.label`);
  if (sections.has("experience") || sections.has("projects")) {
    cv.entries.forEach((entry, index) => {
      if (target.entries?.[entry.id]?.hidden) return;
      checkEntryTranslations(entry, entryPath(entry, index), check);
    });
  }
  if (sections.has("experience") && target.taxonomy !== undefined) {
    cv.taxonomies?.[target.taxonomy].groups.forEach((group, index) => {
      check(group.label, `taxonomies.${target.taxonomy}.groups[${index}].label`);
    });
  }
  if (sections.has("education")) {
    (cv.education ?? []).forEach((education, index) => {
      check(education.degree, `education[${index}].degree`);
      check(education.institution, `education[${index}].institution`);
    });
  }
  if (sections.has("certifications")) {
    (cv.certifications ?? []).forEach((certification, index) => {
      check(certification.name, `certifications[${index}].name`);
      check(certification.issuer, `certifications[${index}].issuer`);
    });
  }
  if (sections.has("languages")) {
    (cv.languages ?? []).forEach((spoken, index) => {
      check(spoken.language, `languages[${index}].language`);
      check(spoken.level, `languages[${index}].level`);
    });
  }
  if (sections.has("publications")) {
    const hidden = new Set(target.hiddenPublications);
    (cv.publications ?? []).forEach((publication, index) => {
      if (hidden.has(publication.id)) return;
      check(publication.publisher, `${itemPath("publications", index, publication.id)}.publisher`);
    });
  }
}

function checkEntryTranslations(
  entry: Entry,
  path: string,
  check: (value: Text | undefined, path: string) => void,
): void {
  check(entry.context, `${path}.context`);
  for (const [key, items] of Object.entries(entry.descriptions ?? {})) {
    items.forEach((item, index) => {
      check(item, `${path}.descriptions.${key}[${index}]`);
    });
  }
  switch (entry.kind) {
    case "position":
      check(entry.title, `${path}.title`);
      check(entry.organization, `${path}.organization`);
      check(entry.location?.locality, `${path}.location.locality`);
      return;
    case "freelance":
      check(entry.title, `${path}.title`);
      check(entry.location?.locality, `${path}.location.locality`);
      return;
    case "project":
      check(entry.name, `${path}.name`);
      check(entry.role, `${path}.role`);
      return;
    case "activity":
      check(entry.title, `${path}.title`);
      check(entry.organization, `${path}.organization`);
      check(entry.location?.locality, `${path}.location.locality`);
      return;
  }
}
