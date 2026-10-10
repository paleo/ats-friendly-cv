---
title: Targets
summary: How a target file adapts the CV to a job offer, and how to write one.
read_when:
  - targeting a new job offer
  - editing a file in a targets/ directory
  - changing how resolve.ts applies a target
---

# Targets

A target is a JSON file in the `targets/` directory of a CV folder, one per job offer and language. Its type is `Target` in [types/target.d.ts](../types/target.d.ts). Its file name, without extension, names the output folder `output/<CV folder>/<target>/`.

Paths in a target are relative to the target file. The CV is `../cv.json` unless `cv` says otherwise.

## Target a New Job Offer

1. Copy an existing target.
2. Set `lang`, and `jobCountry` for a job in a given country (see [Places](#places)).
3. Choose the `headline` and the `summary` among the keys of `headlines` and `summaries` in the CV.
4. Order `sections`, and group `personalDetails` into lines.
5. Define `skillGroups` for the skills section, and `skillPriority` for the entry keywords. Put first the skills of the offer.
6. Choose the descriptions (see [Descriptions](#descriptions)).
7. Set `stylesheets` to a nonempty list of CSS paths, such as `["../style.css"]`; see [PDF Style](pdf-style.md).
8. Run `npm run generate -- <target file>` and inspect its pages and extracted text.

When no text fits the offer, add an alternative to the CV: a key in `headlines`, `summaries`, or the `descriptions` of an entry. The generation fails with a precise message when a target references a missing key.

## Sections

`sections` sets the order and the visibility of `summary`, `highlights`, `skills`, `experience`, `projects`, `education`, `certifications`, `languages` and `publications`. Entries run from the most recent.

Optional `taxonomy` groups the experience; see [CV Data](cv-data.md#taxonomies). `groups.<id>.hidden` hides a group of the taxonomy.

## Personal Details

`personalDetails` is an array of lines. Each line lists details, joined by ` – `. A detail is one of:

- a built-in detail: `location` (the locality and the country of the address), `postalAddress`, `phone`, `email`, `birthDate`, `age`;
- a key of the CV's `contact.links`, shown as its URL without scheme;
- a key of the CV's `person.details`.

```json
"personalDetails": [["location", "phone", "email"], ["linkedIn", "gitHub"]]
```

`photo` adds a JPEG or PNG image with class `.photo`. The stylesheet controls its size and position. An ATS ignores it.

## Skills

`skillGroups` defines the skills section. Each group has a `label` in the target language and an ordered list of `skills`. Optional `withExperience` selects which of them display a computed duration, and optional `highlighted` which ones receive the `.keyword-highlighted` CSS class.

```json
"skillGroups": [
  {
    "label": "Backend",
    "skills": ["Node.js", "PostgreSQL", "Docker"],
    "withExperience": ["Node.js"],
    "highlighted": ["Node.js"]
  }
]
```

Every skill name is one known by the CV, with the exact spelling.

## Descriptions

For each entry, the description is chosen in this order:

1. `entries.<id>.description`: a key of the entry's `descriptions`, or `false` for none.
2. No description when the entry's group has `withoutDescriptions`.
3. The first key of `preferredDescriptions` that the entry has.
4. The entry's first description key.

An entry without description receives `.entry-compact`, and its period omits the duration. A stylesheet can opt into one-line fitting with computed `display: flex` or `inline-flex` and `flex-direction: row`. The generator drops trailing keywords that wrap below the heading and reports them. A block layout preserves all keywords; see [Compact Entries](pdf-style.md#compact-entries).

The entry's `context` precedes the description. `hideContexts` hides every context, and `entries.<id>.hideContext` hides one. An entry without description shows no context.

`entries.<id>.hidden` hides an entry, and `hiddenPublications` hides publications by id.

## Keywords

Entry keywords follow `entries.<id>.skillPriority`, then the target-wide `skillPriority`, then the entry's own order. Priorities reorder skills already present in the entry.

Skills marked `hiddenByDefault` in the CV are omitted unless the target lists them in `shownSkills`.

`entries.<id>.highlightedSkills` marks selected keywords of an entry with `.keyword-highlighted`; the stylesheet defines their appearance.

```json
"entries": {
  "northwind": {
    "description": "long",
    "skillPriority": ["AWS", "PostgreSQL"],
    "highlightedSkills": ["AWS"]
  }
}
```

## Places

In the job country, a place shows its locality alone. Abroad, `foreignPlaceFormat` chooses between `localityAndCountry` ("Geneva, Switzerland", the default) and `country` ("Switzerland"). Without `jobCountry`, every place counts as abroad. A place without locality shows its country.

## Output

`paperSize` is `A4` (the default) or `Letter`. `fileName` and `labels` customize the output; see [Customization](customization.md).

PDF generation requires nonempty `stylesheets`. Missing or `[]` produces an error pointing to [PDF Style](pdf-style.md). CSS files are relative to the target and inlined in list order; asset URLs inside them are not rewritten. LinkedIn and skill-years can omit this field.

## Validation

The generation rejects unknown references, duplicate selections, empty lines, a section without content, personal details absent from the CV, and missing translations in the target language.
