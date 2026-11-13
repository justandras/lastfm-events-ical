import { describe, it, expect } from "vitest";
import { IcalFeedBuilder } from "../src/IcalFeedBuilder";
import { ILastFmEvent } from "../src/ILastFmEvent";
import { BandsintownJsonFetcher } from "bandsintown-events-client";

describe("IcalFeedBuilder", () => {
  const builder = new IcalFeedBuilder({
    timeZone: "Europe/Berlin",
    now: new Date(2026, 0, 1, 0, 0, 0),
  });

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
    expect(ics).toContain("X-WR-TIMEZONE:Europe/Berlin");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("TZID:Europe/Berlin");
    expect(ics).toContain("BEGIN:STANDARD");
    // VTIMEZONE transition times should not have random seconds.
    expect(ics).toMatch(/DTSTART:\d{8}T\d{4}00/);
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
        venueWebsite: "https://www.club-circle.at/",
        description: "A great night",
        location: "Venue – City, Country",
      },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("A great night");
    expect(ics).toContain("Venue");
    // First line of DESCRIPTION is the event URL.
    expect(ics).toContain("DESCRIPTION:https://www.last.fm/event/1");
    expect(ics).toContain("Venue: https://www.club-circle.at/");
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

  it("uses 4-hour duration when endsAt is missing", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "E",
        url: "https://www.last.fm/event/1",
        startsAt: new Date(2026, 0, 1, 20, 0),
      },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("DURATION:PT4H");
    expect(ics).not.toMatch(/DTEND:\d{8}T\d{6}/);
  });

  it("uses DTEND when endsAt is after startsAt", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "Festival",
        url: "https://www.bandsintown.com/e/1",
        startsAt: new Date(2026, 7, 13, 19, 0),
        endsAt: new Date(2026, 7, 17, 23, 59),
      },
    ];
    const ics = builder.build(events, "Example", {
      isAllowedEventUrl: BandsintownJsonFetcher.isAllowedUrl,
    });
    expect(ics).toContain("DTEND:20260817T235900");
    expect(ics).not.toContain("DURATION:");
  });

  it("falls back to 4-hour duration when endsAt is not after startsAt", () => {
    const events: ILastFmEvent[] = [
      {
        id: "1",
        title: "E",
        url: "https://www.last.fm/event/1",
        startsAt: new Date(2026, 0, 1, 20, 0),
        endsAt: new Date(2026, 0, 1, 18, 0),
      },
    ];
    const ics = builder.build(events);
    expect(ics).toContain("DURATION:PT4H");
  });

  it("uses custom uid prefix and allowlist for Bandsintown feeds", () => {
    const events: ILastFmEvent[] = [
      {
        id: "12345",
        title: "Example Event Title",
        url: "https://www.bandsintown.com/e/12345",
        startsAt: new Date(2026, 5, 3, 22, 0),
      },
    ];
    const ics = builder.build(events, "artist name from api url Events", {
      uidPrefix: "BANDSINTOWN-ICAL",
      stableEventIds: false,
      isAllowedEventUrl: BandsintownJsonFetcher.isAllowedUrl,
      productId: "bandsintown-events-ical",
    });
    expect(ics).toContain("BANDSINTOWN-ICAL-12345");
    expect(ics).toContain("https://www.bandsintown.com/e/12345");
    expect(ics).not.toContain("LASTFM-ICAL");
  });

  it("flags incomplete events in the title and description and makes them all-day", () => {
    const ics = builder.build([
      {
        id: "5076218+Aura",
        title: "Aura at fi w/ SHDW all night long",
        url: "https://www.last.fm/event/5076218+Aura",
        startsAt: new Date(2026, 11, 31),
        description: "Lineup: SHDW",
        incomplete: true,
      },
    ]);
    const unfolded = ics.replace(/\r?\n[ \t]/g, "");
    expect(unfolded).toContain("SUMMARY:[Incomplete] Aura at fi w/ SHDW all night long");
    expect(unfolded).toMatch(/DESCRIPTION:⚠ Incomplete: Last\.fm's event page couldn't be loaded/);
    expect(unfolded).toContain("Lineup: SHDW");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20261231");
    expect(unfolded).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("does not flag complete events", () => {
    const ics = builder.build([
      { id: "1", title: "Concert", url: "https://www.last.fm/event/1", startsAt: new Date(2026, 5, 15, 19, 30) },
    ]);
    expect(ics).not.toContain("[Incomplete]");
    expect(ics).not.toContain("VALUE=DATE:");
  });
});
