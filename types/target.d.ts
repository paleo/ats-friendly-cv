import type { LabelOverrides } from "./labels.d.ts";

export interface Target {
  lang: string; // language code, with a file in `labels/`
  cv?: string; // path of the CV, relative to the target file; default "../cv.json"
  fileName?: string; // PDF file name template, see docs/targets.md
  paperSize?: PaperSize; // default "A4"
  stylesheets?: string[]; // custom CSS in order, relative to the target; at least one required for PDF
  jobCountry?: string; // key of `countries`; absent = international position
  foreignPlaceFormat?: "localityAndCountry" | "country"; // default "localityAndCountry"
  headline: string; // key of `headlines`
  summary?: string; // key of `summaries`
  taxonomy?: string; // key of `taxonomies`; absent = a single list of entries
  sections: SectionId[]; // order and visibility
  personalDetails: string[][]; // one array per displayed line
  photo?: string; // JPEG or PNG, relative to the target file
  skillGroups?: TargetSkillGroup[];
  skillPriority?: string[]; // order of the entry keywords
  shownSkills?: string[]; // shows skills `hiddenByDefault`
  preferredDescriptions?: string[]; // keys of `descriptions`, by preference
  hideContexts?: boolean; // hides every `context`
  groups?: TargetGroupMap;
  entries?: TargetEntryMap;
  hiddenPublications?: string[];
  labels?: LabelOverrides;
}

export type PaperSize = "A4" | "Letter";

export type SectionId =
  | "summary"
  | "highlights"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "languages"
  | "publications";

export interface TargetSkillGroup {
  label: string; // in the target language
  skills: string[];
  withExperience?: string[]; // subset of skills, with computed years
  highlighted?: string[]; // subset of skills marked with .keyword-highlighted
}

export interface TargetGroupMap {
  [groupId: string]: TargetGroupOptions;
}

export interface TargetGroupOptions {
  hidden?: boolean;
  withoutDescriptions?: boolean;
}

export interface TargetEntryMap {
  [entryId: string]: TargetEntryOptions;
}

export interface TargetEntryOptions {
  hidden?: boolean;
  description?: string | false; // false = no description
  hideContext?: boolean;
  skillPriority?: string[]; // before the target-wide priority
  highlightedSkills?: string[]; // entry keywords marked with .keyword-highlighted
}
