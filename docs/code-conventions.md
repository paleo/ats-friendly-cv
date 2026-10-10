---
title: Code Conventions
read_when:
  - writing or reviewing code in src/ or types/
---

# Code Conventions

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

Run `npm run typecheck`, `npm run lint` and `npm test`. PDF regression tests require Chromium. Follow [Verification](../DEVELOPERS.md#verification) for manual checks with temporary copies of fictional examples and throwaway CSS; inspect both page images and extracted text.
