import * as cheerio from "cheerio";
import { LastFmEvent } from "./LastFmEvent";

/** Regex for human-readable date/time (e.g. "14 March 2026 at 6:30pm"). */
const HUMAN_DATE_REGEX =
  /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*(am|pm)?/i;

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/**
 * Parses a single Last.fm event detail page and returns a structured event.
 */
export class EventDetailParser {
  /**
   * Parses the event detail page HTML into a LastFmEvent, or null if no title found.
   * @param html - Raw HTML of the event detail page.
   * @param pageUrl - URL of the page (used for id and url on the event).
   */
  public parse(html: string, pageUrl: string): LastFmEvent | null {
    const $ = cheerio.load(html);
    const title =
      $("h1").first().text().trim() ||
      $("title").first().text().trim() ||
      undefined;

    if (!title) return null;

    const startsAt = this.parseStartDate($);
    const { venue, city, country, location, description } =
      this.parseLocationAndDescription($);

    const id = this.extractEventIdFromUrl(pageUrl);

    return new LastFmEvent({
      id,
      title,
      url: pageUrl,
      startsAt,
      venue: venue || undefined,
      city: city || undefined,
      country: country || undefined,
      location: location || undefined,
      description: description || undefined,
    });
  }

  private parseStartDate($: cheerio.CheerioAPI): Date | undefined {
    const timeEl = $("time[datetime]").first();
    const datetimeAttr = timeEl.attr("datetime");
    if (datetimeAttr) {
      const parsed = new Date(datetimeAttr);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return this.parseDateFromPageText($);
  }

  private parseDateFromPageText($: cheerio.CheerioAPI): Date | undefined {
    let dateText: string | undefined;

    const dateLabel = $("h3, h2, dt")
      .filter((_, el) => $(el).text().trim().toLowerCase() === "date")
      .first();

    if (dateLabel.length) {
      const sibling = dateLabel.next();
      dateText = sibling.text().trim() || sibling.next().text().trim();
    }

    if (!dateText) {
      const fallbackRegex = /(\d{1,2})\s+[A-Za-z]+\s+\d{4}.*\d{1,2}:\d{2}\s*(am|pm)?/i;
      const candidate = $("p, div, span")
        .filter((_, el) => fallbackRegex.test($(el).text().trim()))
        .first();
      if (candidate.length) dateText = candidate.text().trim();
    }

    if (!dateText) return undefined;
    return this.parseHumanReadableDate(dateText);
  }

  private parseHumanReadableDate(text: string): Date | undefined {
    const match = HUMAN_DATE_REGEX.exec(text);
    if (!match) return undefined;

    const [, dayStr, monthName, yearStr, hourStr, minuteStr, ampmRaw] = match;
    const day = Number.parseInt(dayStr, 10);
    const year = Number.parseInt(yearStr, 10);
    const minute = Number.parseInt(minuteStr, 10);
    let hour = Number.parseInt(hourStr, 10);

    const month = MONTH_NAMES[monthName.toLowerCase()];
    if (!month) return undefined;

    if (ampmRaw) {
      const ampm = ampmRaw.toLowerCase();
      if (ampm === "pm" && hour < 12) hour += 12;
      else if (ampm === "am" && hour === 12) hour = 0;
    }

    const date = new Date(year, month - 1, day, hour, minute);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private parseLocationAndDescription($: cheerio.CheerioAPI): {
    venue: string;
    city: string;
    country: string;
    location: string;
    description: string;
  } {
    const venue =
      $('[itemprop="location"]').first().text().trim() ||
      $('a[href*="/venue/"]').first().text().trim() ||
      $('p:contains("Venue")').first().text().replace(/Venue[:\s]*/i, "").trim() ||
      "";
    const city =
      $('[itemprop="addressLocality"]').first().text().trim() ||
      $('span[class*="location"]').first().text().trim() ||
      "";
    const country = $('[itemprop="addressCountry"]').first().text().trim() || "";
    const description =
      $('[itemprop="description"]').first().text().trim() ||
      $('meta[name="description"]').attr("content")?.trim() ||
      "";

    const locationParts: string[] = [];
    if (city) locationParts.push(city);
    if (country) locationParts.push(country);
    const location = [venue, locationParts.join(", ")].filter(Boolean).join(" – ");

    return { venue, city, country, location, description };
  }

  private extractEventIdFromUrl(url: string): string {
    const match = url.match(/\/event\/([^/]+)/);
    return match?.[1] ?? url;
  }
}
