import { resolve as resolvePath } from "node:path";
import type {
  Cv,
  Entry,
  Place,
  PositionEntry,
  ProjectEntry,
  TaxonomyGroup,
  Text,
  WorkMode,
} from "../types/cv.d.ts";
import type { Labels, Typography } from "../types/labels.d.ts";
import type { PaperSize, SectionId, Target } from "../types/target.d.ts";
import {
  computeAge,
  countFullYearsSince,
  entryMonthRange,
  formatBirthDate,
  formatEntriesYears,
  formatEntryPeriod,
} from "./dates.ts";
import { fillTemplate, formatQuantity, localize, resolveLabels, typographyOf } from "./l10n.ts";
import { escapeHtml, renderInlineMd, renderLink, renderText } from "./markdown.ts";
import { loadPhotoDataUrl } from "./photo.ts";
import { countryName, formatAddressPlace, formatPlace, type PlaceContext } from "./places.ts";
import { computeSkillMonths, formatSkillExperience, listEntryKeywords } from "./skills.ts";

const DEFAULT_FILE_NAME = "CV - {firstName} {lastName} - {headline} - {LANG}.pdf";
const URL_SCHEME = /^https?:\/\//;
const FILE_NAME_FORBIDDEN = /[/\\:*?"<>|]/g;

/**
 * Personal details computed from the CV. Any other detail is a key of `contact.links` or of
 * `person.details`.
 */
export const BUILT_IN_PERSONAL_DETAILS = [
  "birthDate",
  "age",
  "location",
  "postalAddress",
  "phone",
  "email",
];

/**
 * The summary markers, replaced by computed values.
 */
export const SUMMARY_MARKERS = ["{yearsOfExperience}"];

/**
 * A localized and filtered CV. Fields suffixed with `Html` are ready to insert.
 */
export interface ResolvedCv {
  lang: string;
  paperSize: PaperSize;
  documentTitleHtml: string;
  fileName: string;
  header: ResolvedHeader;
  sections: ResolvedSection[];
}

export interface ResolvedHeader {
  nameHtml: string;
  headlineHtml: string;
  personalDetailLinesHtml: string[];
  photoUrl?: string;
}

export type ResolvedSection =
  | SummarySection
  | HighlightsSection
  | SkillsSection
  | ExperienceSection
  | ProjectsSection
  | LinesSection;

export interface SummarySection {
  id: "summary";
  titleHtml: string;
  summaryHtml: string;
}

export interface HighlightsSection {
  id: "highlights";
  titleHtml: string;
  itemsHtml: string[];
}

export interface SkillsSection {
  id: "skills";
  titleHtml: string;
  groups: ResolvedSkillGroup[];
}

export interface ResolvedSkillGroup {
  labelHtml: string;
  skills: ResolvedSkill[];
}

export interface ResolvedSkill {
  nameHtml: string;
  highlighted: boolean;
  experienceHtml?: string;
}

export interface ExperienceSection {
  id: "experience";
  titleHtml: string;
  groups: ResolvedGroup[];
}

export interface ResolvedGroup {
  /**
   * Absent without taxonomy: the entries then form a single list.
   */
  subtitleHtml?: string;
  entries: ResolvedEntry[];
}

export interface ProjectsSection {
  id: "projects";
  titleHtml: string;
  entries: ResolvedEntry[];
}

export interface ResolvedEntry {
  periodHtml: string;
  titleHtml: string;
  organizationHtml?: string;
  placeHtml?: string;
  /**
   * The place of an organization never visited.
   */
  distantPlace: boolean;
  workModeHtml?: string;
  /**
   * The organization or product presentation, when shown.
   */
  contextHtml?: string;
  /**
   * The chosen description, one item per bullet. Absent for a compact entry.
   */
  descriptionItemsHtml?: string[];
  keywordsLabelHtml: string;
  keywords: ResolvedKeyword[];
}

export interface ResolvedKeyword {
  nameHtml: string;
  highlighted: boolean;
}

export interface LinesSection {
  id: "education" | "certifications" | "languages" | "publications";
  titleHtml: string;
  linesHtml: string[];
}

export interface ResolveOptions {
  today: Date;
  /**
   * The directory of the target file, the base of its relative paths.
   */
  targetDir: string;
}

interface ResolveContext {
  cv: Cv;
  target: Target;
  lang: string;
  labels: Labels;
  typography?: Typography;
  today: Date;
  placeContext: PlaceContext;
}

export function resolveCv(cv: Cv, target: Target, options: ResolveOptions): ResolvedCv {
  const context = createContext(cv, target, options.today);
  const { firstName, lastName } = cv.person;
  const fullName = `${firstName} ${lastName}`;
  const headline = localize(cv.headlines[target.headline], target.lang);
  const fileName = fillTemplate(target.fileName ?? DEFAULT_FILE_NAME, {
    firstName,
    lastName,
    headline,
    lang: target.lang,
    LANG: target.lang.toUpperCase(),
    year: String(options.today.getFullYear()),
  });
  return {
    lang: target.lang,
    paperSize: target.paperSize ?? "A4",
    documentTitleHtml: escapeHtml(`CV – ${fullName} – ${headline}`),
    fileName: fileName.replace(FILE_NAME_FORBIDDEN, "-"),
    header: {
      nameHtml: escapeHtml(fullName),
      headlineHtml: renderText(headline, context.typography),
      personalDetailLinesHtml: resolvePersonalDetailLines(context),
      photoUrl:
        target.photo === undefined
          ? undefined
          : loadPhotoDataUrl(resolvePath(options.targetDir, target.photo)),
    },
    sections: target.sections.map((id) => resolveSection(id, context)),
  };
}

function createContext(cv: Cv, target: Target, today: Date): ResolveContext {
  const labels = resolveLabels(target.lang, target.labels);
  return {
    cv,
    target,
    lang: target.lang,
    labels,
    typography: labels.typography,
    today,
    placeContext: {
      countries: cv.countries ?? {},
      lang: target.lang,
      jobCountry: target.jobCountry,
      foreignPlaceFormat: target.foreignPlaceFormat ?? "localityAndCountry",
    },
  };
}

/**
 * Localizes a text and renders it as plain text.
 */
function text(value: Text, context: ResolveContext): string {
  return renderText(localize(value, context.lang), context.typography);
}

/**
 * Localizes a text and renders it as inline Markdown.
 */
function markdown(value: Text, context: ResolveContext): string {
  return renderInlineMd(localize(value, context.lang), context.typography);
}

function plain(value: string, context: ResolveContext): string {
  return renderText(value, context.typography);
}

function resolvePersonalDetailLines(context: ResolveContext): string[] {
  return context.target.personalDetails.map((line) =>
    line
      .map((detail) => resolvePersonalDetail(detail, context))
      .join(context.labels.detailSeparator),
  );
}

/**
 * Validation guarantees that the data of each detail exists.
 */
function resolvePersonalDetail(detail: string, context: ResolveContext): string {
  const { person } = context.cv;
  const contact = person.contact ?? {};
  const { labels } = context;
  switch (detail) {
    case "birthDate":
      return plain(formatBirthDate(requireValue(person.birthDate), labels), context);
    case "age":
      return plain(
        formatQuantity(computeAge(requireValue(person.birthDate), context.today), labels.age),
        context,
      );
    case "location":
      return plain(
        formatAddressPlace(requireValue(contact.address), context.placeContext),
        context,
      );
    case "postalAddress":
      return plain(formatPostalAddress(context), context);
    case "phone":
      return escapeHtml(requireValue(contact.phone));
    case "email": {
      const email = requireValue(contact.email);
      return renderLink(`mailto:${email}`, escapeHtml(email));
    }
  }
  const url = contact.links?.[detail];
  if (url !== undefined) return renderUrlLink(url);
  return text(requireValue(person.details?.[detail]), context);
}

function requireValue<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing personal detail: run the validation first");
  return value;
}

