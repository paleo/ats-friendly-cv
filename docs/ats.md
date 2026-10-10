---
title: ATS Rules
summary: What makes the generated PDF parsable by an ATS, and how to check it.
read_when:
  - checking that a generated PDF is ATS-friendly
  - changing render-html.ts or a PDF stylesheet
  - writing CV content for a job offer
---

# ATS Rules

An applicant tracking system (ATS) first extracts the text of the PDF, then splits it into sections, entries and fields: title, organization, dates, skills. A CV that fails the first step is invisible; one that fails the second lands in the wrong fields.

## Layout

The renderer supplies semantic markup, separators and real bullets. The owner-authored [PDF stylesheet](pdf-style.md) must preserve these rules:

- **Real text in reading order.** One column; the HTML order is the reading order. No text in images.
- **Standard section titles**, each on its own line.
- **Embedded fonts with a Unicode map**, so that the extracted text matches the visible text. The PDF is tagged with its language.
- **Explicit separators.** Entry heading fields are separated by a `·`: "03/2022 – present · Senior Software Engineer · Northwind Analytics · Lyon". Without it, "Senior Software Engineer Northwind" reads as one string.
- **Numeric months.** Periods read `09/2022 – 11/2023`. Years alone hide the duration from a parser.
- **Real bullets.** The `•` is a character, so that a parser tells a new bullet from a wrapped line.
- **Labeled keyword lines.** Entry keywords start with "Skills:" and are separated by `·`; a parser then reads them as skills rather than as a sentence.
- **Visible URLs.** Links show their address, without scheme.
- **White background.** Color only marks tags: organizations, places, periods, highlighted keywords.

## Content

- Use the words of the job offer: the same skill names, the same job title when it is true.
- Put one achievement per bullet, with a number when possible.
- Keep the headline and the summary specific to the target.
- Avoid abbreviations a recruiter would not search for.

## Check a PDF

Read the text the way parsers do:

```sh
PDF="output/advanced/software-engineer-en/CV - Jane Doe - Senior Software Engineer - EN.pdf"
pdffonts "$PDF"          # every font embedded, "uni" column at "yes"
pdfinfo "$PDF"           # Tagged: yes
pdftotext -raw "$PDF" -  # content stream order
pdftotext "$PDF" -       # column detection
uvx --from pdfminer.six pdf2txt.py "$PDF"
```

In each output, check that:

- every section title stands on its own line;
- each entry heading reads "period · title · organization · place · work mode" on one line;
- each description and its keywords follow their own heading;
- the email, phone and URLs appear intact.

Online checkers and real application forms that prefill from a CV show which fields a parser recognizes. Upload an anonymized copy: replace the contact details in a copy of the CV folder first.

## Known Limits

- **Compact entries.** With a row-flex design, some extractors (pdfminer, poppler's default mode) read right-aligned keywords as a separate column; some keywords then follow the next heading. A block layout keeps keywords below the heading and disables automatic trimming.
- **Group subtitles.** Some parsers read a taxonomy subtitle, such as "2019-2026 · TypeScript", as a job.
