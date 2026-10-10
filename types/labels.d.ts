/**
 * The fixed strings of a CV in one language, read from `labels/<lang>.json`.
 */
export interface Labels {
  typography?: Typography;
  months: string[]; // January to December
  present: string;
  month: UnitLabels;
  year: UnitLabels;
  age: UnitLabels;
  birthDate: string; // template with "{date}"
  workModes: WorkModeLabels;
  freelance: string;
  entrySkills: string; // label of the keyword line of an entry
  publicationKinds: PublicationKindLabels;
  languageNames: LanguageNameMap;
  inLanguage: string; // template with "{language}", after a title in another language
  colon: string; // between a label and its value
  groupSeparator: string; // between the years and the label of a group
  detailSeparator: string; // between the items of a personal-detail line
  sectionTitles: SectionTitles;
}

export type Typography = "french";

export interface UnitLabels {
  singular: string;
  plural: string;
}

export interface WorkModeLabels {
  remote: string;
  hybrid: string;
}

export interface PublicationKindLabels {
  article: string;
  book: string;
  paper: string;
  talk: string;
}

export interface LanguageNameMap {
  [lang: string]: string; // "fr": "French"
}

export interface SectionTitles {
  summary: string;
  highlights: string;
  skills: string;
  experience: string;
  projects: string;
  education: string;
  certifications: string;
  languages: string;
  publications: string;
}

/**
 * Labels a target overrides. Each object merges with the default labels of the language.
 */
export interface LabelOverrides {
  typography?: Typography;
  months?: string[];
  present?: string;
  month?: UnitLabels;
  year?: UnitLabels;
  age?: UnitLabels;
  birthDate?: string;
  workModes?: WorkModeLabelOverrides;
  freelance?: string;
  entrySkills?: string;
  publicationKinds?: PublicationKindLabelOverrides;
  languageNames?: LanguageNameMap;
  inLanguage?: string;
  colon?: string;
  groupSeparator?: string;
  detailSeparator?: string;
  sectionTitles?: SectionTitleOverrides;
}

export interface WorkModeLabelOverrides {
  remote?: string;
  hybrid?: string;
}

export interface PublicationKindLabelOverrides {
  article?: string;
  book?: string;
  paper?: string;
  talk?: string;
}

export interface SectionTitleOverrides {
  summary?: string;
  highlights?: string;
  skills?: string;
  experience?: string;
  projects?: string;
  education?: string;
  certifications?: string;
  languages?: string;
  publications?: string;
}
