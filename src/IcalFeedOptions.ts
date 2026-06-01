/**
 * Options for building an iCalendar feed from events.
 */
export interface IcalFeedOptions {
  /** Prefix for VEVENT UID values (default LASTFM-ICAL). */
  uidPrefix?: string;
  /** When true, strip slug suffixes from numeric Last.fm-style ids. */
  stableEventIds?: boolean;
  /** Validates event URLs before including them in the ICS output. */
  isAllowedEventUrl?: (url: string) => boolean;
  /** PRODID field in the calendar (default lastfm-events-ical). */
  productId?: string;
}
