/**
 * Immutable DTO for a single Last.fm event.
 * Mirrors the shape returned by the scraper; consumers can use this type for caching or iCal.
 */
export class LastFmEvent {
  /** Unique identifier from the event URL path (e.g. event id + slug). */
  public readonly id: string;
  /** Event title. */
  public readonly title: string;
  /** Canonical URL of the event page. */
  public readonly url: string;
  /** Start date/time when known. */
  public readonly startsAt?: Date;
  /** Venue name when known. */
  public readonly venue?: string;
  /** City when known. */
  public readonly city?: string;
  /** Country when known. */
  public readonly country?: string;
  /** Human-friendly combined location (e.g. "AFAS Live – Amsterdam, Netherlands"). */
  public readonly location?: string;
  /** Free-text description when available. */
  public readonly description?: string;

  /**
   * Creates a new LastFmEvent.
   * @param args - Property bag; all fields optional except id, title, url.
   */
  public constructor(args: {
    id: string;
    title: string;
    url: string;
    startsAt?: Date;
    venue?: string;
    city?: string;
    country?: string;
    location?: string;
    description?: string;
  }) {
    this.id = args.id;
    this.title = args.title;
    this.url = args.url;
    this.startsAt = args.startsAt;
    this.venue = args.venue;
    this.city = args.city;
    this.country = args.country;
    this.location = args.location;
    this.description = args.description;
  }
}
