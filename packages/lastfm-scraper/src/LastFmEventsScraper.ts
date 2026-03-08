import { IHtmlFetcher } from "./IHtmlFetcher";
import { LastFmEvent } from "./LastFmEvent";
import { LastFmHtmlFetcher } from "./LastFmHtmlFetcher";
import { EventListParser } from "./EventListParser";
import { EventDetailParser } from "./EventDetailParser";

const BASE_URL = "https://www.last.fm";

/**
 * Orchestrates scraping of a Last.fm user's events: fetches the user events page,
 * parses event links, then fetches and parses each event detail page.
 */
export class LastFmEventsScraper {
  private readonly _fetcher: IHtmlFetcher;
  private readonly _listParser: EventListParser;
  private readonly _detailParser: EventDetailParser;
  private readonly _baseUrl: string;

  /**
   * @param fetcher - Used to fetch HTML; must allow only last.fm URLs (SSRF-safe).
   * @param listParser - Parses the user events list page.
   * @param detailParser - Parses each event detail page.
   * @param baseUrl - Base URL for Last.fm (default https://www.last.fm).
   */
  public constructor(
    fetcher: IHtmlFetcher,
    listParser?: EventListParser,
    detailParser?: EventDetailParser,
    baseUrl: string = BASE_URL
  ) {
    this._fetcher = fetcher;
    this._listParser = listParser ?? new EventListParser(baseUrl);
    this._detailParser = detailParser ?? new EventDetailParser();
    this._baseUrl = baseUrl;
  }

  /**
   * Scrapes all upcoming events for the given Last.fm username.
   * Only event links that pass the same URL policy as LastFmHtmlFetcher are followed.
   * @param username - Last.fm username.
   * @returns Events sorted by start date (when present).
   */
  public async scrape(username: string): Promise<LastFmEvent[]> {
    const listUrl = `${this._baseUrl}/user/${encodeURIComponent(username)}/events`;
    const html = await this._fetcher.fetch(listUrl);
    const eventUrls = this._listParser.parse(html, (url) =>
      LastFmHtmlFetcher.isAllowedUrl(url)
    );

    const events: LastFmEvent[] = [];
    for (const eventUrl of eventUrls) {
      try {
        const detailHtml = await this._fetcher.fetch(eventUrl);
        const event = this._detailParser.parse(detailHtml, eventUrl);
        if (event) events.push(event);
      } catch {
        // Skip individual failures; caller can log if needed
      }
    }

    this.sortByStartDate(events);
    return events;
  }

  private sortByStartDate(events: LastFmEvent[]): void {
    events.sort((a, b) => {
      if (!a.startsAt && !b.startsAt) return 0;
      if (!a.startsAt) return 1;
      if (!b.startsAt) return -1;
      return a.startsAt.getTime() - b.startsAt.getTime();
    });
  }
}
