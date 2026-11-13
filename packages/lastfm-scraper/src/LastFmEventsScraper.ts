import { IHtmlFetcher } from "./IHtmlFetcher";
import { LastFmEvent } from "./LastFmEvent";
import { LastFmHtmlFetcher } from "./LastFmHtmlFetcher";
import { EventListItem, EventListParser } from "./EventListParser";
import { EventDetailParser } from "./EventDetailParser";

const BASE_URL = "https://www.last.fm";

/** Optional hooks for LastFmEventsScraper. */
export interface LastFmEventsScraperOptions {
  /**
   * Called when an event detail page fails to load or parse. The event is then built from
   * the events list (marked incomplete) when possible, so this is for logging only.
   */
  onEventPageError?: (url: string, error: unknown) => void;
}

/**
 * Orchestrates scraping of a Last.fm user's events: fetches the user events page,
 * parses event links, then fetches and parses each event detail page.
 */
export class LastFmEventsScraper {
  private readonly _fetcher: IHtmlFetcher;
  private readonly _listParser: EventListParser;
  private readonly _detailParser: EventDetailParser;
  private readonly _baseUrl: string;
  private readonly _onEventPageError?: (url: string, error: unknown) => void;

  /**
   * @param fetcher - Used to fetch HTML; must allow only last.fm URLs (SSRF-safe).
   * @param listParser - Parses the user events list page.
   * @param detailParser - Parses each event detail page.
   * @param baseUrl - Base URL for Last.fm (default https://www.last.fm).
   * @param options - Optional hooks (e.g. error logging).
   */
  public constructor(
    fetcher: IHtmlFetcher,
    listParser?: EventListParser,
    detailParser?: EventDetailParser,
    baseUrl: string = BASE_URL,
    options?: LastFmEventsScraperOptions
  ) {
    this._fetcher = fetcher;
    this._listParser = listParser ?? new EventListParser(baseUrl);
    this._detailParser = detailParser ?? new EventDetailParser();
    this._baseUrl = baseUrl;
    this._onEventPageError = options?.onEventPageError;
  }

  /**
   * Scrapes all upcoming events for the given Last.fm username.
   * Only event links that pass the same URL policy as LastFmHtmlFetcher are followed.
   * When an event's detail page fails (e.g. a CDN bot challenge), the event is built from
   * the events list instead and marked `incomplete`.
   * @param username - Last.fm username.
   * @returns Events sorted by start date (when present).
   */
  public async scrape(username: string): Promise<LastFmEvent[]> {
    const listUrl = `${this._baseUrl}/user/${encodeURIComponent(username)}/events`;
    const html = await this._fetcher.fetch(listUrl);
    const isAllowed = (url: string) => LastFmHtmlFetcher.isAllowedUrl(url);
    const eventUrls = this._listParser.parse(html, isAllowed);
    const itemsByUrl = new Map(
      this._listParser.parseItems(html, isAllowed).map((item) => [item.url, item])
    );

    const events: LastFmEvent[] = [];
    for (const eventUrl of eventUrls) {
      const item = itemsByUrl.get(eventUrl);
      try {
        const detailHtml = await this._fetcher.fetch(eventUrl);
        const event = this._detailParser.parse(detailHtml, eventUrl);
        if (!event) throw new Error(`No event title found on ${eventUrl}`);
        events.push(this.fillMissingDate(event, item));
      } catch (error) {
        this._onEventPageError?.(eventUrl, error);
        if (item) events.push(this.fromListItem(item));
      }
    }

    this.sortByStartDate(events);
    return events;
  }

  /** Uses the list's date when the detail page had no parseable start date. */
  private fillMissingDate(event: LastFmEvent, item?: EventListItem): LastFmEvent {
    if (event.startsAt || !item?.date) return event;
    return new LastFmEvent({ ...event, startsAt: item.date });
  }

  /** Builds an incomplete event from an events-list row. */
  private fromListItem(item: EventListItem): LastFmEvent {
    const place = [item.city, item.country].filter(Boolean).join(", ");
    const location = [item.venue, place].filter(Boolean).join(" – ");
    return new LastFmEvent({
      id: EventDetailParser.extractEventIdFromUrl(item.url),
      title: item.title,
      url: item.url,
      startsAt: item.date,
      venue: item.venue,
      city: item.city,
      country: item.country,
      location: location || undefined,
      description: item.lineup.length > 0 ? `Lineup: ${item.lineup.join(", ")}` : undefined,
      incomplete: true,
    });
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
