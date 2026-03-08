/**
 * Abstraction for fetching HTML by URL.
 * Implementations should enforce SSRF policy (e.g. allow only certain hosts).
 */
export interface IHtmlFetcher {
  /**
   * Fetches the document at the given URL and returns its HTML body.
   * @param url - Absolute URL to fetch.
   * @returns The response body as string.
   * @throws Error if the URL is not allowed or the request fails.
   */
  fetch(url: string): Promise<string>;
}
