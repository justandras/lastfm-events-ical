import { describe, it, expect } from "vitest";
import { EventDetailParser } from "../src/EventDetailParser";

const pageUrl = "https://www.last.fm/event/4971249+Worakls+Orchestra";

describe("EventDetailParser", () => {
  const parser = new EventDetailParser();

  it("returns null when no title found", () => {
    const html = "<html><body><p>No h1 or title</p></body></html>";
    expect(parser.parse(html, pageUrl)).toBeNull();
  });

  it("extracts title from h1", () => {
    const html = "<html><body><h1>My Event</h1></body></html>";
    const event = parser.parse(html, pageUrl);
    expect(event).not.toBeNull();
    expect(event!.title).toBe("My Event");
    expect(event!.url).toBe(pageUrl);
    expect(event!.id).toBe("4971249+Worakls+Orchestra");
  });

  it("falls back to title tag when no h1", () => {
    const html =
      '<html><head><title>Page Title - Last.fm</title></head><body></body></html>';
    const event = parser.parse(html, pageUrl);
    expect(event).not.toBeNull();
    expect(event!.title).toBe("Page Title - Last.fm");
  });

  it("extracts datetime from time[datetime]", () => {
    const html = `
      <html><body>
        <h1>Event</h1>
        <time datetime="2026-03-14T18:30:00+01:00">14 March 2026</time>
      </body></html>
    `;
    const event = parser.parse(html, pageUrl);
    expect(event).not.toBeNull();
    expect(event!.startsAt).toBeInstanceOf(Date);
    expect(event!.startsAt!.getFullYear()).toBe(2026);
    expect(event!.startsAt!.getMonth()).toBe(2);
    expect(event!.startsAt!.getDate()).toBe(14);
  });

  it("extracts human-readable date (day month year at time)", () => {
    const html = `
      <html><body>
        <h1>Event</h1>
        <h3>Date</h3>
        <p>14 March 2026 at 6:30pm</p>
      </body></html>
    `;
    const event = parser.parse(html, pageUrl);
    expect(event).not.toBeNull();
    expect(event!.startsAt).toBeInstanceOf(Date);
    expect(event!.startsAt!.getFullYear()).toBe(2026);
    expect(event!.startsAt!.getMonth()).toBe(2);
    expect(event!.startsAt!.getDate()).toBe(14);
    expect(event!.startsAt!.getHours()).toBe(18);
    expect(event!.startsAt!.getMinutes()).toBe(30);
  });

  it("extracts venue and location", () => {
    const html = `
      <html><body>
        <h1>Gig</h1>
        <span itemprop="location">AFAS Live</span>
        <span itemprop="addressLocality">Amsterdam</span>
        <span itemprop="addressCountry">Netherlands</span>
      </body></html>
    `;
    const event = parser.parse(html, pageUrl);
    expect(event).not.toBeNull();
    expect(event!.venue).toBe("AFAS Live");
    expect(event!.city).toBe("Amsterdam");
    expect(event!.country).toBe("Netherlands");
    expect(event!.location).toContain("AFAS Live");
    expect(event!.location).toContain("Amsterdam");
    expect(event!.location).toContain("Netherlands");
  });

  it("preserves line breaks in description (<br> and <p>)", () => {
    const html = `
      <html><body>
        <h1>Gig</h1>
        <div itemprop="description">
          <p>Timetable<br>6:30 PM - Doors open<br>8:00 PM - Show starts</p>
          <p>Second paragraph here.</p>
        </div>
      </body></html>
    `;
    const event = parser.parse(html, pageUrl);
    expect(event).not.toBeNull();
    expect(event!.description).toBe(
      "Timetable\n6:30 PM - Doors open\n8:00 PM - Show starts\n\nSecond paragraph here."
    );
  });

  it("extracts event id from URL path", () => {
    const urlWithSlug = "https://www.last.fm/event/12345+Artist+Venue";
    const html = "<html><body><h1>E</h1></body></html>";
    const event = parser.parse(html, urlWithSlug);
    expect(event!.id).toBe("12345+Artist+Venue");
  });
});
