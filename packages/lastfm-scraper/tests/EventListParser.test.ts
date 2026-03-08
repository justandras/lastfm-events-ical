import { describe, it, expect } from "vitest";
import { EventListParser } from "../src/EventListParser";
import { LastFmHtmlFetcher } from "../src/LastFmHtmlFetcher";

const isAllowedUrl = (url: string) => LastFmHtmlFetcher.isAllowedUrl(url);

describe("EventListParser", () => {
  const parser = new EventListParser();

  it("returns empty array for empty HTML", () => {
    expect(parser.parse("", isAllowedUrl)).toEqual([]);
    expect(parser.parse("<html><body></body></html>", isAllowedUrl)).toEqual(
      []
    );
  });

  it("extracts event links with relative href", () => {
    const html = `
      <html>
        <body>
          <a href="/event/123+Some+Event">Event 1</a>
          <a href="/event/456+Other">Event 2</a>
        </body>
      </html>
    `;
    const urls = parser.parse(html, isAllowedUrl);
    expect(urls).toContain("https://www.last.fm/event/123+Some+Event");
    expect(urls).toContain("https://www.last.fm/event/456+Other");
    expect(urls).toHaveLength(2);
  });

  it("extracts event links with absolute href", () => {
    const html = `
      <a href="https://www.last.fm/event/789+Absolute">Event</a>
    `;
    const urls = parser.parse(html, isAllowedUrl);
    expect(urls).toContain("https://www.last.fm/event/789+Absolute");
    expect(urls).toHaveLength(1);
  });

  it("excludes attendance links", () => {
    const html = `
      <a href="/event/123+Event">Event</a>
      <a href="https://www.last.fm/event/123+Event/attendance">Attend</a>
      <a href="/event/123+Event/attendance/">Attend 2</a>
    `;
    const urls = parser.parse(html, isAllowedUrl);
    expect(urls).toContain("https://www.last.fm/event/123+Event");
    expect(urls).not.toContain(
      "https://www.last.fm/event/123+Event/attendance"
    );
    expect(urls).toHaveLength(1);
  });

  it("deduplicates same event URL", () => {
    const html = `
      <a href="/event/1+Same">Link 1</a>
      <a href="/event/1+Same">Link 2</a>
    `;
    const urls = parser.parse(html, isAllowedUrl);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe("https://www.last.fm/event/1+Same");
  });

  it("filters by isAllowedUrl", () => {
    const html = `<a href="/event/123+Event">Event</a>`;
    const onlyOdd = (url: string) =>
      /event\/123/.test(url) && LastFmHtmlFetcher.isAllowedUrl(url);
    const rejectAll = () => false;
    expect(parser.parse(html, onlyOdd)).toHaveLength(1);
    expect(parser.parse(html, rejectAll)).toHaveLength(0);
  });

  it("uses custom baseUrl when provided", () => {
    const customParser = new EventListParser("https://last.fm");
    const html = `<a href="/event/99+Custom">E</a>`;
    const urls = customParser.parse(html, isAllowedUrl);
    expect(urls[0]).toBe("https://last.fm/event/99+Custom");
  });
});
