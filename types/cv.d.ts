export interface Cv {
  person: Person;
  headlines: TextMap;
  summaries?: TextMap; // inline Markdown
  highlights?: Text[]; // key achievements, one per bullet, inline Markdown
  countries?: CountryMap;
  skills?: SkillMap;
  entries: Entry[];
  education?: Education[];
  certifications?: Certification[];
  languages?: SpokenLanguage[];
  publications?: Publication[];
  taxonomies?: TaxonomyMap;
}

/**
 * A text in a single language, or its translations keyed by language code.
 */
export type Text = string | Translations;

export interface Translations {
  [lang: string]: string; // "en": "Software Engineer"
}

export interface TextMap {
  [key: string]: Text;
}

export interface Person {
  firstName: string;
  lastName: string;
  birthDate?: string; // "yyyy-mm-dd"
  contact?: Contact;
  details?: TextMap; // free personal details: "nationality", "driverLicense"…
}

export interface Contact {
  email?: string;
  phone?: string;
  address?: PostalAddress;
  links?: LinkMap;
}

export interface PostalAddress {
  street?: string;
  postalCode?: string;
  locality: Text;
  country: string; // key of `countries`
}

export interface LinkMap {
  [key: string]: string; // "linkedIn": "https://www.linkedin.com/in/jane-doe"
}

export interface CountryMap {
  [code: string]: Text; // "ch": { "en": "Switzerland", "fr": "Suisse" }
}

export interface SkillMap {
  [name: string]: SkillOptions;
}

export interface SkillOptions {
  label?: Text; // translated display name; the key stays the identifier
  hiddenByDefault?: boolean; // omitted from entry keywords unless a target shows it
}

export type Entry = PositionEntry | FreelanceEntry | ProjectEntry | ActivityEntry;

export interface BaseEntry {
  id: string;
  start: string; // "yyyy-mm"
  end?: string; // absent = ongoing
  context?: Text; // inline Markdown, shown before the description unless the target hides it
  descriptions?: DescriptionMap;
  skills?: string[]; // skill names, in default keyword order
  skillUsage?: SkillUsageMap; // adjusts the experience computation
}

export interface DescriptionMap {
  [key: string]: Text[]; // one inline Markdown item per bullet
}

export interface SkillUsageMap {
  [skillName: string]: SkillUsage; // name present in the entry's skills
}

export interface SkillUsage {
  start?: string; // "yyyy-mm", first use within the entry
  share?: number; // part of the time spent on it, between 0 and 1
}

export interface PositionEntry extends BaseEntry {
  kind: "position";
  title: Text;
  organization: Text;
  organizationUrl?: string;
  location?: Place;
  workMode?: WorkMode; // default "onSite"
  neverOnSite?: boolean; // remote only: never went to the organization's place
}

export interface Place {
  locality?: Text;
  country: string | string[]; // key(s) of `countries`; a list spans several countries, without locality
}

export type WorkMode = "remote" | "onSite" | "hybrid";

export interface FreelanceEntry extends BaseEntry {
  kind: "freelance";
  title: Text;
  location?: Place;
  workMode?: WorkMode;
}

export interface ProjectEntry extends BaseEntry {
  kind: "project";
  name: Text;
  url?: string;
  role: Text;
}

export interface ActivityEntry extends BaseEntry {
  kind: "activity";
  title: Text;
  organization?: Text;
  location?: Place;
}

export interface Education {
  start?: string; // "yyyy" or "yyyy-mm"
  end: string;
  degree: Text;
  institution: Text;
}

export interface Certification {
  name: Text;
  issuer: Text;
  date: string; // "yyyy" or "yyyy-mm"
  url?: string;
}

export interface SpokenLanguage {
  language: Text;
  level: Text;
}

export interface Publication {
  id: string;
  kind: PublicationKind;
  title: string; // in the language of the publication, untranslated
  language?: string; // language code of the publication
  date: string; // "yyyy" or "yyyy-mm"
  publisher: Text;
  url?: string;
}

export type PublicationKind = "article" | "book" | "paper" | "talk";

export interface TaxonomyMap {
  [id: string]: Taxonomy;
}

export interface Taxonomy {
  groups: TaxonomyGroup[];
}

export interface TaxonomyGroup {
  id: string;
  label: Text;
  members: string[]; // entry ids
  withoutYears?: boolean; // the group is not a period: no years in its subtitle
}
