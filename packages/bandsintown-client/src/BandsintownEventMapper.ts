import { BandsintownApiEvent } from "./BandsintownApiEvent";
import { BandsintownEvent } from "./BandsintownEvent";

/**
 * Maps Bandsintown API JSON events to {@link BandsintownEvent} DTOs.
 */
export class BandsintownEventMapper {
  public map(raw: BandsintownApiEvent): BandsintownEvent | null {
    const id = raw.id != null ? String(raw.id) : "";
    const url = raw.url?.trim() ?? "";
    if (!id || !url) return null;

    const startsAt = this.parseDateTime(raw.starts_at ?? raw.datetime);
    const venue = raw.venue;
    const venueName = venue?.name?.trim();
    const city = venue?.city?.trim();
    const country = venue?.country?.trim();

    return new BandsintownEvent({
      id,
      title: this.resolveTitle(raw),
      url,
      startsAt,
      venue: venueName || undefined,
      city: city || undefined,
      country: country || undefined,
      location: this.resolveLocation(venueName, city, country, venue?.location),
      description: this.buildDescription(raw),
    });
  }

  public mapMany(rawEvents: BandsintownApiEvent[]): BandsintownEvent[] {
    const events: BandsintownEvent[] = [];
    for (const raw of rawEvents) {
      const mapped = this.map(raw);
      if (mapped) events.push(mapped);
    }
    return events;
  }

  private resolveTitle(raw: BandsintownApiEvent): string {
    const title = raw.title?.trim();
    if (title) return title;

    const venueName = raw.venue?.name?.trim();
    if (venueName) return venueName;

    const lineup = raw.lineup?.map((n) => n.trim()).filter(Boolean);
    if (lineup && lineup.length > 0) return lineup[0];

    return "Event";
  }

  private resolveLocation(
    venueName: string | undefined,
    city: string | undefined,
    country: string | undefined,
    apiLocation: string | undefined
  ): string | undefined {
    const location = apiLocation?.trim();
    if (location) return location;

    if (venueName && city && country) {
      return `${venueName} – ${city}, ${country}`;
    }
    if (venueName && city) return `${venueName} – ${city}`;
    if (city && country) return `${city}, ${country}`;
    return venueName || city || country || undefined;
  }

  private buildDescription(raw: BandsintownApiEvent): string | undefined {
    const lines: string[] = [];

    const lineup = raw.lineup?.map((n) => n.trim()).filter(Boolean);
    if (lineup && lineup.length > 0) {
      lines.push(`Lineup: ${lineup.join(", ")}`);
    }

    if (raw.sold_out) {
      lines.push("Sold out");
    }

    const ticketUrl = raw.offers?.find((o) => o.url?.trim())?.url?.trim();
    if (ticketUrl) {
      lines.push(`Tickets: ${ticketUrl}`);
    }

    return lines.length > 0 ? lines.join("\n") : undefined;
  }

  private parseDateTime(value: string | undefined): Date | undefined {
    if (!value?.trim()) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
