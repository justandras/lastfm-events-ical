import { AppConfiguration } from "./AppConfiguration";
import { EventCache } from "./EventCache";
import { Logger } from "./Logger";
import { LastFmEventsScraper } from "lastfm-events-scraper";
import { ILastFmEvent } from "./ILastFmEvent";

const MIN_INTERVAL_MS = 3 * 60 * 60 * 1000;  // 3 hours
const MAX_INTERVAL_MS = 6 * 60 * 60 * 1000;  // 6 hours
const INITIAL_DELAY_MS = 2000;

/**
 * Schedules and runs background scrapes at a random interval between 3 and 6 hours.
 * Does not run when liveData is enabled or when no default username is configured.
 */
export class BackgroundScrapeScheduler {
  private readonly _config: AppConfiguration;
  private readonly _scraper: LastFmEventsScraper;
  private readonly _cache: EventCache;
  private readonly _logger: Logger;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    config: AppConfiguration,
    scraper: LastFmEventsScraper,
    cache: EventCache,
    logger: Logger
  ) {
    this._config = config;
    this._scraper = scraper;
    this._cache = cache;
    this._logger = logger;
  }

  /**
   * Schedules the first run after a short delay, then each subsequent run at a random 3–6 hour interval.
   * No-op when liveData is true or defaultUsername is not set.
   */
  public start(): void {
    if (this._config.liveData) return;

    const username = this._config.defaultUsername;
    if (!username) return;

    this._logger.info(
      { initialDelaySeconds: INITIAL_DELAY_MS / 1000 },
      "Background scrape will run shortly, then every 3–6 hours"
    );
    this._scheduleNext(INITIAL_DELAY_MS);
  }

  /**
   * Stops any scheduled future run. Idempotent.
   */
  public stop(): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  private _scheduleNext(delayMs: number): void {
    this._timeoutId = setTimeout(() => {
      this._timeoutId = null;
      this._runOnce();
    }, delayMs);
  }

  private _runOnce(): void {
    const username = this._config.defaultUsername;
    if (!username) return;

    this._scraper
      .scrape(username)
      .then((scraped) => this._cache.mergeAndPersist(scraped as ILastFmEvent[]))
      .then(() => {
        this._logger.info("Scheduled scrape finished; cache updated.");
      })
      .catch((err) => {
        this._logger.error({ err }, "Scheduled scrape failed");
      });

    const nextMs =
      MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
    const nextHours = (nextMs / (60 * 60 * 1000)).toFixed(1);
    this._logger.info({ nextHours }, "Next scrape scheduled");
    this._scheduleNext(nextMs);
  }
}
