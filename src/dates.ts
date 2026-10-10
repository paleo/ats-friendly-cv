import type { BaseEntry } from "../types/cv.d.ts";
import type { Labels } from "../types/labels.d.ts";
import { fillTemplate, formatQuantity } from "./l10n.ts";

export interface MonthRange {
  first: number;
  last: number;
}

export interface EntryPeriodOptions {
  today: Date;
  labels: Labels;
  withDuration: boolean;
}

/**
 * Returns "03/2024 – present" for an ongoing entry, and "09/2022 – 11/2023 (15 months)"
 * otherwise, or "09/2022 – 11/2023" without duration. Numeric months are the most reliably
 * parsed by ATS.
 */
export function formatEntryPeriod(entry: BaseEntry, options: EntryPeriodOptions): string {
  const { today, labels, withDuration } = options;
  const start = formatNumericMonth(entry.start);
  if (entry.end === undefined) return `${start} – ${labels.present}`;
  const period = `${start} – ${formatNumericMonth(entry.end)}`;
  if (!withDuration) return period;
  const range = entryMonthRange(entry, today);
  return `${period} (${formatDuration(range.last - range.first + 1, labels)})`;
}

/**
 * Returns "03/2024" for `"2024-03"`.
 */
function formatNumericMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${month}/${year}`;
}

function formatMonthYear(yearMonth: string, labels: Labels): string {
  const monthIndex = toMonthIndex(yearMonth);
  return `${labels.months[monthIndex % 12]} ${yearOf(monthIndex)}`;
}

/**
 * Returns "N months" under 24 months, the rounded years otherwise.
 */
function formatDuration(months: number, labels: Labels): string {
  if (months < 24) return formatQuantity(months, labels.month);
  return formatQuantity(Math.round(months / 12), labels.year);
}

function formatYears(range: MonthRange): string {
  const first = yearOf(range.first);
  const last = yearOf(range.last);
  return first === last ? String(first) : `${first}-${last}`;
}

function yearOf(monthIndex: number): number {
  return Math.floor(monthIndex / 12);
}

/**
 * Returns the years from the oldest start to the latest end of the entries: "2018-2026", or
 * "2026" when both are the same.
 */
export function formatEntriesYears(entries: BaseEntry[], today: Date): string {
  const ranges = entries.map((entry) => entryMonthRange(entry, today));
  return formatYears({
    first: Math.min(...ranges.map((range) => range.first)),
    last: Math.max(...ranges.map((range) => range.last)),
  });
}

/**
 * Returns "Born in July 1990" for `"1990-07-19"`.
 */
export function formatBirthDate(birthDate: string, labels: Labels): string {
  return fillTemplate(labels.birthDate, { date: formatMonthYear(birthDate.slice(0, 7), labels) });
}

/**
 * Returns the full years elapsed since the `"yyyy-mm-dd"` birth date.
 */
export function computeAge(birthDate: string, today: Date): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  return today.getFullYear() - year - (beforeBirthday ? 1 : 0);
}

/**
 * Returns the full years elapsed since the `"yyyy-mm"` month.
 */
export function countFullYearsSince(yearMonth: string, today: Date): number {
  return yearOf(currentMonthIndex(today) - toMonthIndex(yearMonth));
}

/**
 * Bounds are inclusive month indexes. An entry without `end` ends at the current month.
 */
export function entryMonthRange(entry: BaseEntry, today: Date): MonthRange {
  return {
    first: toMonthIndex(entry.start),
    last: entry.end === undefined ? currentMonthIndex(today) : toMonthIndex(entry.end),
  };
}

/**
 * Converts `"yyyy-mm"` to an absolute month index.
 */
export function toMonthIndex(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return year * 12 + month - 1;
}

function currentMonthIndex(today: Date): number {
  return today.getFullYear() * 12 + today.getMonth();
}
