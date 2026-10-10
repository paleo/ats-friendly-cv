import { type Browser, chromium, type Page } from "playwright";
import type { PaperSize } from "../types/target.d.ts";

const PAGE_WIDTHS: Record<PaperSize, string> = { A4: "210mm", Letter: "8.5in" };

/**
 * A browser channel, such as "chrome", to print with an installed browser instead of the Chromium
 * of Playwright.
 */
const BROWSER_CHANNEL = process.env.CV_BROWSER_CHANNEL || undefined;

/**
 * Keywords dropped from a compact entry so that it stays on one line.
 */
export interface OmittedKeywords {
  headingText: string;
  keywords: string[];
}

export async function printPdf(
  html: string,
  pdfPath: string,
  paperSize: PaperSize,
): Promise<OmittedKeywords[]> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    const omitted = await fitCompactEntries(page, PAGE_WIDTHS[paperSize]);
    await page.pdf({
      path: pdfPath,
      format: paperSize,
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    });
    return omitted;
  } finally {
    await browser.close();
  }
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: BROWSER_CHANNEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot launch the browser. Run "npx playwright install chromium", or set CV_BROWSER_CHANNEL=chrome to use an installed Google Chrome.\n${message}`,
    );
  }
}

/**
 * Row-flex compact entries opt into keyword fitting. Block layouts keep every keyword.
 * Measure at the printed width, using side margins from unqualified `@page` rules.
 */
async function fitCompactEntries(page: Page, pageWidth: string): Promise<OmittedKeywords[]> {
  return page.evaluate((pageWidth) => {
    const pageRules = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter(
        (rule): rule is CSSPageRule => rule instanceof CSSPageRule && rule.selectorText === "",
      );
    let marginLeft = "0px";
    let marginRight = "0px";
    for (const rule of pageRules) {
      if (rule.style.marginLeft !== "") marginLeft = rule.style.marginLeft;
      if (rule.style.marginRight !== "") marginRight = rule.style.marginRight;
    }
    const bodyWidth = document.body.style.width;
    document.body.style.width = `calc(${pageWidth} - ${marginLeft} - ${marginRight})`;
    const omitted: OmittedKeywords[] = [];
    for (const entry of document.querySelectorAll(".entry-compact")) {
      const style = getComputedStyle(entry);
      if (
        (style.display !== "flex" && style.display !== "inline-flex") ||
        style.flexDirection !== "row"
      )
        continue;
      const heading = entry.querySelector("h4");
      const keywords = entry.querySelector(".keywords");
      if (!heading || !keywords) continue;
      const dropped: string[] = [];
      while (isBelow(keywords, heading)) {
        const last = keywords.lastElementChild;
        if (!last?.classList.contains("keyword")) {
          keywords.remove();
          break;
        }
        dropped.unshift(last.textContent ?? "");
        const separator = last.previousElementSibling;
        if (separator?.classList.contains("field-separator")) separator.remove();
        last.remove();
      }
      if (dropped.length > 0)
        omitted.push({ headingText: heading.textContent ?? "", keywords: dropped });
    }
    document.body.style.width = bodyWidth;
    return omitted;

    function isBelow(element: Element, reference: Element): boolean {
      return element.getBoundingClientRect().top >= reference.getBoundingClientRect().bottom;
    }
  }, pageWidth);
}
