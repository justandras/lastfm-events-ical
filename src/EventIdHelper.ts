/**
 * Helpers for stable Last.fm event identifiers.
 * Event URLs change when the name changes; only the leading numeric id is stable.
 */
export class EventIdHelper {
  /**
   * Returns the leading numeric part of the event id/slug for use in cache keys and iCal UIDs.
   */
  public static getStableEventId(idOrSlug: string): string {
    return idOrSlug.match(/^\d+/)?.[0] ?? idOrSlug;
  }
}
