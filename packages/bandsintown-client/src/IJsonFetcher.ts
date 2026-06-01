/**
 * Fetches JSON from allowed URLs (SSRF-safe).
 */
export interface IJsonFetcher {
  fetch(url: string): Promise<string>;
}
