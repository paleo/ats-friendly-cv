import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Text } from "../types/cv.d.ts";
import type { LabelOverrides, Labels, Typography, UnitLabels } from "../types/labels.d.ts";
import { labelsDir } from "./constants.ts";
import { loadLabels } from "./load.ts";

const labelsByLang = new Map<string, Labels>();

/**
 * Returns the text in the language. Validation checks the translations beforehand.
 */
export function localize(text: Text, lang: string): string {
  if (typeof text === "string") return text;
  const value = text[lang];
  if (value === undefined)
    throw new Error(`Missing "${lang}" translation in ${JSON.stringify(text)}`);
  return value;
}

export function hasTranslation(text: Text, lang: string): boolean {
  return typeof text === "string" || Object.hasOwn(text, lang);
}

export function labelsPath(lang: string): string {
  return join(labelsDir, `${lang}.json`);
}

export function hasLabels(lang: string): boolean {
  return existsSync(labelsPath(lang));
}

/**
 * The labels of `labels/<lang>.json`, with the overrides of a target merged in.
 */
export function resolveLabels(lang: string, overrides: LabelOverrides = {}): Labels {
  const labels = getLabels(lang);
  return {
    ...labels,
    ...overrides,
    workModes: { ...labels.workModes, ...overrides.workModes },
    publicationKinds: { ...labels.publicationKinds, ...overrides.publicationKinds },
    languageNames: { ...labels.languageNames, ...overrides.languageNames },
    sectionTitles: { ...labels.sectionTitles, ...overrides.sectionTitles },
  };
}

/**
 * The typography of a language without labels is left untouched.
 */
export function typographyOf(lang: string): Typography | undefined {
  return hasLabels(lang) ? getLabels(lang).typography : undefined;
}

function getLabels(lang: string): Labels {
  let labels = labelsByLang.get(lang);
  if (labels === undefined) {
    if (!hasLabels(lang)) {
      throw new Error(`No labels for language "${lang}": create ${labelsPath(lang)}`);
    }
    labels = loadLabels(labelsPath(lang));
    labelsByLang.set(lang, labels);
  }
  return labels;
}

export function formatQuantity(count: number, unit: UnitLabels): string {
  return `${count} ${count === 1 ? unit.singular : unit.plural}`;
}

/**
 * Replaces each `{name}` of the template.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (marker, name: string) => values[name] ?? marker);
}