function formatPostalAddress(context: ResolveContext): string {
  const address = requireValue(context.cv.person.contact?.address);
  const locality = localize(address.locality, context.lang);
  const cityLine = [address.postalCode, locality].filter((part) => part !== undefined).join(" ");
  return [address.street, cityLine, countryName(address.country, context.placeContext)]
    .filter((part) => part !== undefined)
    .join(", ");
}

/**
 * The URL is visible without its scheme, so that a reader of a printed CV, or an ATS, gets it.
 */
function renderUrlLink(url: string): string {
  return renderLink(url, escapeHtml(url.replace(URL_SCHEME, "")));
}

function resolveSection(id: SectionId, context: ResolveContext): ResolvedSection {
  const titleHtml = plain(context.labels.sectionTitles[id], context);
  switch (id) {
    case "summary":
      return { id, titleHtml, summaryHtml: resolveSummary(context) };
    case "highlights":
      return { id, titleHtml, itemsHtml: resolveHighlights(context) };
    case "skills":
      return { id, titleHtml, groups: resolveSkillGroups(context) };
    case "experience":
      return { id, titleHtml, groups: resolveGroups(context) };
    case "projects":
      return { id, titleHtml, entries: resolveProjects(context) };
    case "education":
      return { id, titleHtml, linesHtml: resolveEducation(context) };
    case "certifications":
      return { id, titleHtml, linesHtml: resolveCertifications(context) };
    case "languages":
      return { id, titleHtml, linesHtml: resolveLanguages(context) };
    case "publications":
      return { id, titleHtml, linesHtml: resolvePublications(context) };
  }
}

