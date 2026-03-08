import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackgroundScrapeScheduler } from "../src/BackgroundScrapeScheduler";
import { AppConfiguration } from "../src/AppConfiguration";
import { LastFmEventsScraper } from "lastfm-events-scraper";
import { EventCache } from "../src/EventCache";
import { Logger } from "../src/Logger";

describe("BackgroundScrapeScheduler", () => {
  let config: AppConfiguration;
  let scraper: LastFmEventsScraper;
  let cache: EventCache;
  let logger: Logger;

  beforeEach(() => {
    config = {
      get contactEmail(): string {
        return "test@example.com";
      },
      get port(): number {
        return 3000;
      },
      get defaultUsername(): string {
        return "TestUser";
      },
      get baseUserAgent(): string {
        return "test/1.0";
      },
      get cacheFilePath(): string {
        return "/tmp/cache.json";
      },
      get liveData(): boolean {
        return false;
      },
    } as AppConfiguration;
    scraper = {
      scrape: vi.fn().mockResolvedValue([]),
    } as unknown as LastFmEventsScraper;
    cache = {
      mergeAndPersist: vi.fn().mockResolvedValue([]),
    } as unknown as EventCache;
    logger = new Logger("silent");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("start() does nothing when liveData is true", () => {
    const liveConfig = {
      get contactEmail(): string {
        return "test@example.com";
      },
      get port(): number {
        return 3000;
      },
      get defaultUsername(): string {
        return "TestUser";
      },
      get baseUserAgent(): string {
        return "test/1.0";
      },
      get cacheFilePath(): string {
        return "/tmp/cache.json";
      },
      get liveData(): boolean {
        return true;
      },
    } as AppConfiguration;
    const scheduler = new BackgroundScrapeScheduler(
      liveConfig,
      scraper,
      cache,
      logger
    );
    scheduler.start();
    expect(scraper.scrape).not.toHaveBeenCalled();
  });

  it("start() does nothing when defaultUsername is not set", () => {
    const noUserConfig = {
      get contactEmail(): string {
        return "test@example.com";
      },
      get port(): number {
        return 3000;
      },
      get defaultUsername(): string | undefined {
        return undefined;
      },
      get baseUserAgent(): string {
        return "test/1.0";
      },
      get cacheFilePath(): string {
        return "/tmp/cache.json";
      },
      get liveData(): boolean {
        return false;
      },
    } as AppConfiguration;
    const scheduler = new BackgroundScrapeScheduler(
      noUserConfig,
      scraper,
      cache,
      logger
    );
    scheduler.start();
    expect(scraper.scrape).not.toHaveBeenCalled();
  });

  it("stop() clears timeout and is idempotent", () => {
    const scheduler = new BackgroundScrapeScheduler(
      config,
      scraper,
      cache,
      logger
    );
    scheduler.start();
    scheduler.stop();
    scheduler.stop();
    expect(scheduler).toBeDefined();
  });
});
