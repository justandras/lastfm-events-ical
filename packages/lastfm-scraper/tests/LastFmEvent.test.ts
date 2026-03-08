import { describe, it, expect } from "vitest";
import { LastFmEvent } from "../src/LastFmEvent";

describe("LastFmEvent", () => {
  it("stores required id, title, url", () => {
    const e = new LastFmEvent({
      id: "123+Slug",
      title: "Concert",
      url: "https://www.last.fm/event/123+Slug",
    });
    expect(e.id).toBe("123+Slug");
    expect(e.title).toBe("Concert");
    expect(e.url).toBe("https://www.last.fm/event/123+Slug");
    expect(e.startsAt).toBeUndefined();
    expect(e.venue).toBeUndefined();
  });

  it("stores optional fields when provided", () => {
    const start = new Date("2026-06-15T19:00:00Z");
    const e = new LastFmEvent({
      id: "1",
      title: "Gig",
      url: "https://www.last.fm/event/1",
      startsAt: start,
      venue: "Venue A",
      city: "London",
      country: "UK",
      location: "Venue A – London, UK",
      description: "A great night",
    });
    expect(e.startsAt).toBe(start);
    expect(e.venue).toBe("Venue A");
    expect(e.city).toBe("London");
    expect(e.country).toBe("UK");
    expect(e.location).toBe("Venue A – London, UK");
    expect(e.description).toBe("A great night");
  });
});