function resolveSummary(context: ResolveContext): string {
  const { cv, target, lang, today } = context;
  const summary = localize(requireValue(cv.summaries?.[requireValue(target.summary)]), lang);
  const summaryMd = summary.includes("{yearsOfExperience}")
    ? summary.replaceAll(
        "{yearsOfExperience}",
        String(countFullYearsSince(findFirstWorkStart(cv), today)),
      )
    : summary;
  return renderInlineMd(summaryMd, context.typography);
}

/**
 * The start of the earliest position or freelance activity.
 */
export function findFirstWorkStart(cv: Cv): string {
  const starts = cv.entries
    .filter((entry) => entry.kind === "position" || entry.kind === "freelance")
    .map((entry) => entry.start);
  if (starts.length === 0) throw new Error("{yearsOfExperience} requires a position entry");
  return starts.reduce((first, start) => (start < first ? start : first));
}

function resolveHighlights(context: ResolveContext): string[] {
  return (context.cv.highlights ?? []).map((highlight) => markdown(highlight, context));
}

function resolveSkillGroups(context: ResolveContext): ResolvedSkillGroup[] {
  const { cv, target, labels } = context;
  const monthsByName = computeSkillMonths(cv, context.today);
  return (target.skillGroups ?? []).map((group) => ({
    labelHtml: plain(`${group.label}${labels.colon}`, context),
    skills: group.skills.map((name) => ({
      nameHtml: renderSkillName(name, context),
      highlighted: group.highlighted?.includes(name) ?? false,
      experienceHtml: group.withExperience?.includes(name)
        ? plain(formatSkillExperience(monthsByName.get(name) ?? 0, labels), context)
        : undefined,
    })),
  }));
}

/**
 * A skill shows its translated label when the CV gives one, and its name otherwise.
 */
function renderSkillName(name: string, context: ResolveContext): string {
  const label = context.cv.skills?.[name]?.label;
  return label === undefined ? escapeHtml(name) : text(label, context);
}

function resolveGroups(context: ResolveContext): ResolvedGroup[] {
  const { cv, target } = context;
  const workEntries = cv.entries.filter((entry) => entry.kind !== "project");
  if (target.taxonomy === undefined) {
    const entries = listVisibleEntries(workEntries, context);
    return [{ entries: entries.map((entry) => resolveEntry(entry, false, context)) }];
  }
  const entriesById = new Map(workEntries.map((entry) => [entry.id, entry]));
  const taxonomy = requireValue(cv.taxonomies?.[target.taxonomy]);
  return taxonomy.groups.flatMap((group) => {
    const groupOptions = target.groups?.[group.id];
    if (groupOptions?.hidden) return [];
    const members = group.members.flatMap((id) => entriesById.get(id) ?? []);
    const entries = listVisibleEntries(members, context);
    if (entries.length === 0) return [];
    const withoutDescriptions = groupOptions?.withoutDescriptions ?? false;
    return [
      {
        subtitleHtml: resolveGroupSubtitle(group, entries, context),
        entries: entries.map((entry) => resolveEntry(entry, withoutDescriptions, context)),
      },
    ];
  });
}

