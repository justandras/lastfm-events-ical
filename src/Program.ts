import process from "process";
import { AppConfiguration } from "./AppConfiguration";
import { EventCache } from "./EventCache";
import { IcalFeedBuilder } from "./IcalFeedBuilder";
import { CalendarServer } from "./CalendarServer";
import { BackgroundScrapeScheduler } from "./BackgroundScrapeScheduler";
import { Logger } from "./Logger";
import {
  LastFmEventsScraper,
  LastFmHtmlFetcher,
} from "lastfm-events-scraper";

/**
 * Application entry point. Loads configuration, wires dependencies (fetcher validates contact email), and starts the server.
 */
export class LastFmEventsIcal {
  /**
   * Runs the application. Exits with code 1 if configuration or contact email validation fails.
   */
  public static async main(): Promise<void> {
    const logger = new Logger();

    let config: AppConfiguration;
    try {
      config = AppConfiguration.load();
    } catch (err) {
      logger.fatal({ err }, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    let fetcher: LastFmHtmlFetcher;
    try {
      fetcher = await LastFmHtmlFetcher.create(config.contactEmail, {
        baseUserAgent: config.baseUserAgent,
      });
    } catch (err) {
      logger.fatal({ err }, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    const scraper = new LastFmEventsScraper(fetcher);
    const cache = new EventCache(config, logger);
    const icalBuilder = new IcalFeedBuilder();
    const scrapeScheduler = new BackgroundScrapeScheduler(
      config,
      scraper,
      cache,
      logger
    );
    const server = new CalendarServer(
      config,
      cache,
      scraper,
      icalBuilder,
      scrapeScheduler,
      logger
    );

    await server.start();
  }
}
