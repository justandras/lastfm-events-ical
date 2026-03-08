import * as cheerio from "cheerio";

const BASE_URL = "https://www.last.fm";

/** Attendance path segment; links containing this are excluded. */
const ATTENDANCE_PATH_REGEX = /\/attendance(\/|$)/;

/**
 * Parses a Last.fm user events page and extracts event detail page URLs.
 * Only returns URLs that are allowed for fetching (same host as BASE_URL).
 */
export class EventListParser {
  private readonly _baseUrl: string;

  public constructor(baseUrl: string = BASE_URL) {
    this._baseUrl = baseUrl;
  }

  /**
   * Extracts event page URLs from the user's events list HTML.
   * @param html - Raw HTML of the user events page.
   * @param isAllowedUrl - Predicate to allow only certain URLs (e.g. last.fm only).
   * @returns Array of absolute event detail URLs, without attendance links.
   */
  public parse(
    html: string,
    isAllowedUrl: (url: string) => boolean
  ): string[] {
    const $ = cheerio.load(html);
    const urls = new Set<string>();

    $('a[href^="/event/"], a[href^="https://www.last.fm/event/"]').each(
      (_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const absolute = href.startsWith("http") ? href : `${this._baseUrl}${href}`;
        if (!isAllowedUrl(absolute)) return;
        if (ATTENDANCE_PATH_REGEX.test(absolute)) return;

        urls.add(absolute);
      }
    );

    return Array.from(urls);
  }
}
