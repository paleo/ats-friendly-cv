---
title: Customization
summary: Languages, labels, PDF stylesheet configuration, paper size and file name.
read_when:
  - adding a language
  - changing a section title or another fixed label
  - changing the style of the PDF
  - changing the name of the PDF file
---

# Customization

## Languages

Each CV language needs a label file, `labels/<lang>.json`, holding the fixed strings of the CV: section titles, months, units, separators. Its type is `Labels` in [types/labels.d.ts](../types/labels.d.ts). English and French ship with the project.

To add a language, copy `labels/en.json` to `labels/<lang>.json` and translate its values. `typography: "french"` adds the non-breaking spaces of French typography. Then add the translations to the CV; the generation lists each missing one.

## Labels of a Target

`labels` in a target overrides some labels for this target only. Each nested object merges with the default labels.

```json
"labels": {
  "sectionTitles": { "projects": "Open source projects" },
  "entrySkills": "Stack"
}
```

Keep standard section titles: an ATS recognizes "Experience", "Education" or "Skills", and may miss a creative title.

## Style

PDF generation requires a nonempty `stylesheets` list in each target. No PDF design or fonts are bundled. Write `cv/style.css`, then set `"stylesheets": ["../style.css"]` in targets under `cv/targets/`.

Files are read relative to the target and inlined in list order. Asset URLs inside CSS are not rewritten or resolved relative to those files. Use self-contained data URLs for fonts; see [PDF Style](pdf-style.md) for the design workflow, renderer hooks and checks.

LinkedIn and skill-years do not require `stylesheets`. The LinkedIn helper keeps its bundled interface CSS, independent of the PDF design.

## Paper Size

`paperSize` in a target is `A4` (the default) or `Letter`. The renderer injects the corresponding `@page` size after the target CSS. Set margins in your stylesheet; see [Margins and Pagination](pdf-style.md#margins-and-pagination).

## File Name

`fileName` in a target is a template for the PDF file name. Its markers are `{firstName}`, `{lastName}`, `{headline}`, `{lang}`, `{LANG}` (upper case) and `{year}` (the current year). The default is:

```text
CV - {firstName} {lastName} - {headline} - {LANG}.pdf
```

## Browser

The PDF is printed by the Chromium of Playwright. Set `CV_BROWSER_CHANNEL=chrome` to use an installed Google Chrome, or `msedge` for Microsoft Edge.
