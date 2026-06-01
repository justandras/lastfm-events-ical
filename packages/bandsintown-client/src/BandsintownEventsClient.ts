import { BandsintownApiEvent } from "./BandsintownApiEvent";
import { BandsintownEvent } from "./BandsintownEvent";
import { BandsintownEventMapper } from "./BandsintownEventMapper";
import { BandsintownJsonFetcher } from "./BandsintownJsonFetcher";
import { IJsonFetcher } from "./IJsonFetcher";

const DEFAULT_BASE_URL = "https://rest.bandsintown.com";

/**
 * Fetches upcoming events for an artist from the Bandsintown public API.
 */
export class BandsintownEventsClient {
  private readonly _fetcher: IJsonFetcher;
  private readonly _mapper: BandsintownEventMapper;
  private readonly _baseUrl: string;

  public constructor(
    fetcher?: IJsonFetcher,
    options?: { baseUrl?: string; mapper?: BandsintownEventMapper }
  ) {
    this._fetcher = fetcher ?? new BandsintownJsonFetcher();
    this._mapper = options?.mapper ?? new BandsintownEventMapper();
    this._baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Fetches and maps upcoming events for the given artist and app id.
   */
  public async fetchEvents(
    artist: string,
    appId: string
  ): Promise<BandsintownEvent[]> {
    const trimmedArtist = artist.trim();
    const trimmedAppId = appId.trim();
    if (!trimmedArtist) {
      throw new Error("Bandsintown artist name is required");
    }
    if (!trimmedAppId) {
      throw new Error("Bandsintown app_id is required");
    }

    const url =
      `${this._baseUrl}/artists/${encodeURIComponent(trimmedArtist)}` +
      `/events?app_id=${encodeURIComponent(trimmedAppId)}`;

    const body = await this._fetcher.fetch(url);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Bandsintown API returned invalid JSON");
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Bandsintown API response is not an array");
    }

    const events = this._mapper.mapMany(parsed as BandsintownApiEvent[]);
    this.sortByStartDate(events);
    return events;
  }

  private sortByStartDate(events: BandsintownEvent[]): void {
    events.sort((a, b) => {
      const ta = a.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const tb = b.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return ta - tb;
    });
  }
}
