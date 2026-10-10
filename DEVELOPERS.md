# Developing ATS-Friendly CV

ATS-Friendly CV is a starting point for a custom generator in a private clone. Users version their CV data, stylesheets and generator together in their private repository; the source project contains fictional examples only. Start each session with `npx -y alignfirst context`, then read `AGENTS.md` for the content and layout rules.

## Setup

Use npm. `package.json` declares `engines.node: >=24`; select Node 24 with `fnm use 24` (`fnm install 24` if missing).

```sh
npm install
mkdir .plans   # or run npx alignfirst plans setup with the work-files clone
npm run workspace -- setup
```

Workspace setup installs dependencies, generates `dist/types.to.json` with `npm run typeonly`, and installs the Chromium of Playwright. Node runs the TypeScript directly; there is no compilation step, database or environment file. `CV_BROWSER_CHANNEL=chrome` prints with an installed Google Chrome instead.

The project generates files and has no dev server or listening port. Retrieve PDFs and LinkedIn pages from the `output/` directory of the workspace.

## Architecture and Documentation

`src/main.ts` finds the targets, loads and validates each with its CV, resolves the selected language and content, renders HTML, and prints through Playwright. `types/` supplies both the TypeScript types and the TypeOnly runtime schema. `src/linkedin.ts` uses the same resolved content for copyable LinkedIn fields.

Run `npx -y alignfirst docmap` to browse the documentation and `npx -y alignfirst docmap --guide` before editing it.

- [Architecture](docs/architecture.md) — pipeline and module responsibilities.
- [Code Conventions](docs/code-conventions.md) — TypeScript, validation and rendering rules.
- [CV Data](docs/cv-data.md) — the content of `cv.json`.
- [Targets](docs/targets.md) — selecting and adapting content for a job offer.
- [Customization](docs/customization.md) — languages, labels, paper size, file name.
- [PDF Style](docs/pdf-style.md) — owner-authored CSS, renderer hooks and print checks.
- [Skill Experience](docs/skill-experience.md) — computed years per skill.
- [ATS Rules](docs/ats.md) — layout rules and PDF checks.
- [Agent Guide](docs/agent-guide.md) — procedures for an agent editing a CV.

## Development Workflow

`.alignfirst.json` defines GitHub issue numbers, `<ticket-id>/<slug>` branches, Conventional Commits and the `main` base branch. Without an issue, use the next `side-N`. `npx -y alignfirst context` explains the protocols.

`.plans/` holds the AlignFirst work files: a local directory, or a link to the `ats-friendly-cv` folder of a work-files repository through `npx alignfirst plans setup`. Run `npx -y alignfirst sync` after every change there. `.local/` holds local files. Only `.local/` and `.plans/` are gitignored shared directories. User-created `cv/` data and stylesheets are versioned in the private clone and stay per worktree. Dependencies (`node_modules/`), the schema bundle (`dist/`), generated files (`output/`) and runtime logs (`.local-wt/`) stay per worktree.

## Workspaces

A **workspace** is a git worktree with its branch, plus symlinked shared directories. `.local` and `.plans` are shared with the main worktree. Versioned `cv/` files stay per worktree. This project has no dev server.

Run `npm run workspace -- --guide` for the full procedures.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx -y alignfirst docmap --check`. The PDF regression tests require Chromium (`npx playwright install chromium`), or an installed browser selected by `CV_BROWSER_CHANNEL`.

For manual PDF checks, copy the fictional examples into a temporary directory:

```sh
CHECK_DIR=$(mktemp -d)
cp -r examples/starter examples/advanced "$CHECK_DIR/"
```

Create throwaway `style.css` files in both copies and set `"stylesheets": ["../style.css"]` in every copied target. Follow [PDF Style](docs/pdf-style.md); include explicit page margins and test both block and row-flex compact entries. Examples ship as data only. Never modify `examples/` or the owner's `cv/` merely to run checks.

```sh
npm run generate -- "$CHECK_DIR/starter" "$CHECK_DIR/advanced"
```

Read the PDFs visually and extract their text following [ATS Rules](docs/ats.md#check-a-pdf). Check section titles, entry order, contact fields and any dropped keywords. Remove the temporary copies after inspection. `npm run linkedin -- examples/advanced/targets/software-engineer-en.json` checks the LinkedIn renderer; `npm run skill-years -- examples/advanced` checks the skill computation. Neither command requires PDF stylesheets.

For setup changes, also run `npx -y alignfirst doctor` and `aligndev project doctor --root <projects-directory>`, then exercise creation and removal of a throwaway workspace through the workspace CLI.
