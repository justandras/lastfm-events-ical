import { IJsonFetcher } from "./IJsonFetcher";

const ALLOWED_API_HOST = "rest.bandsintown.com";
const ALLOWED_ICS_HOST_SUFFIX = ".bandsintown.com";

const DEFAULT_USER_AGENT = "bandsintown-events-client/1.0";

/**
 * Fetches JSON only from rest.bandsintown.com over HTTPS.
 */
export class BandsintownJsonFetcher implements IJsonFetcher {
  private readonly _userAgent: string;

  public constructor(userAgent?: string) {
    this._userAgent = userAgent ?? DEFAULT_USER_AGENT;
  }

  /**
   * Returns whether the URL is allowed in ICS event links (bandsintown.com hosts).
   */
  public static isAllowedUrl(urlString: string): boolean {
    try {
      const u = new URL(urlString);
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      const host = u.hostname.toLowerCase();
      return (
        host === "bandsintown.com" || host.endsWith(ALLOWED_ICS_HOST_SUFFIX)
      );
    } catch {
      return false;
    }
  }

  public static isAllowedApiUrl(urlString: string): boolean {
    try {
      const u = new URL(urlString);
      return (
        u.protocol === "https:" &&
        u.hostname.toLowerCase() === ALLOWED_API_HOST
      );
    } catch {
      return false;
    }
  }

  public async fetch(url: string): Promise<string> {
    if (!BandsintownJsonFetcher.isAllowedApiUrl(url)) {
      throw new Error(`URL not allowed for Bandsintown API fetch: ${url}`);
    }

    const response = await globalThis.fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": this._userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bandsintown API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.text();
  }
}
