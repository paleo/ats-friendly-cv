---
title: Skill Experience
summary: How the years of experience per skill are computed from the entries.
read_when:
  - a skill shows an unexpected number of years
  - editing skillUsage in a cv.json
  - changing the computation in skills.ts
---

# Skill Experience

The skills section shows a duration for the skills listed in the `withExperience` of a target's skill group. `computeSkillMonths` in `src/skills.ts` deduces it from the entries.

## Computation

Each entry contributes the months of its period, from `start` to `end` inclusive, or to the current month when ongoing. Every month counts for each skill of the entry. `project` entries are excluded: a skill used only in projects counts zero months.

`skillUsage` refines the contribution of one skill in one entry:

- `start` — the skill was adopted during the entry; earlier months are ignored.
- `share` — the part of the time spent on it, between 0 (excluded) and 1. Each month then weighs `share` instead of 1.

When entries overlap, a month counts once, with its highest weight. The total can be fractional.

## Display

- Under 12 months (after rounding): "N months".
- Otherwise: the rounded years, "N years".

Entry periods use another threshold: `formatEntryPeriod` in `dates.ts` shows months under 24.

## Checking the Result

```sh
npm run skill-years -- examples/advanced
```

It prints every skill, sorted by experience, with the months, the rounded years, the number of counted entries and the `hiddenByDefault` flag.
