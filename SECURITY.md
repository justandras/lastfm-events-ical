# Security

## User-generated content

Content from Last.fm (event titles, descriptions, venues, locations, URLs) is treated as untrusted. Below is how we handle it.

### No RCE (Remote Code Execution)

- We do **not** use `eval`, `Function`, `require(dynamic)`, or shell execution with scraped data.
- Cache is read/written via `JSON.parse` / `JSON.stringify` only; no deserialization of arbitrary classes.
- Cheerio is used for HTML parsing; it does not execute scripts.

### SSRF (Server-Side Request Forgery)

- **Mitigation:** All outbound fetches are restricted to the Last.fm domain.
- In `scraper.ts`, `fetchHtml()` only requests URLs whose hostname is `www.last.fm` or `last.fm` over `http`/`https`. Any other URL is rejected before a request is made.
- Event links collected from the page are added to the scrape list only if they pass the same host check.

### ICS / calendar output

- The **ics** library escapes text per RFC 5545 (`\`, `;`, `,`, newlines) for summary, description, and location, so we do not inject raw control characters into the calendar file.
- **URLs** in the ICS (description and URL field) are only emitted if they are `http`/`https` and host is `www.last.fm` or `last.fm`. Other schemes or hosts (e.g. `javascript:`, `data:`, or third-party domains) are omitted so calendar clients are not given clickable non–last.fm links from our feed.
- **Length limits** are applied to title (500 chars), description (4000 chars), and location (500 chars) to limit payload size and parser edge cases.

### Logging

- Scraped fields are passed to the logger as structured data (e.g. `logger.info({ title })`). We do not build log format strings from user input in a way that could execute code.

### ReDoS

- All regular expressions used on scraped content are fixed (no user-controlled pattern). Date parsing and ID extraction use fixed regexes only.

## Reporting issues

If you find a security concern, please report it responsibly (e.g. by opening an issue or contacting the maintainer).
