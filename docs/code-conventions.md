---
title: Code Conventions
read_when:
  - setting up or verifying the project
  - writing or reviewing code in src/ or types/
---

# Code Conventions

## Setup and Workflow

Use npm and Node.js 24 or later, as declared in `package.json`:

```sh
npm install
npm run typeonly
npx playwright install chromium
```

Read [Architecture](architecture.md) for the generation pipeline and `AGENTS.md` for CV content and privacy rules. The generator has no dev server, listening port, database or environment-file requirement. Generated files go to `output/`.

`alignfirst.json` records Git conventions, the developer guide and plans settings. Keep `.plans` ignored and untracked: use a local directory or preserve its link to the separate work-files repository. Run `npx -y alignfirst sync` after changing plans.

`npx -y alignfirst workspace setup` adopts the current checkout with protocol-ready defaults; it does not run the application setup commands above. Effective `.plans` and usable untracked `.local` are shared; dependencies, generated files and versioned `cv/` data stay per worktree. Runtime files use ignored `.local-wt/`. Run `npx -y alignfirst workspace --guide` for lifecycle procedures; external owners run teardown before deleting a checkout.

## TypeScript Without a Build

Node 24 runs `src/*.ts` directly by stripping the types. The TypeScript compiler only checks (`noEmit`), so:

- Use only erasable syntax (`erasableSyntaxOnly`): no enums, no namespaces, no parameter properties.
- Import local files with their `.ts` extension. Biome enforces it (`useImportExtensions`).

## TypeOnly Types

`types/cv.d.ts`, `types/target.d.ts` and `types/labels.d.ts` are both the TypeScript types and the runtime schema. After changing them, regenerate the bundle `dist/types.to.json` with `npm run typeonly`; the `generate`, `linkedin` and `skill-years` scripts do it first.

A constraint TypeOnly cannot express goes to `validate.ts`, which reports it with the JSON path of the faulty value.

## Style

Follow the `top-down-typescript` skill: callers before helpers, functions over classes.

Biome formats and lints: two-space indent, 100-column lines. Run `npm run lint`, and `npm run lint:fix` to apply fixes.

## Languages

- Code, identifiers, comments and messages are in English.
- A fixed string of the CV belongs in `labels/<lang>.json`, for every shipped language, and in `types/labels.d.ts`.

## Rendering Text

Never insert a CV string into HTML directly. Use the helpers of `markdown.ts`, or their localizing wrappers in `resolve.ts`:

- `renderText` — plain text: escaped, with the typography of the language.
- `renderInlineMd` — inline Markdown, for the summaries, highlights, contexts and descriptions.
- `escapeHtml` — raw values that keep their exact form: names, phone number, URLs.

The French typography adds narrow non-breaking spaces before `;`, `!`, `?`, `»` and after `«`, and a non-breaking space before `:`. It is idempotent and skips code spans, links, URLs and HTML entities.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx -y alignfirst docmap --check`. PDF regression tests require Chromium, or an installed browser selected by `CV_BROWSER_CHANNEL`. For tooling changes, also run `npx -y alignfirst config --json`, `npx -y alignfirst doctor` and `npx -y alignfirst developer-instructions`.

For manual PDF checks, copy the fictional examples into a temporary directory, add throwaway CSS and set `stylesheets` in the copied targets. Follow [PDF Style](pdf-style.md), generate the copies with `npm run generate -- <temporary CV folder>`, then inspect every page image and its extracted text using [ATS Rules](ats.md#check-a-pdf). Leave `examples/` and the owner's `cv/` untouched.
