# ATS-Friendly CV

A starting point for a custom CV generator in a private clone. Generates ATS-friendly CV PDFs from multilingual JSON, one PDF per job offer and language. The source project ships fictional examples; users create their own CV data in their private copy.

## Start every session with the project context

Run `npx -y alignfirst context` from the repository root as your first command, whatever the task. It prints the project conventions (ticket IDs, branch names, commits), the documentation map, and the AlignFirst protocols.

### Conventions

- Ticket IDs: `^\d+$`; without a ticket, use the next `side-N`.
- Branch names: `{TICKET_ID}/{slug-1-3-words}`.
- Commits: `type: summary`. Do not add coding agent attribution or co-author trailers.

## Two Kinds of Tasks

- **Editing a CV.** `cv/` is the default location for user-created `cv.json`, stylesheets and `targets/`; it may not exist yet. Follow `docs/agent-guide.md`. `examples/` holds fictional CVs; edit them only to improve the project.
- **Changing the project.** Code in `src/`, types in `types/`, labels in `labels/`. Read `DEVELOPERS.md`. Test PDFs with temporary copies of fictional examples and throwaway CSS; leave `examples/` and `cv/` untouched for tests.

## Essential Documentation

- `docs/agent-guide.md` — procedures to create, target, translate or review a CV.
- `docs/pdf-style.md` — gather design preferences, author CSS and check the PDF.
- `docs/architecture.md`
- `docs/code-conventions.md`

## Writing

Keep every text clear, concise and short, whether CV content or documentation. Follow the `sharp-writing` skill.

## CV Principles

- The CV speaks in the owner's voice. Propose small edits; never rewrite it in a generic recruiter style.
- Never invent a fact. Every statement must be true today, and a job title is the one held at the time.
- Commit CV data and custom CSS only in the user's private repository. Before pushing personal data, verify the destination is private and belongs to the owner. Never publish it to the source project or send it to another online service without the owner's consent.
- Check the PDF after every change: its pages as images, and its extracted text.

## Generated PDF

- No PDF design or fonts are bundled. Ask the owner about their preferences, write `cv/style.css`, and set `"stylesheets": ["../style.css"]` in each target. PDF generation requires a nonempty list; LinkedIn and skill-years do not.
- The PDF must be ATS-friendly: real, selectable text in reading order, standard section titles. See `docs/ats.md`.
- The appearance: a white background, no gradients. Color only marks tags.
