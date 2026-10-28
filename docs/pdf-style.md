---
title: PDF Style
summary: Design an owner-authored stylesheet, configure targets and check the printed result.
read_when:
  - creating the first PDF stylesheet for a CV
  - changing fonts, margins or pagination
  - fixing a missing stylesheets error
  - styling renderer classes or compact entries
---

# PDF Style

PDF generation requires a nonempty `target.stylesheets` list. Missing or `[]` stops generation with an error pointing here. The project supplies semantic HTML, but no PDF design or fonts. The fictional examples contain data only. Work in a private clone and version the user's stylesheet with their CV and generator.

## Design with the Owner

1. Read [ATS Rules](ats.md). Ask the owner about typography, density, page count, paper size, tag colors and whether to include a photo. Agree on a single-column design with a white background; color only marks tags.
2. Copy `examples/starter` into `cv/` if that directory does not exist. Preserve an existing owner's CV. Edit the content following [Agent Guide](agent-guide.md).
3. Write `cv/style.css` for the agreed design. Start with readable type, margins, section hierarchy and spacing; then refine tags and compact entries.
4. Set `"stylesheets": ["../style.css"]` in each target under `cv/targets/`. Paths are relative to the target file. Multiple files are inlined in list order, so later rules can override earlier ones.
5. Run `npm run generate -- cv/targets/<target>.json`, inspect every page and its extracted text, then iterate with the owner.

LinkedIn and skill-years can omit `stylesheets`. The LinkedIn helper retains its bundled interface CSS and ignores the PDF stylesheets.

## Renderer Hooks

`src/render-html.ts` is the markup reference. Style these hooks without changing the text order:

| Area | Hooks |
| --- | --- |
| Header | `.cv-header`, `.name` (`h1`), `.headline`, `.personal-details` (`ul`), `.photo` (`img`) |
| Sections | `.section` with `h2`; `.section-summary`, `.section-highlights`, `.section-skills`, `.section-experience`, `.section-projects`, `.section-education`, `.section-certifications`, `.section-languages`, `.section-publications` |
| Experience groups | `.group`, optional `h3` subtitle |
| Entries | `.entry` (`article`), `.entry-compact` when no description, `h4` heading, `.entry-title`, `.context` |
| Heading tags | `.tag`, `.tag-period`, `.tag-organization`, `.tag-place`, `.tag-place-distant`, `.tag-work-mode` |
| Bullets | `.bullets` with `.highlights` or `.description`, `li`, `.bullet` |
| Skills | `.skills` (`ul`), `.skill-group` (`strong`), `.keyword`, `.keyword-highlighted` |
| Entry keywords | `.keywords` (`p`), `.keywords-label`, `.keyword`, `.keyword-highlighted` |
| Other lines | `.lines` (`ul`) for education, certifications, languages and publications |
| Separators | `.field-separator` between entry fields and keywords |

Use ordinary element selectors for summary paragraphs, links, emphasis and list items. There are no predefined CSS variables.

## Text, Lists and Contact Details

Keep text selectable, in DOM reading order, with standard section titles. Avoid CSS columns, visual reordering, text in images and essential text in pseudo-elements. Preserve the real `·` separators, numeric dates, keyword labels and visible URLs.

The renderer already inserts a real `•` in `.bullet`. Disable native markers on `.bullets` to avoid duplicate bullets and give `.bullet` enough space before the text. Reset markers and indentation on `.personal-details`, `.skills` and `.lines` as appropriate.

Keep each `.personal-details li` as its own line. The target joins details within a line with ` – `; preserve these separators and keep email addresses, phone numbers and URLs intact. Add spacing after `.skill-group` and `.keywords-label`, which sit directly before their values.

The optional `.photo` has an empty `alt` and is inlined by the renderer. Set its dimensions and position explicitly, reserve room in `.cv-header`, and check that it neither covers contact text nor changes the reading order. Include it only with the owner's agreement.

## Margins and Pagination

The renderer appends `@page { size: ... }` from the target's `paperSize` (`A4` or `Letter`). Put margins in one plain, unqualified `@page` rule in your CSS. For reliable compact-entry measurement, declare explicit `margin-left` and `margin-right`, preferably in `mm` or `in`. Avoid named pages, page selectors and competing margin rules: the fitter reads top-level, unqualified page rules in order, not the full paged-media cascade.

Reset the body's browser-default margin. Keep headings with the content that follows using `break-after: avoid`; use `break-inside: avoid` selectively on short entries or list items. Applying it to whole long sections can create large gaps or overflow. Check page breaks in both languages and both paper sizes you use. Adjust spacing and content selection before reducing type to an uncomfortable size.

## Compact Entries

An entry without a description has `.entry-compact`. A block layout leaves its keywords below the heading and preserves every keyword.

One-line keyword fitting is opt-in: the entry's computed display must be `flex` or `inline-flex` with `flex-direction: row`. Use wrapping so that a keyword line that does not fit moves below the heading; the fitter then drops trailing keywords until it fits and reports the omissions. Keep the heading and keyword text readable and give the keyword line suitable no-wrap behavior. A column-flex layout does not opt in. This fitter trims keywords, not long headings or arbitrary overflowing content.

Right-aligned keywords can confuse column-detecting extractors. Check both raw and ordinary text extraction; prefer block entries when reading order is unreliable.

## Fonts and Assets

CSS is inlined into an HTML document; relative `url(...)` references are not resolved against the stylesheet's directory. Use self-contained data URLs for font assets. Avoid remote font services: rendering must work without network access or a font-loading race. System fonts depend on the machine and may change line breaks.

Choose a font whose license allows embedding. For a local TTF file, this shell command appends a regular face declaration to your stylesheet:

```sh
FONT_DATA=$(base64 < /path/to/font-regular.ttf | tr -d '\n')
printf '@font-face { font-family: "CV Text"; font-style: normal; font-weight: 400; src: url("data:font/ttf;base64,%s") format("truetype"); }\n' "$FONT_DATA" >> cv/style.css
unset FONT_DATA
```

Set `font-family: "CV Text", sans-serif` on the body. Add separate declarations with the correct weight and style for bold and italic faces you use. For WOFF2, use MIME type `font/woff2` and format `woff2`. Verify accented letters, punctuation and symbols, then check font embedding and Unicode maps in the PDF.

## Check Every PDF

Render every page to an image and inspect it, for example:

```sh
PDF="output/cv/<target>/<file>.pdf"
pdftoppm -png -r 100 "$PDF" /tmp/cv-page
pdffonts "$PDF"
pdfinfo "$PDF"
pdftotext -raw "$PDF" -
pdftotext "$PDF" -
```

Check clipping, overlaps, page breaks, contact spacing, bullet alignment, photo placement and readable type. Confirm embedded fonts with Unicode maps, tagged output, intact contact details and the correct sequence of headings, descriptions and keywords. Review every reported keyword omission. See [ATS Rules](ats.md#check-a-pdf) for another extractor and the full checklist.

For project development, use temporary copies of fictional examples and throwaway CSS as described in [Verification](code-conventions.md#verification). Keep the owner's `cv/` and shipped examples untouched during tests.
