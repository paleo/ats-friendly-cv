import type { Cv, Entry } from "../types/cv.d.ts";
import type { Labels } from "../types/labels.d.ts";
import type { Target } from "../types/target.d.ts";
import { entryMonthRange, toMonthIndex } from "./dates.ts";
import { formatQuantity } from "./l10n.ts";

/**
 * Returns the months of experience for each skill in the entries, overlaps counted once.
 *
 * A month weighs the `share` of the entry's `skillUsage` (1 by default). When entries overlap, the
 * month keeps its highest weight. The result can be fractional.
 */
export function computeSkillMonths(cv: Cv, today: Date): Map<string, number> {
  const weightsBySkill = collectSkillMonthWeights(cv, today);
  return new Map(listSkillNames(cv).map((name) => [name, sumWeights(weightsBySkill.get(name))]));
}

/**
 * The known skills: those of the entries, then those declared only in the CV's `skills` map.
 */
export function listSkillNames(cv: Cv): string[] {
  return [
    ...new Set([
      ...cv.entries.flatMap((entry) => entry.skills ?? []),
      ...Object.keys(cv.skills ?? {}),
    ]),
  ];
}

function collectSkillMonthWeights(cv: Cv, today: Date): Map<string, Map<number, number>> {
  const weightsBySkill = new Map<string, Map<number, number>>();
  for (const entry of listCountedEntries(cv)) {
    const range = entryMonthRange(entry, today);
    for (const name of entry.skills ?? []) {
      const usage = entry.skillUsage?.[name];
      const first = usage?.start === undefined ? range.first : toMonthIndex(usage.start);
      const share = usage?.share ?? 1;
      const weights = weightsBySkill.get(name) ?? new Map<number, number>();
      for (let month = first; month <= range.last; ++month) {
        weights.set(month, Math.max(weights.get(month) ?? 0, share));
      }
      weightsBySkill.set(name, weights);
    }
  }
  return weightsBySkill;
}

function sumWeights(weights: Map<number, number> | undefined): number {
  let sum = 0;
  for (const weight of weights?.values() ?? []) sum += weight;
  return sum;
}

/**
 * Entries that count in skill experience: `project` entries are excluded.
 */
export function listCountedEntries(cv: Cv): Entry[] {
  return cv.entries.filter((entry) => entry.kind !== "project");
}

/**
 * Returns "N months" under 12 months, the rounded years otherwise. Months can be fractional.
 */
export function formatSkillExperience(months: number, labels: Labels): string {
  const roundedMonths = Math.round(months);
  if (roundedMonths < 12) return formatQuantity(roundedMonths, labels.month);
  return formatQuantity(Math.round(months / 12), labels.year);
}

export function listEntryKeywords(entry: Entry, cv: Cv, target: Target): string[] {
  const skills = entry.skills ?? [];
  const ordered = new Set([
    ...(target.entries?.[entry.id]?.skillPriority ?? []),
    ...(target.skillPriority ?? []),
    ...skills,
  ]);
  return [...ordered].filter(
    (name) =>
      skills.includes(name) &&
      (!cv.skills?.[name]?.hiddenByDefault || target.shownSkills?.includes(name)),
  );
}
