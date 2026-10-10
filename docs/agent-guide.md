---
title: Agent Guide
summary: Procedures for an AI agent that writes, targets, translates or reviews a CV with its owner.
read_when:
  - creating a CV from an existing document
  - adapting a CV to a job offer
  - translating a CV
  - reviewing the content or the layout of a CV
---

# Agent Guide

Work in the owner's private clone. The source project supplies fictional examples; `cv/` is the default location for a CV the user creates, not a directory assumed to exist. Read [CV Data](cv-data.md) and [Targets](targets.md) before editing.

## Principles

- **Facts come from the owner.** Never invent an employer, a date, a number, a skill or an achievement. Ask when a fact is missing.
- **Keep the owner's voice.** Preserve their wording. Propose small edits and explain them; avoid rewriting in a generic recruiter style.
- **True today.** Every statement must still be true. A job title is the one held at the time.
- **Privacy.** Version CV data, targets and custom CSS in the owner's private repository. `cv/` is not gitignored. Before pushing personal data, verify the destination is private and belongs to the owner. Never publish it to the source project or send it to another online service without the owner's consent.
- **Check the result.** After a change, generate the PDF and look at it: render its pages to images, for example with `pdftoppm -png -r 70`, and read them. Check the text extraction as described in [ATS Rules](ats.md#check-a-pdf).

## Create a CV from an Existing Document

The owner provides a PDF, a Word file, a LinkedIn export or plain text.

1. If `cv/` does not exist, copy `examples/starter` there, or `examples/advanced` for a multilingual CV with taxonomies. Both examples are data-only.
2. Read the source. Transfer every fact into `cv/cv.json`: person, positions, education, certifications, languages.
3. Give each entry a short `id`, its months as `yyyy-mm`, and its `skills`. Use one spelling per skill across entries.
4. Split each job description into bullets, one achievement each. Move the presentation of the company into `context`.
5. List the facts the source lacks, such as a missing start month, and ask the owner.
6. Adapt the target in `cv/targets/`. Gather the owner's design preferences and write `cv/style.css` following [PDF Style](pdf-style.md).
7. Set `"stylesheets": ["../style.css"]` in each target, then generate and check the PDF. No PDF design or fonts are bundled.

## Target a Job Offer

1. Read the offer. Save it as `cv/offers/<target-name>.md` for later reference.
2. Copy the closest target to `cv/targets/<target-name>.json`.
3. Pick the `headline` and the `summary` closest to the offer. When none fits, propose a new alternative to the owner.
4. Order `skillGroups` and `skillPriority` to put the skills of the offer first. Use the offer's names when they denote the same skill. Never add a skill the owner lacks.
5. Choose the descriptions. Show the long description for relevant entries; make old or unrelated entries compact.
6. Propose wording changes as new description alternatives, so that the other targets keep theirs.
7. Check that `stylesheets` lists the owner's CSS files. Generate, check the PDF, and report any dropped keywords the command prints.

## Translate

1. Check that `labels/<lang>.json` exists; otherwise create it from `labels/en.json`.
2. Turn each text the targets show into a translation object, keeping the existing language.
3. Keep names, companies and technologies untranslated, as plain strings.
4. Create a target with the new `lang`. The generation lists any missing translation.

## Review

- **Content.** Check that each bullet states one achievement, starts with a verb, and has a number when possible. Flag vague bullets, repeated verbs and unexplained acronyms. Propose; let the owner decide.
- **ATS.** Follow [ATS Rules](ats.md): standard section titles, parsable headings, intact contact details.
- **Length.** Report the page count. Prefer compact entries and hidden old entries over cutting achievements.

## Change the Layout

Ask about the owner's design preferences, then edit their target stylesheets following [PDF Style](pdf-style.md). A deeper change in the code follows [Architecture](architecture.md) and must keep the [ATS Rules](ats.md#layout).
