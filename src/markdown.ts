import { marked } from "marked";
import type { Typography } from "../types/labels.d.ts";

const NNBSP = " ";
const NBSP = " ";
const NB = "[\\u00a0\\u202f]";
const FRENCH_RULES: TypographyRule[] = [
  { pattern: new RegExp(`(?<!${NB}) ?;`, "g"), replacement: `${NNBSP};` },
  { pattern: new RegExp(`(?<!${NB}) ?!`, "g"), replacement: `${NNBSP}!` },
  { pattern: new RegExp(`(?<!${NB}) ?\\?`, "g"), replacement: `${NNBSP}?` },
  { pattern: new RegExp(`(?<!${NB}) ?:(?!//)`, "g"), replacement: `${NBSP}:` },
  { pattern: new RegExp(`«${NB}? ?(?=\\S)`, "g"), replacement: `«${NNBSP}` },
  { pattern: new RegExp(` ?${NB}?»`, "g"), replacement: `${NNBSP}»` },
];
/**
 * Markdown fragments left untouched by the typography: code spans, link destinations,
 * autolinks and raw HTML tags, bare URLs, HTML entities.
 */
const PROTECTED_MARKDOWN = /`[^`]*`|\]\([^)]*\)|<[^>]*>|https?:\/\/[^\s<>()]+|&#?\w+;/g;
const PLACEHOLDER = /(\d+)/g;

interface TypographyRule {
  pattern: RegExp;
  replacement: string;
}

/**
 * Renders inline Markdown, with the typography of the language.
 */
export function renderInlineMd(src: string, typography: Typography | undefined): string {
  const typographed = typography === "french" ? applyFrenchTypographyToMarkdown(src) : src;
  return marked.parseInline(typographed, { async: false });
}

function applyFrenchTypographyToMarkdown(src: string): string {
  const fragments: string[] = [];
  const masked = src.replace(PROTECTED_MARKDOWN, (fragment) => {
    fragments.push(fragment);
    return `${fragments.length - 1}`;
  });
  return applyFrenchTypography(masked).replace(
    PLACEHOLDER,
    (_, index: string) => fragments[Number(index)],
  );
}

/**
 * Idempotent: adds nothing where a non-breaking space is already present.
 */
function applyFrenchTypography(text: string): string {
  return FRENCH_RULES.reduce(
    (result, rule) => result.replace(rule.pattern, rule.replacement),
    text,
  );
}

/**
 * Renders plain text, with the typography of the language.
 */
export function renderText(text: string, typography: Typography | undefined): string {
  return escapeHtml(typography === "french" ? applyFrenchTypography(text) : text);
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderLink(url: string, labelHtml: string): string {
  return `<a href="${escapeHtml(url)}">${labelHtml}</a>`;
}