/**
 * Visible entries, ongoing first, then by end and start, most recent first.
 */
function listVisibleEntries(entries: Entry[], context: ResolveContext): Entry[] {
  return entries
    .filter((entry) => !context.target.entries?.[entry.id]?.hidden)
    .map((entry) => ({ entry, range: entryMonthRange(entry, context.today) }))
    .sort((a, b) => b.range.last - a.range.last || b.range.first - a.range.first)
    .map(({ entry }) => entry);
}

function resolveGroupSubtitle(
  group: TaxonomyGroup,
  entries: Entry[],
  context: ResolveContext,
): string {
  const label = localize(group.label, context.lang);
  if (group.withoutYears) return plain(label, context);
  const years = formatEntriesYears(entries, context.today);
  return plain(`${years}${context.labels.groupSeparator}${label}`, context);
}

function resolveProjects(context: ResolveContext): ResolvedEntry[] {
  const projects = context.cv.entries.filter((entry) => entry.kind === "project");
  return listVisibleEntries(projects, context).map((entry) => resolveEntry(entry, false, context));
}

function resolveEntry(
  entry: Entry,
  withoutDescriptions: boolean,
  context: ResolveContext,
): ResolvedEntry {
  const options = context.target.entries?.[entry.id];
  const highlighted = new Set(options?.highlightedSkills);
  const description = resolveDescription(entry, withoutDescriptions, context);
  // A compact entry has no room for the duration, which its months already give.
  const period = formatEntryPeriod(entry, {
    today: context.today,
    labels: context.labels,
    withDuration: description !== undefined,
  });
  return {
    periodHtml: plain(period, context),
    ...resolveEntryHeading(entry, context),
    contextHtml: description?.contextHtml,
    descriptionItemsHtml: description?.itemsHtml,
    keywordsLabelHtml: plain(`${context.labels.entrySkills}${context.labels.colon}`, context),
    keywords: listEntryKeywords(entry, context.cv, context.target).map((name) => ({
      nameHtml: renderSkillName(name, context),
      highlighted: highlighted.has(name),
    })),
  };
}

interface ResolvedDescription {
  contextHtml?: string;
  itemsHtml: string[];
}

function resolveDescription(
  entry: Entry,
  withoutDescriptions: boolean,
  context: ResolveContext,
): ResolvedDescription | undefined {
  const { target } = context;
  const descriptionKey = chooseDescriptionKey(entry, withoutDescriptions, target);
  if (descriptionKey === undefined) return;
  const items = entry.descriptions?.[descriptionKey];
  if (items === undefined) return;
  const hideContext = target.hideContexts || target.entries?.[entry.id]?.hideContext;
  const entryContext = hideContext ? undefined : entry.context;
  return {
    contextHtml: entryContext === undefined ? undefined : markdown(entryContext, context),
    itemsHtml: items.map((item) => markdown(item, context)),
  };
}

/**
 * Returns the key of the description to show, or `undefined` for a compact entry.
 */
export function chooseDescriptionKey(
  entry: Entry,
  withoutDescriptions: boolean,
  target: Target,
): string | undefined {
  const option = target.entries?.[entry.id]?.description;
  if (option === false) return;
  if (option !== undefined) return option;
  if (withoutDescriptions) return;
  const keys = Object.keys(entry.descriptions ?? {});
  return target.preferredDescriptions?.find((key) => keys.includes(key)) ?? keys[0];
}

interface ResolvedEntryHeading {
  titleHtml: string;
  organizationHtml?: string;
  placeHtml?: string;
  distantPlace: boolean;
  workModeHtml?: string;
}

