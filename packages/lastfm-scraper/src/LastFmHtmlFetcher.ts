import { IHtmlFetcher } from "./IHtmlFetcher";
import { ContactEmailValidator } from "./ContactEmailValidator";

/** Allowed hostnames for fetches (SSRF protection). */
const ALLOWED_HOSTS = ["www.last.fm", "last.fm"];

const DEFAULT_BASE_USER_AGENT = "lastfm-events-scraper/1.0";

/** Title of the CDN bot-challenge page Last.fm serves (with HTTP 200) instead of blocked pages. */
const CHALLENGE_PAGE_REGEX = /<title>\s*Client Challenge\s*<\/title>/i;

/** Cookie name Last.fm uses for logged-in sessions. */
const SESSION_COOKIE_NAME = "sessionid";

/** Options for creating a LastFmHtmlFetcher. */
export interface LastFmHtmlFetcherOptions {
  /** Base User-Agent; the contact email is always appended as (+mailto:...). */
  baseUserAgent?: string;
  /**
   * Optional logged-in Last.fm session, sent as a Cookie header on every request.
   * Either the bare `sessionid` cookie value, or a full Cookie header string (e.g. "sessionid=...; csrftoken=...").
   * Treat as a credential: it grants access to the Last.fm account.
   */
  sessionCookie?: string;
}

/**
 * Fetches HTML only from Last.fm domains over HTTP/HTTPS.
 * Requires a contact email and always appends it to the User-Agent so Last.fm can identify who is scraping.
 */
export class LastFmHtmlFetcher implements IHtmlFetcher {
  private readonly _userAgent: string;
  private readonly _cookieHeader?: string;

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
   * @param options - Optional base User-Agent (email is always appended) and session cookie.
   * @throws Error if contactEmail is invalid (empty, malformed, or domain has no MX), or the session cookie is malformed.
   */
  public static async create(
    contactEmail: string,
    options?: LastFmHtmlFetcherOptions
  ): Promise<LastFmHtmlFetcher> {
    await ContactEmailValidator.validate(contactEmail);
    return new LastFmHtmlFetcher(
      contactEmail.trim(),
      options?.baseUserAgent,
      options?.sessionCookie
    );
  }

  /**
   * Builds a fetcher with the given contact email; the User-Agent is base + " (+mailto:email)".
   * Validates the email synchronously (non-empty, format). Use create() for MX validation.
   * @param contactEmail - Contact email (will be trimmed); validated before use.
   * @param baseUserAgent - Optional base; default "lastfm-events-scraper/1.0". Email is always appended.
   * @param sessionCookie - Optional logged-in session (bare `sessionid` value or full Cookie header string).
   * @throws Error if contactEmail is invalid or sessionCookie contains line breaks.
   */
  public constructor(
    contactEmail: string,
    baseUserAgent?: string,
    sessionCookie?: string
  ) {
    const trimmed = contactEmail.trim();
    ContactEmailValidator.validateSync(trimmed);
    const base = baseUserAgent ?? DEFAULT_BASE_USER_AGENT;
    this._userAgent = `${base} (+mailto:${trimmed})`;
    this._cookieHeader = LastFmHtmlFetcher.buildCookieHeader(sessionCookie);
  }

  /** Whether requests are sent with a logged-in session cookie. */
  public get hasSessionCookie(): boolean {
    return this._cookieHeader !== undefined;
  }

  /**
   * Normalizes the session cookie into a Cookie header value.
   * A bare value becomes "sessionid=<value>"; a string containing "=" is used as-is.
   */
  private static buildCookieHeader(sessionCookie?: string): string | undefined {
    const value = sessionCookie?.trim();
    if (!value) return undefined;
    if (/[\r\n]/.test(value)) {
      throw new Error("Last.fm session cookie must not contain line breaks.");
    }
    return value.includes("=") ? value : `${SESSION_COOKIE_NAME}=${value}`;
  }

  /** @inheritdoc */
  public async fetch(url: string): Promise<string> {
    if (!LastFmHtmlFetcher.isAllowedUrl(url)) {
      throw new Error(`Refusing to fetch non–last.fm URL: ${url}`);
    }
    const headers: Record<string, string> = { "User-Agent": this._userAgent };
    if (this._cookieHeader) headers["Cookie"] = this._cookieHeader;

    const response = await globalThis.fetch(url, { headers });
    if (!response.ok) {
      const hint = this.blockedHint(response.status);
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}${hint}`
      );
    }
    const html = await response.text();
    if (CHALLENGE_PAGE_REGEX.test(html)) {
      throw new Error(
        `Last.fm served a bot challenge instead of ${url} (blocked by its CDN; not retrying)`
      );
    }
    return html;
  }

  /** Extra context for status codes Last.fm uses when blocking anonymous or expired sessions. */
  private blockedHint(status: number): string {
    if (status !== 401 && status !== 403 && status !== 503) return "";
    return this._cookieHeader
      ? " (the Last.fm session cookie may have expired; log in again and update it)"
      : " (Last.fm may be blocking anonymous requests; consider configuring a session cookie)";
  }
}
