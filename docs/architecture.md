---
title: Architecture
summary: The generation pipeline from JSON to PDF, and the role of each module.
read_when:
  - changing how the CV is generated
  - locating the module responsible for a piece of output
---

# Architecture

`npm run generate` turns a CV and its targets into PDFs. The entry point is `src/main.ts`; Node runs the TypeScript sources directly, without a build.

## Pipeline

1. **Find** — `targets.ts` expands the arguments into target files: a CV folder gives the files of its `targets/` directory.
2. **Load** — `load.ts` parses the target, its CV and the labels, then checks their shape against the TypeOnly types in `types/`. It reads the bundle `dist/types.to.json`, produced by `npm run typeonly`.
3. **Validate** — `validate.ts` checks what the types cannot express: date formats, unique ids, references between keys, missing translations. It collects every problem, then throws one error listing them.
4. **Resolve** — `resolve.ts` applies the target to the CV and produces a `ResolvedCv`: localized, filtered, ordered, with every text already converted to HTML.
5. **Render** — PDF generation requires a nonempty `target.stylesheets` list. `stylesheets.ts` reads those files relative to the target and inlines them in list order, without rewriting asset URLs. `render-html.ts` assembles the HTML and adds `@page` size from `paperSize`. No PDF style or fonts are bundled; see [PDF Style](pdf-style.md).
6. **Print** — `print-pdf.ts` opens the HTML in Chromium through Playwright and prints a tagged PDF into `output/<CV folder>/<target>/`. Compact entries opt into keyword trimming when their computed display is `flex` or `inline-flex` with `flex-direction: row`. The fitter measures the printed width and drops trailing keywords that wrap below the heading. Block layouts preserve keywords.

## Modules

- `constants.ts` — absolute paths of the project directories.
- `dates.ts` — month indexes, periods, durations, age.
- `l10n.ts` — text localization, and the labels of `labels/<lang>.json` merged with the overrides of a target.
- `linkedin.ts` — the `npm run linkedin` command. It resolves the CV with the long description of every entry, then renders one copyable field per LinkedIn input. Its bundled `linkedin.css` and `linkedin.js` remain inlined; target PDF stylesheets are not required or used.
- `markdown.ts` — HTML escaping, inline Markdown, French typography.
- `photo.ts` — the optional photo of a target, inlined as a data URL.
- `places.ts` — how a place is written, depending on the job country.
- `skills.ts` — years of experience per skill, and keyword ranking.
- `skill-years.ts` — the `npm run skill-years` command, a table of the computed experience. It does not require PDF stylesheets.
- `stylesheets.ts` — requires user CSS for PDF generation and reads it in target order.

## Resolved Model

`ResolvedCv` is the boundary between the data logic and the layout. Fields suffixed with `Html` are escaped and typeset, ready to insert. `render-html.ts` only assembles markup; any decision about content belongs in `resolve.ts`.

## Current Date

Ages, ongoing periods, years of experience and the `{year}` file-name marker depend on the current date. The commands create it once and pass it down as `today`; no other module reads the clock.
