## Last.fm Events → iCal HTTP service

This service scrapes a Last.fm user's **Events** page (e.g. [`https://www.last.fm/user/JustAndras/events`](https://www.last.fm/user/JustAndras/events)) and exposes the upcoming events as an **iCalendar (`.ics`) feed** over HTTP.

The codebase is **object-oriented**: clear class responsibilities, JSDoc, and a separate **scraper package** (`packages/lastfm-scraper`) that can be reused in other projects. Caching, HTTP server, and iCal generation live in the main app.

The iCal entries include:

- **Title**: Event title from Last.fm
- **Start time**: Parsed from the event page's machine-readable datetime (when available)
- **Location**: Venue and city/country when available
- **Description**: Starts with a direct link to the Last.fm event page, followed by any description text scraped from the event page

### Configuration

- **`CONTACT_EMAIL`**: **Required.** Your email address, included in the User-Agent when scraping Last.fm (e.g. `lastfm-events-ical/1.0 (+mailto:you@example.com)`). The app will not start without it.
- **`LASTFM_USERNAME`**: Last.fm username whose events will be exposed.
- **`PORT`**: HTTP port (default `3000`).
- **`LASTFM_SCRAPER_UA`**: Optional override for the User-Agent; if unset, the default uses `CONTACT_EMAIL`.
- **`LASTFM_SESSION_COOKIE`**: Optional logged-in Last.fm session, sent as a cookie on every Last.fm request. Use it when Last.fm blocks anonymous requests (e.g. HTTP 503 on your events page while logged out). In a logged-in browser, open DevTools → Application → Cookies → `https://www.last.fm` and copy the `sessionid` value; a full `Cookie` header string also works. Treat it as a credential: it grants access to your Last.fm account. It expires when you log out or the session times out; failed fetches then mention that the cookie may have expired.
- **`CACHE_FILE_PATH`**: Path to the JSON cache file. Defaults to `/data/events-cache.json`.
- **`BANDSINTOWN_ARTISTS`**: Optional JSON array of Bandsintown feeds. Each entry needs `slug` (ICS URL path), `artist` (Bandsintown artist name), and `appId` (per-artist API key from Bandsintown). Example: `[{"slug":"desired-slug","artist":"artist name from api url","appId":"your app ID"}]`. Feeds are fetched live on each request (no cache). Treat `appId` as a credential.

### Bandsintown calendars

When `BANDSINTOWN_ARTISTS` is set, each artist is available at:

```text
http://localhost:3000/{slug}.ics
```

For example, `slug: "desired-slug"` serves `http://localhost:3000/desired-slug.ics`. Last.fm remains at `/calendar.ics`.

### Running locally

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (optional, for development) with values like:

```bash
LASTFM_USERNAME=JustAndras
PORT=3000
CACHE_FILE_PATH=./data/events-cache.json
```

3. Build and start the project:

```bash
npm run build
```

```bash
npm start
```

5. Add the feed to your calendar client using:

```text
http://localhost:3000/calendar.ics
```

### Running with Docker

Build the image:

```bash
docker build -t lastfm-events-ical .
```

Run the container:

```bash
docker run --rm -p 3000:3000 \
  -e LASTFM_USERNAME=JustAndras \
  -e PORT=3000 \
  -v lastfm-events-cache:/data \
  lastfm-events-ical
```

Then subscribe to: `http://localhost:3000/calendar.ics`
from your calendar application.
