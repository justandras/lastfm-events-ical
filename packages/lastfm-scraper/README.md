# lastfm-events-scraper

Reusable Last.fm user events scraper. Fetches and parses the user events list and each event detail page; returns structured `LastFmEvent` instances. No caching or HTTP server. **Requires a contact email** so the User-Agent identifies who is scraping (for Last.fm).

## Installation

```bash
npm install lastfm-events-scraper
```

Or from a local path (monorepo):

```json
"dependencies": {
  "lastfm-events-scraper": "file:packages/lastfm-scraper"
}
```

## Usage

```typescript
import {
  LastFmHtmlFetcher,
  LastFmEventsScraper,
  LastFmEvent,
} from "lastfm-events-scraper";

// Validates contact email (format + MX) and builds User-Agent as base + (+mailto:email)
const fetcher = await LastFmHtmlFetcher.create("you@example.com", {
  baseUserAgent: "MyApp/1.0",  // optional; default "lastfm-events-scraper/1.0"
});
const scraper = new LastFmEventsScraper(fetcher);
const events: LastFmEvent[] = await scraper.scrape("LastFmUsername");
```

Or construct the fetcher directly (no validation; use when email was already validated):

```typescript
const fetcher = new LastFmHtmlFetcher("you@example.com", "MyApp/1.0");
```

## API

- **`LastFmEvent`** – Immutable event DTO (id, title, url, startsAt, venue, location, description, etc.).
- **`IHtmlFetcher`** – Interface for fetching HTML by URL (e.g. for testing or custom SSRF policy).
- **`LastFmHtmlFetcher`** – Fetches only `http(s)://www.last.fm` and `last.fm`. Builds User-Agent from contact email (always appends `(+mailto:email)`). **`create(contactEmail, options?)`** – async; validates email (format + MX) then returns a fetcher. **Constructor(contactEmail, baseUserAgent?)** – sync; use when email is already validated.
- **`ContactEmailValidator`** – **`validate(email)`** – async; validates format and MX so Last.fm can identify the scraper owner.
- **`EventListParser`** – Parses a user events page HTML and returns event detail URLs.
- **`EventDetailParser`** – Parses an event detail page HTML and returns a `LastFmEvent`.
- **`LastFmEventsScraper`** – Orchestrates fetcher + list parser + detail parser; `scrape(username)` returns sorted `LastFmEvent[]`.

## Build

```bash
npm install
npm run build
```