function resolveEntryHeading(entry: Entry, context: ResolveContext): ResolvedEntryHeading {
  const place = (value: Place | undefined) =>
    value === undefined ? undefined : plain(formatPlace(value, context.placeContext), context);
  switch (entry.kind) {
    case "position":
      return {
        titleHtml: text(entry.title, context),
        organizationHtml: renderOrganization(entry, context),
        placeHtml: place(entry.location),
        distantPlace: entry.neverOnSite ?? false,
        workModeHtml: resolveWorkMode(entry.workMode, context),
      };
    case "freelance":
      return {
        titleHtml: text(entry.title, context),
        organizationHtml: plain(context.labels.freelance, context),
        placeHtml: place(entry.location),
        distantPlace: false,
        workModeHtml: resolveWorkMode(entry.workMode, context),
      };
    case "project":
      return {
        titleHtml: text(entry.role, context),
        organizationHtml: renderProjectName(entry, context),
        distantPlace: false,
      };
    case "activity":
      return {
        titleHtml: text(entry.title, context),
        organizationHtml:
          entry.organization === undefined ? undefined : text(entry.organization, context),
        placeHtml: place(entry.location),
        distantPlace: false,
      };
  }
}

/**
 * Only the remote and hybrid modes are shown.
 */
function resolveWorkMode(
  workMode: WorkMode | undefined,
  context: ResolveContext,
): string | undefined {
  if (workMode === undefined || workMode === "onSite") return;
  return plain(context.labels.workModes[workMode], context);
}

function renderOrganization(entry: PositionEntry, context: ResolveContext): string {
  const organizationHtml = text(entry.organization, context);
  if (entry.organizationUrl === undefined) return organizationHtml;
  return renderLink(entry.organizationUrl, organizationHtml);
}

function renderProjectName(entry: ProjectEntry, context: ResolveContext): string {
  const nameHtml = text(entry.name, context);
  return entry.url === undefined ? nameHtml : renderLink(entry.url, nameHtml);
}

function resolveEducation(context: ResolveContext): string[] {
  const { cv, labels } = context;
  return (cv.education ?? []).map((education) => {
    const degree = localize(education.degree, context.lang);
    const institution = localize(education.institution, context.lang);
    return plain(`${yearOfDate(education.end)}${labels.colon}${degree}, ${institution}`, context);
  });
}

function resolveCertifications(context: ResolveContext): string[] {
  const { cv, labels } = context;
  return [...(cv.certifications ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((certification) => {
      const nameHtml = text(certification.name, context);
      const linkedNameHtml =
        certification.url === undefined ? nameHtml : renderLink(certification.url, nameHtml);
      const yearHtml = plain(`${yearOfDate(certification.date)}${labels.colon}`, context);
      return `${yearHtml}${linkedNameHtml}, ${text(certification.issuer, context)}`;
    });
}

function yearOfDate(date: string): string {
  return date.slice(0, 4);
}

function resolveLanguages(context: ResolveContext): string[] {
  const { cv, labels, lang } = context;
  return (cv.languages ?? []).map((spoken) =>
    plain(
      `${localize(spoken.language, lang)}${labels.colon}${localize(spoken.level, lang)}`,
      context,
    ),
  );
}

/**
 * Most recent first. The title keeps the typography of its own language, and a title in another
 * language than the CV mentions that language.
 */
function resolvePublications(context: ResolveContext): string[] {
  const { cv, target, lang, labels } = context;
  const hidden = new Set(target.hiddenPublications);
  return (cv.publications ?? [])
    .filter((publication) => !hidden.has(publication.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((publication) => {
      const titleLang = publication.language ?? lang;
      const titleHtml = renderText(publication.title, typographyOf(titleLang));
      const linkedTitleHtml =
        publication.url === undefined ? titleHtml : renderLink(publication.url, titleHtml);
      const languageName = labels.languageNames[titleLang];
      const languageHtml =
        titleLang === lang || languageName === undefined
          ? ""
          : ` ${plain(`(${fillTemplate(labels.inLanguage, { language: languageName })})`, context)}`;
      const yearHtml = plain(`${yearOfDate(publication.date)}${labels.colon}`, context);
      const kind = labels.publicationKinds[publication.kind];
      const detailsHtml = plain(`${kind}, ${localize(publication.publisher, lang)}`, context);
      return `${yearHtml}${linkedTitleHtml}${languageHtml}${labels.detailSeparator}${detailsHtml}`;
    });
}
