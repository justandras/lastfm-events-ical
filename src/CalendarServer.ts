import http from "http";
import { URL } from "url";
import { AppConfiguration } from "./AppConfiguration";
import { EventCache } from "./EventCache";
import { IcalFeedBuilder } from "./IcalFeedBuilder";
import { Logger } from "./Logger";
import { BackgroundScrapeScheduler } from "./BackgroundScrapeScheduler";
import { LastFmEventsScraper } from "lastfm-events-scraper";
import { ILastFmEvent } from "./ILastFmEvent";

/**
 * HTTP server that serves the iCal feed and health endpoint.
 * Uses cache by default; can scrape on every request when liveData is enabled.
 */
export class CalendarServer {
  private readonly _config: AppConfiguration;
  private readonly _cache: EventCache;
  private readonly _scraper: LastFmEventsScraper;
  private readonly _icalBuilder: IcalFeedBuilder;
  private readonly _scrapeScheduler: BackgroundScrapeScheduler;
  private readonly _logger: Logger;
  private _server: http.Server | null = null;

  public constructor(
    config: AppConfiguration,
    cache: EventCache,
    scraper: LastFmEventsScraper,
    icalBuilder: IcalFeedBuilder,
    scrapeScheduler: BackgroundScrapeScheduler,
    logger: Logger
  ) {
    this._config = config;
    this._cache = cache;
    this._scraper = scraper;
    this._icalBuilder = icalBuilder;
    this._scrapeScheduler = scrapeScheduler;
    this._logger = logger;
  }

  /**
   * Starts the HTTP server and, when not in liveData mode, starts the background scrape scheduler.
   */
  public start(): Promise<void> {
    this._server = http.createServer((req, res) => this.handleRequest(req, res));

    return new Promise((resolve) => {
      if (!this._server) return resolve();

      this._server.listen(this._config.port, () => {
        this._logger.info(
          {
            port: this._config.port,
            url: `http://localhost:${this._config.port}/calendar.ics`,
          },
          "Last.fm events iCal server listening"
        );
        if (this._config.liveData) {
          this._logger.info(
            "LIVE_DATA is set; calendar requests will scrape Last.fm on each request."
          );
        } else {
          this._scrapeScheduler.start();
        }
        resolve();
      });
    });
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("OK");
      return;
    }

    if (url.pathname === "/calendar.ics") {
      this.handleCalendarRequest(res);
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
  }

  private async handleCalendarRequest(res: http.ServerResponse): Promise<void> {
    const username = this._config.defaultUsername;
    if (!username) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(
        "Missing Last.fm username. Set LASTFM_USERNAME in the environment."
      );
      return;
    }

    try {
      let events: ILastFmEvent[];

      if (this._config.liveData) {
        const scraped = await this._scraper.scrape(username);
        events = await this._cache.mergeAndPersist(scraped as ILastFmEvent[]);
      } else {
        events = await this._cache.getEvents();
      }

      const ics = this._icalBuilder.build(
        events,
        `Last.fm Events for ${username}`
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="lastfm-${username}-events.ics"`
      );
      res.end(ics);
    } catch (error) {
      this._logger.error({ err: error }, "Failed to generate calendar");
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Failed to fetch or generate Last.fm events calendar.");
    }
  }
}
