/**
 * Shape of a Last.fm event used by the app (cache, iCal).
 * Compatible with LastFmEvent from lastfm-events-scraper.
 */
export interface ILastFmEvent {
  id: string;
  title: string;
  url: string;
  startsAt?: Date;
  venue?: string;
  city?: string;
  country?: string;
  location?: string;
  description?: string;
}
