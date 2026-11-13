import * as cheerio from "cheerio";

const BASE_URL = "https://www.last.fm";

/** Attendance path segment; links containing this are excluded. */
const ATTENDANCE_PATH_REGEX = /\/attendance(\/|$)/;

/** Summary of one event row on the user events page. */
export interface EventListItem {
  /** Absolute event or festival detail URL. */
  url: string;
  title: string;
  /** Event date at local midnight (the list shows no time of day). */
  date?: Date;
  venue?: string;
  city?: string;
  country?: string;
  /** Artist names from the lineup line. */
  lineup: string[];
}

/**
 * Parses a Last.fm user events page and extracts event and festival detail page URLs.
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
   * @returns Array of absolute event and festival detail URLs, without attendance links.
   */
  public parse(
    html: string,
    isAllowedUrl: (url: string) => boolean
  ): string[] {
    const $ = cheerio.load(html);
    const urls = new Set<string>();

    $(
      'a[href^="/event/"], a[href^="https://www.last.fm/event/"], ' +
        'a[href^="/festival/"], a[href^="https://www.last.fm/festival/"]'
    ).each(
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

  /**
   * Extracts the summary shown for each event row (title, date, venue, lineup).
   * Used as a fallback when an event's detail page cannot be loaded.
   * @param html - Raw HTML of the user events page.
   * @param isAllowedUrl - Predicate to allow only certain URLs (e.g. last.fm only).
   */
  public parseItems(
    html: string,
    isAllowedUrl: (url: string) => boolean
  ): EventListItem[] {
    const $ = cheerio.load(html);
    const items: EventListItem[] = [];
    const seen = new Set<string>();
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();

    $("tr.events-list-item").each((_, row) => {
      const $row = $(row);
      const link = $row.find(".events-list-item-event--title a[href]").first();
      const href = link.attr("href");
      const title = clean(link.text());
      if (!href || !title) return;

      const url = href.startsWith("http") ? href : `${this._baseUrl}${href}`;
      if (!isAllowedUrl(url) || ATTENDANCE_PATH_REGEX.test(url) || seen.has(url)) return;
      seen.add(url);

      const lineup = clean($row.find(".events-list-item-event--lineup").first().text())
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      items.push({
        url,
        title,
        date: this.parseDate($row.find("time[datetime]").first().attr("datetime")),
        venue: clean($row.find(".events-list-item-venue--title").first().text()) || undefined,
        city: clean($row.find(".events-list-item-venue--city").first().text()) || undefined,
        country: clean($row.find(".events-list-item-venue--country").first().text()) || undefined,
        lineup,
      });
    });

    return items;
  }

  /** Parses the row's datetime ("2026-12-04T00:00:00") as a local date. */
  private parseDate(value: string | undefined): Date | undefined {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return undefined;
    const [, y, m, d] = match.map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
