import type { Cv } from "../types/cv.d.ts";
import { listCountedEntries, computeSkillMonths } from "./skills.ts";
import { listTargetPaths, loadValidTarget } from "./targets.ts";

const COLUMNS: Column[] = [
  { header: "skill", align: "left" },
  { header: "months", align: "right" },
  { header: "years", align: "right" },
  { header: "entries", align: "right" },
  { header: "hiddenByDefault", align: "left" },
];

interface Column {
  header: string;
  align: "left" | "right";
}

main();

function main(): void {
  try {
    const [targetPath] = listTargetPaths(process.argv.slice(2));
    const { cv } = loadValidTarget(targetPath);
    console.log(formatTable(buildRows(cv, new Date())));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("Usage: npm run skill-years -- [<CV folder or target file>]");
    process.exitCode = 1;
  }
}

function buildRows(cv: Cv, today: Date): string[][] {
  const countedEntries = listCountedEntries(cv);
  const months = computeSkillMonths(cv, today);
  return [...months]
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => [
      name,
      String(Math.round(count)),
      String(Math.round(count / 12)),
      String(countedEntries.filter((entry) => entry.skills?.includes(name)).length),
      cv.skills?.[name]?.hiddenByDefault ? "x" : "",
    ]);
}

function formatTable(rows: string[][]): string {
  const lines = [COLUMNS.map((column) => column.header), ...rows];
  const widths = COLUMNS.map((_, index) => Math.max(...lines.map((line) => line[index].length)));
  return lines
    .map((line) =>
      line
        .map((cell, index) => {
          const width = widths[index];
          return COLUMNS[index].align === "left" ? cell.padEnd(width) : cell.padStart(width);
        })
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}
