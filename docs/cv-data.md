---
title: CV Data
summary: The content of cv.json, and the consistency rules it must satisfy.
read_when:
  - writing or editing a cv.json file
  - changing types/cv.d.ts or the CV checks in validate.ts
---

# CV Data

A CV folder holds the exhaustive CV in `cv.json`, and one target per job offer in `targets/`. Its type is `Cv` in [types/cv.d.ts](../types/cv.d.ts), the reference for every field. A target then selects and orders what is shown.

## Texts and Languages

A text is a plain string, or an object of translations keyed by language code:

```json
"title": "Software Engineer"
"title": { "en": "Software Engineer", "fr": "Ingénieure logicielle" }
```

A plain string serves every language. Names, technologies and company names usually stay plain. A target in a language requires the translation of every text it shows; the generation lists each missing one.

The summaries, highlights, entry contexts and descriptions accept inline Markdown: `_italic_`, `**bold**`, `[link](https://…)`. The other texts are plain.

## Alternatives

Some fields are maps of alternatives, keyed by a free name: `headlines`, `summaries`, and the `descriptions` of each entry. A target picks one alternative by its key. For example, an entry can have a `long` and a `short` description.

## Person

`firstName` and `lastName` are required. Every other field is optional:

- `birthDate` — `yyyy-mm-dd`, for the `birthDate` and `age` details.
- `contact.email`, `contact.phone`.
- `contact.address` — `locality` and `country` are required, `street` and `postalCode` optional.
- `contact.links` — URLs by key, such as `linkedIn`, `gitHub` or `website`.
- `details` — free texts by key, such as `nationality` or `driverLicense`.

A target shows these details by name; see [Targets](targets.md#personal-details). Many countries discourage the birth date, the age, the marital status and the photo on a CV.

## Entries

`entries` lists the experience. The `kind` field selects one of four shapes:

- `position` — a job: `title`, `organization`, optional `organizationUrl`, `location` and `workMode`.
- `freelance` — a freelance activity: `title`, optional `location` and `workMode`.
- `project` — a project, such as open source: `name`, `role`, optional `url`. Projects have their own section.
- `activity` — anything else, such as volunteering or a sabbatical: `title`, optional `organization` and `location`.

Every entry has a unique `id`. `start` and `end` use `yyyy-mm`; an entry without `end` is ongoing.

`workMode` is `onSite` (the default, not shown), `remote` or `hybrid`. On a remote position, `neverOnSite: true` marks the place of an organization never visited with `.tag-place-distant`; the stylesheet controls its appearance.

The optional `context` presents the organization or the product in one sentence. It precedes the description, which must read well without it, since a target can hide it.

`descriptions` maps a key to a list of bullets. Put one achievement in each bullet, with numbers when possible.

## Skills

`skills` lists the skills used in an entry: technologies, tools, methods, soft skills. Names are identifiers: use the same spelling and case everywhere. Their order is the default keyword order.

The top-level `skills` map declares options for some skills:

- `label` — a translated display name, such as `{ "en": "Mentoring", "fr": "Mentorat" }`. The key stays the identifier.
- `hiddenByDefault` — omitted from entry keywords, unless a target shows it. Useful for obvious skills.

The known skills are those of the entries plus the keys of this map. A skill declared only in the map, such as a language you speak or a soft skill, can appear in a target's skill groups.

`skillUsage` adjusts the experience computed for a skill of an entry; see [Skill Experience](skill-experience.md).

## Places and Countries

`countries` maps a short code to the country name, such as `"ch": { "en": "Switzerland", "fr": "Suisse" }`. Places and the postal address refer to these codes.

A place has a `country` and an optional `locality`. A place spanning several countries lists their codes in `country`, without locality.

## Other Sections

- `highlights` — key achievements, one per bullet.
- `education` — `degree`, `institution`, `end`, optional `start`. Dates are `yyyy` or `yyyy-mm`.
- `certifications` — `name`, `issuer`, `date`, optional `url`.
- `languages` — `language` and `level`.
- `publications` — `id`, `kind` (`article`, `book`, `paper` or `talk`), `title`, `date`, `publisher`, optional `language` and `url`. The title stays in its original language; when it differs from the CV, the language follows it, such as "(in French)".

## Taxonomies

A taxonomy splits the experience into titled groups, for example by technology era, domain or role. A CV can define several; a target picks one. Without taxonomy, the experience is a single list.

Each group has an `id`, a `label` and the `members` ids. Its subtitle starts with the years its entries span; `withoutYears` drops them, for a group such as "Other experience". Within a taxonomy, an entry belongs to one group at most, and an entry absent from every group is not shown. Projects stay out of taxonomies.

## Summary Marker

A summary may contain `{yearsOfExperience}`, replaced by the full years since the earliest `position` or `freelance` start.

## Consistency Checks

Besides the shape, `validate.ts` rejects:

- blank strings, empty lists and empty translation objects;
- malformed dates, and a `start` later than its `end`;
- duplicate ids among entries, publications, and the groups of a taxonomy;
- unknown country codes, and duplicate skills in an entry;
- `neverOnSite` without the `remote` work mode;
- a `skillUsage` on a skill absent from the entry, a `share` outside ]0, 1], or a `start` outside the entry period;
- a link or detail key that reuses a built-in detail name, or each other;
- a taxonomy member that is unknown, a project, or already in another group;
- a summary marker other than `{yearsOfExperience}`.
