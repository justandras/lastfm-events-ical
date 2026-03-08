import { createEvents, EventAttributes } from "ics";
import { ILastFmEvent } from "./ILastFmEvent";
import { EventIdHelper } from "./EventIdHelper";
import { LastFmHtmlFetcher } from "lastfm-events-scraper";

const MAX_TITLE_LEN = 500;
const MAX_DESCRIPTION_LEN = 4000;
const MAX_LOCATION_LEN = 500;

/**
 * Builds iCalendar (ICS) feed content from Last.fm events.
 * Applies length limits and URL allowlisting for user-generated content.
 */
export class IcalFeedBuilder {
  /**
   * Builds a single calendar feed string from the given events.
   * @param events - Events to include (those without startsAt are skipped).
   * @param calendarName - Optional calendar name in the ICS header.
   */
  public build(
    events: ILastFmEvent[],
    calendarName: string = "Last.fm Events"
  ): string {
    const icsEvents = events
      .map((e) => this.toIcsEvent(e))
      .filter((e): e is EventAttributes => e !== null);

    const { error, value } = createEvents(icsEvents, { calName: calendarName });
    if (error || !value) {
      throw new Error(`Failed to generate iCal feed: ${error ?? "unknown error"}`);
    }
    return value;
  }

  private toIcsEvent(event: ILastFmEvent): EventAttributes | null {
    if (!event.startsAt) return null;

    const start = event.startsAt;
    const startArray: [number, number, number, number, number] = [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ];

    const safeUrl = this.safeEventUrl(event.url);
    const descriptionLines: string[] = [];
    if (safeUrl) descriptionLines.push(`Last.fm event: ${safeUrl}`);
    if (event.description) {
      descriptionLines.push("", this.truncate(event.description, MAX_DESCRIPTION_LEN));
    }
    const description = descriptionLines.join("\n");

    return {
      uid: `LASTFM-ICAL-${EventIdHelper.getStableEventId(event.id)}`,
      title: this.truncate(event.title, MAX_TITLE_LEN),
      start: startArray,
      duration: { hours: 4 },
      description: description || undefined,
      location: event.location
        ? this.truncate(event.location, MAX_LOCATION_LEN)
        : undefined,
      url: safeUrl || undefined,
      productId: "lastfm-events-ical",
    };
  }

  private truncate(s: string, max: number): string {
    return s.length <= max ? s : s.slice(0, max - 3) + "...";
  }

  private safeEventUrl(url: string): string {
    return LastFmHtmlFetcher.isAllowedUrl(url) ? url : "";
  }
}
