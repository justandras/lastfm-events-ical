/**
 * Immutable DTO for a single Bandsintown event.
 * Shape is compatible with LastFmEvent for shared iCal and cache consumers.
 */
export class BandsintownEvent {
  /** Unique event id from the API. */
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
  /** Human-friendly combined location. */
  public readonly location?: string;
  /** Free-text description when available. */
  public readonly description?: string;

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
