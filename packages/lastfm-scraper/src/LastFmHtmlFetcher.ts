import { IHtmlFetcher } from "./IHtmlFetcher";
import { ContactEmailValidator } from "./ContactEmailValidator";

/** Allowed hostnames for fetches (SSRF protection). */
const ALLOWED_HOSTS = ["www.last.fm", "last.fm"];

const DEFAULT_BASE_USER_AGENT = "lastfm-events-scraper/1.0";

/**
 * Fetches HTML only from Last.fm domains over HTTP/HTTPS.
 * Requires a contact email and always appends it to the User-Agent so Last.fm can identify who is scraping.
 */
export class LastFmHtmlFetcher implements IHtmlFetcher {
  private readonly _userAgent: string;

  /**
   * Returns whether the URL is allowed for fetching (last.fm over http/https).
   * Use this when filtering links before passing them to the fetcher.
   */
  public static isAllowedUrl(urlString: string): boolean {
    try {
      const u = new URL(urlString);
      const host = u.hostname.toLowerCase();
      return (
        (u.protocol === "http:" || u.protocol === "https:") &&
        ALLOWED_HOSTS.includes(host)
      );
    } catch {
      return false;
    }
  }

  /**
   * Validates the contact email (format + MX) and creates a fetcher.
   * Use when you need MX validation; the constructor also runs sync validation.
   * @param contactEmail - Email to include in the User-Agent.
   * @param options - Optional base User-Agent; email is always appended as (+mailto:...).
   * @throws Error if contactEmail is invalid (empty, malformed, or domain has no MX).
   */
  public static async create(
    contactEmail: string,
    options?: { baseUserAgent?: string }
  ): Promise<LastFmHtmlFetcher> {
    await ContactEmailValidator.validate(contactEmail);
    return new LastFmHtmlFetcher(contactEmail.trim(), options?.baseUserAgent);
  }

  /**
   * Builds a fetcher with the given contact email; the User-Agent is base + " (+mailto:email)".
   * Validates the email synchronously (non-empty, format). Use create() for MX validation.
   * @param contactEmail - Contact email (will be trimmed); validated before use.
   * @param baseUserAgent - Optional base; default "lastfm-events-scraper/1.0". Email is always appended.
   */
  public constructor(contactEmail: string, baseUserAgent?: string) {
    const trimmed = contactEmail.trim();
    ContactEmailValidator.validateSync(trimmed);
    const base = baseUserAgent ?? DEFAULT_BASE_USER_AGENT;
    this._userAgent = `${base} (+mailto:${trimmed})`;
  }

  /** @inheritdoc */
  public async fetch(url: string): Promise<string> {
    if (!LastFmHtmlFetcher.isAllowedUrl(url)) {
      throw new Error(`Refusing to fetch non–last.fm URL: ${url}`);
    }
    const response = await globalThis.fetch(url, {
      headers: { "User-Agent": this._userAgent },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }
}
