/**
 * Application configuration loaded from environment variables.
 * Required: CONTACT_EMAIL. Optional: PORT, LASTFM_USERNAME, CACHE_FILE_PATH, LIVE_DATA, LASTFM_SCRAPER_UA.
 * User-Agent for scraping is built by the fetcher library from contact email and optional base.
 */
export class AppConfiguration {
  private readonly _contactEmail: string;
  private readonly _port: number;
  private readonly _defaultUsername?: string;
  private readonly _baseUserAgent: string;
  private readonly _cacheFilePath: string;
  private readonly _liveData: boolean;

  private constructor(
    contactEmail: string,
    port: number,
    defaultUsername: string | undefined,
    baseUserAgent: string,
    cacheFilePath: string,
    liveData: boolean
  ) {
    this._contactEmail = contactEmail;
    this._port = port;
    this._defaultUsername = defaultUsername;
    this._baseUserAgent = baseUserAgent;
    this._cacheFilePath = cacheFilePath;
    this._liveData = liveData;
  }

  /** Contact email for the Last.fm User-Agent (required; validated by the scraper package). */
  public get contactEmail(): string {
    return this._contactEmail;
  }

  /** HTTP server port. */
  public get port(): number {
    return this._port;
  }

  /** Default Last.fm username for the calendar feed. */
  public get defaultUsername(): string | undefined {
    return this._defaultUsername;
  }

  /** Base User-Agent; the fetcher appends (+mailto:contactEmail). Default lastfm-events-ical/1.0. */
  public get baseUserAgent(): string {
    return this._baseUserAgent ?? "lastfm-events-ical/1.0";
  }

  /** Path to the JSON cache file. */
  public get cacheFilePath(): string {
    return this._cacheFilePath;
  }

  /** When true, calendar endpoint scrapes on every request instead of serving from cache. */
  public get liveData(): boolean {
    return this._liveData;
  }

  /**
   * Loads configuration from environment variables.
   * @throws Error if CONTACT_EMAIL is missing.
   */
  public static load(): AppConfiguration {
    const contactEmail = process.env.CONTACT_EMAIL?.trim() ?? "";
    if (!contactEmail) {
      throw new Error(
        "CONTACT_EMAIL environment variable is required. " +
          "Set it to your email so it can be included in the Last.fm User-Agent."
      );
    }

    const portRaw = process.env.PORT ?? "3000";
    const port = Number.parseInt(portRaw, 10);
    const liveRaw = process.env.LIVE_DATA ?? "";
    const liveData = liveRaw === "1" || liveRaw.toLowerCase() === "true";
    const baseUserAgent =
      process.env.LASTFM_SCRAPER_UA || "lastfm-events-ical/1.0";

    return new AppConfiguration(
      contactEmail,
      Number.isFinite(port) ? port : 3000,
      process.env.LASTFM_USERNAME || undefined,
      baseUserAgent,
      process.env.CACHE_FILE_PATH || "/data/events-cache.json",
      liveData
    );
  }
}
