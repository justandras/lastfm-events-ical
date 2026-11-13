import { describe, it, expect } from "vitest";
import { EventListParser } from "../src/EventListParser";
import { LastFmHtmlFetcher } from "../src/LastFmHtmlFetcher";

const isAllowedUrl = (url: string) => LastFmHtmlFetcher.isAllowedUrl(url);

// Trimmed from a real Last.fm user events page row.
const listRowHtml = `
  <table><tbody>
    <tr class="events-list-item js-link-block">
      <td class="events-list-item-art">
        <time datetime="2026-12-04T00:00:00" class="calendar-icon">Dec 4</time>
      </td>
      <td class="events-list-item-event">
        <div class="events-list-item-event--title">
          <a href="/event/5076218+Aura+at+fi+w%2F+SHDW+all+night+long" class="link-block-target">
            Aura at fi w/ SHDW all night long
          </a>
        </div>
        <div class="events-list-item-event--lineup">
          SHDW,
          Gutkind,
          Szunflower
        </div>
        <a href="/event/5076218+Aura+at+fi+w%2F+SHDW+all+night+long" class="events-list-cover-link"></a>
      </td>
      <td class="events-list-item-venue">
        <div class="events-list-item-venue--title">Ursprung Fi</div>
        <div class="events-list-item-venue--address">
          <div class="events-list-item-venue--city">Köln</div>
          <div class="events-list-item-venue--country">Germany</div>
        </div>
      </td>
      <td class="events-list-item-attendees">
        <a href="/event/5076218+Aura+at+fi+w%2F+SHDW+all+night+long/attendance">1 going</a>
      </td>
    </tr>
  </tbody></table>
`;

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

  it("extracts festival links and excludes festival attendance links", () => {
    const html = `
      <a href="/event/5056021+Liquicity+Heidelberg">Event</a>
      <a href="/festival/5068797+Liquicity+Festival+2027">Festival</a>
      <a href="https://www.last.fm/festival/5068797+Liquicity+Festival+2027">Again</a>
      <a href="/festival/5068797+Liquicity+Festival+2027/attendance">Attend</a>
    `;
    const urls = parser.parse(html, isAllowedUrl);
    expect(urls).toEqual([
      "https://www.last.fm/event/5056021+Liquicity+Heidelberg",
      "https://www.last.fm/festival/5068797+Liquicity+Festival+2027",
    ]);
  });

  describe("parseItems", () => {
    it("extracts title, date, venue and lineup from event rows", () => {
      expect(parser.parseItems(listRowHtml, isAllowedUrl)).toEqual([
        {
          url: "https://www.last.fm/event/5076218+Aura+at+fi+w%2F+SHDW+all+night+long",
          title: "Aura at fi w/ SHDW all night long",
          date: new Date(2026, 11, 4),
          venue: "Ursprung Fi",
          city: "Köln",
          country: "Germany",
          lineup: ["SHDW", "Gutkind", "Szunflower"],
        },
      ]);
    });

    it("returns nothing for links outside event rows or disallowed URLs", () => {
      expect(parser.parseItems('<a href="/event/1+X">X</a>', isAllowedUrl)).toEqual([]);
      expect(parser.parseItems(listRowHtml, () => false)).toEqual([]);
    });
  });
});
