import { describe, it, expect, vi } from "vitest";
import { BandsintownEventsClient } from "../src/BandsintownEventsClient";
import { IJsonFetcher } from "../src/IJsonFetcher";

const EXAMPLE_ARTIST = "artist name from api url";
const EXAMPLE_APP_ID = "your app ID";

describe("BandsintownEventsClient", () => {
  it("builds correct API URL with encoded artist and app_id", async () => {
    const mockFetcher: IJsonFetcher = {
      fetch: vi.fn().mockResolvedValue("[]"),
    };
    const client = new BandsintownEventsClient(mockFetcher);
    await client.fetchEvents(EXAMPLE_ARTIST, EXAMPLE_APP_ID);

    expect(mockFetcher.fetch).toHaveBeenCalledWith(
      "https://rest.bandsintown.com/artists/" +
        encodeURIComponent(EXAMPLE_ARTIST) +
        "/events?app_id=" +
        encodeURIComponent(EXAMPLE_APP_ID)
    );
  });

  it("returns events sorted by start date", async () => {
    const mockFetcher: IJsonFetcher = {
      fetch: vi.fn().mockResolvedValue(
        JSON.stringify([
          {
            id: "2",
            title: "Later event",
            url: "https://www.bandsintown.com/e/2",
            starts_at: "2026-07-01T20:00:00",
            venue: { name: "Example Venue B" },
          },
          {
            id: "1",
            title: "Earlier event",
            url: "https://www.bandsintown.com/e/1",
            starts_at: "2026-06-01T20:00:00",
            venue: { name: "Example Venue A" },
          },
        ])
      ),
    };
    const client = new BandsintownEventsClient(mockFetcher);
    const events = await client.fetchEvents(EXAMPLE_ARTIST, EXAMPLE_APP_ID);
    expect(events.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("throws when response is not an array", async () => {
    const mockFetcher: IJsonFetcher = {
      fetch: vi.fn().mockResolvedValue("{}"),
    };
    const client = new BandsintownEventsClient(mockFetcher);
    await expect(
      client.fetchEvents(EXAMPLE_ARTIST, EXAMPLE_APP_ID)
    ).rejects.toThrow(/not an array/i);
  });

  it("throws when artist or app_id is empty", async () => {
    const mockFetcher: IJsonFetcher = { fetch: vi.fn() };
    const client = new BandsintownEventsClient(mockFetcher);
    await expect(client.fetchEvents("  ", EXAMPLE_APP_ID)).rejects.toThrow(
      /artist/i
    );
    await expect(client.fetchEvents(EXAMPLE_ARTIST, "  ")).rejects.toThrow(
      /app_id/i
    );
  });
});
