import { describe, it, expect } from "vitest";
import { BandsintownEventMapper } from "../src/BandsintownEventMapper";
import { BandsintownApiEvent } from "../src/BandsintownApiEvent";

const EXAMPLE_EVENT_ID = "12345";
const EXAMPLE_EVENT_URL = `https://www.bandsintown.com/e/${EXAMPLE_EVENT_ID}?app_id=your-app-id`;
const EXAMPLE_VENUE_NAME = "Example Venue";
const EXAMPLE_EVENT_TITLE = "Example Event Title";
const EXAMPLE_ARTIST = "artist name from api url";
const EXAMPLE_LOCATION = "Example City, Example Country";

describe("BandsintownEventMapper", () => {
  const mapper = new BandsintownEventMapper();

  const sampleEvent: BandsintownApiEvent = {
    id: EXAMPLE_EVENT_ID,
    title: "",
    url: EXAMPLE_EVENT_URL,
    starts_at: "2026-06-03T22:00:00",
    datetime: "2026-06-03T22:00:00",
    venue: {
      name: EXAMPLE_VENUE_NAME,
      city: "Example City",
      country: "Example Country",
      location: EXAMPLE_LOCATION,
    },
    lineup: [EXAMPLE_ARTIST],
    sold_out: false,
    offers: [],
  };

  it("maps id, url, and startsAt", () => {
    const event = mapper.map(sampleEvent);
    expect(event).not.toBeNull();
    expect(event!.id).toBe(EXAMPLE_EVENT_ID);
    expect(event!.url).toContain(`bandsintown.com/e/${EXAMPLE_EVENT_ID}`);
    expect(event!.startsAt).toEqual(new Date("2026-06-03T22:00:00"));
  });

  it("uses venue name when title is empty", () => {
    const event = mapper.map(sampleEvent);
    expect(event!.title).toBe(EXAMPLE_VENUE_NAME);
  });

  it("uses title when present", () => {
    const event = mapper.map({ ...sampleEvent, title: EXAMPLE_EVENT_TITLE });
    expect(event!.title).toBe(EXAMPLE_EVENT_TITLE);
  });

  it("uses venue.location for location field", () => {
    const event = mapper.map(sampleEvent);
    expect(event!.location).toBe(EXAMPLE_LOCATION);
  });

  it("builds description with lineup and sold out", () => {
    const event = mapper.map({
      ...sampleEvent,
      sold_out: true,
      offers: [
        {
          type: "Tickets",
          url: `https://www.bandsintown.com/t/${EXAMPLE_EVENT_ID}?app_id=your-app-id`,
          status: "available",
        },
      ],
    });
    expect(event!.description).toContain(`Lineup: ${EXAMPLE_ARTIST}`);
    expect(event!.description).toContain("Sold out");
    expect(event!.description).toContain("Tickets:");
  });

  it("returns null when id or url is missing", () => {
    expect(mapper.map({ ...sampleEvent, id: "" })).toBeNull();
    expect(mapper.map({ ...sampleEvent, url: "" })).toBeNull();
  });

  it("mapMany skips invalid entries", () => {
    const events = mapper.mapMany([
      sampleEvent,
      { id: "", url: "https://example.com" },
    ]);
    expect(events).toHaveLength(1);
  });
});
