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
  /** End date/time when known (e.g. multi-day festivals). */
  public readonly endsAt?: Date;
  /** Venue name when known. */
  public readonly venue?: string;
  /** Venue website URL when present on the event page. */
  public readonly venueWebsite?: string;
  /** City when known. */
  public readonly city?: string;
  /** Country when known. */
  public readonly country?: string;
  /** Human-friendly combined location (e.g. "AFAS Live – Amsterdam, Netherlands"). */
  public readonly location?: string;
  /** Free-text description when available. */
  public readonly description?: string;
  /**
   * True when the event detail page could not be loaded and the event was built
   * from the user's events list instead (no start time or description).
   */
  public readonly incomplete?: boolean;

  /**
   * Creates a new LastFmEvent.
   * @param args - Property bag; all fields optional except id, title, url.
   */
  public constructor(args: {
    id: string;
    title: string;
    url: string;
    startsAt?: Date;
    endsAt?: Date;
    venue?: string;
    venueWebsite?: string;
    city?: string;
    country?: string;
    location?: string;
    description?: string;
    incomplete?: boolean;
  }) {
    this.id = args.id;
    this.title = args.title;
    this.url = args.url;
    this.startsAt = args.startsAt;
    this.endsAt = args.endsAt;
    this.venue = args.venue;
    this.venueWebsite = args.venueWebsite;
    this.city = args.city;
    this.country = args.country;
    this.location = args.location;
    this.description = args.description;
    this.incomplete = args.incomplete;
  }
}
