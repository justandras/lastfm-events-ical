import { describe, it, expect } from "vitest";
import { IcalFeedBuilder } from "../src/IcalFeedBuilder";
import { ILastFmEvent } from "../src/ILastFmEvent";

describe("IcalFeedBuilder", () => {
  const builder = new IcalFeedBuilder();

  it("builds ICS with no VEVENT when no events have start date", () => {
    const events: ILastFmEvent[] = [
      { id: "1", title: "E", url: "https://www.last.fm/event/1" },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("builds ICS string with one event", () => {
    const events: ILastFmEvent[] = [
      {
        id: "12345+Slug",
        title: "Concert",
        url: "https://www.last.fm/event/12345+Slug",
        startsAt: new Date(2026, 5, 15, 19, 30),
      },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("LASTFM-ICAL-12345");
    expect(ics).toContain("Concert");
    expect(ics).toContain("https://www.last.fm/event/12345+Slug");
  });

  it("skips events without startsAt", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "With Date",
        url: "https://www.last.fm/event/1",
        startsAt: new Date(2026, 0, 1, 20, 0),
      },
      {
        id: "2",
        title: "No Date",
        url: "https://www.last.fm/event/2",
      },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("With Date");
    expect(ics).not.toContain("No Date");
  });

  it("includes description and location when present", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "Gig",
        url: "https://www.last.fm/event/1",
        startsAt: new Date(2026, 2, 10, 19, 0),
        description: "A great night",
        location: "Venue – City, Country",
      },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("A great night");
    expect(ics).toContain("Venue");
    expect(ics).toContain("Last.fm event:");
  });

  it("uses custom calendar name", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "E",
        url: "https://www.last.fm/event/1",
        startsAt: new Date(2026, 0, 1, 12, 0),
      },
    ];
    const ics = builder.build(events, "My Calendar");
    expect(ics).toContain("My Calendar");
  });

  it("excludes non-last.fm URLs from output", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "E",
        url: "https://evil.com/event/1",
        startsAt: new Date(2026, 0, 1, 12, 0),
      },
    ];
    const ics = builder.build(events);
    expect(ics).not.toContain("evil.com");
  });
});
