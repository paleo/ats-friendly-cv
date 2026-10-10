# ATS-Friendly CV

Build your own CV generator with a coding agent in a private clone of this repository.

- **One source, many CVs.** A small target file per job offer picks the language, the headline, the sections, the skills and the descriptions to show.
- **Built for ATS parsers.** Real selectable text in reading order, standard section titles, tagged PDF, numeric dates, explicit separators between fields. The agent checks the layout and fonts against [ATS Rules](docs/ats.md).
- **Multilingual.** Keep several languages in the same CV. English and French labels ship with the project.
- **Your design.** The agent creates the PDF stylesheet around your preferences. No PDF design or fonts are bundled.
- **LinkedIn helper.** A page with one copyable field per LinkedIn input.

## Getting Started

Clone the repository, then open it in Claude Code, Codex or another coding agent:

```sh
git clone https://github.com/paleo/ats-friendly-cv.git
cd ats-friendly-cv
```

Give your agent your existing CV and ask:

> My old CV: `/path/to/my/cv.docx` (or PDF or whatever you have)
>
> Set up this project and create a first draft of my new CV. Ask me about the design, build my stylesheet, then generate and check the PDF.
>
> Help me configure my own private repository before pushing anything.

## Generate a CV

Ask your agent:

> Create a CV tailored to this job offer: …

## License

[CC0 1.0](LICENSE): public domain. Use, modify and share without conditions.
