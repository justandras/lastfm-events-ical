/**
 * Last.fm events scraper package.
 * Fetches and parses a user's events list and event detail pages; no caching or HTTP server.
 * Requires a contact email for the User-Agent so Last.fm can identify who is scraping.
 */

export { LastFmEvent } from "./LastFmEvent";
export { IHtmlFetcher } from "./IHtmlFetcher";
export { LastFmHtmlFetcher } from "./LastFmHtmlFetcher";
export { ContactEmailValidator } from "./ContactEmailValidator";
export { EventListParser } from "./EventListParser";
export { EventDetailParser } from "./EventDetailParser";
export { LastFmEventsScraper } from "./LastFmEventsScraper";
