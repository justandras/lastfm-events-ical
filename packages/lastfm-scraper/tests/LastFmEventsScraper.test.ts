import { describe, it, expect, vi } from "vitest";
import { LastFmEventsScraper } from "../src/LastFmEventsScraper";
import { IHtmlFetcher } from "../src/IHtmlFetcher";

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

describe("LastFmEventsScraper", () => {
  it("builds correct list URL for username", async () => {
    const mockFetcher: IHtmlFetcher = {
      fetch: vi.fn().mockImplementation((url: string) => {
        if (url.includes("/user/") && url.includes("/events")) {
          return Promise.resolve(
            "<html><body><a href=\"/event/1+One\">One</a></body></html>"
          );
        }
        return Promise.resolve(
          "<html><body><h1>One</h1><time datetime=\"2026-05-01T20:00:00Z\"></time></body></html>"
        );
      }),
    };
    const scraper = new LastFmEventsScraper(mockFetcher);
    await scraper.scrape("MyUser");
    expect(mockFetcher.fetch).toHaveBeenCalledWith(
      "https://www.last.fm/user/MyUser/events"
    );
  });

  it("encodes username in URL", async () => {
    const mockFetcher: IHtmlFetcher = {
      fetch: vi.fn().mockImplementation((url: string) => {
        if (url.includes("/user/") && url.includes("/events"))
          return Promise.resolve("<html><body></body></html>");
        return Promise.resolve("");
      }),
    };
    const scraper = new LastFmEventsScraper(mockFetcher);
    await scraper.scrape("user+with+plus");
    expect(mockFetcher.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("user+with+plus"))
    );
  });

  it("returns sorted events by start date", async () => {
    const listHtml =
      '<html><body><a href="/event/1+A">A</a><a href="/event/2+B">B</a></body></html>';
    const mockFetcher: IHtmlFetcher = {
      fetch: vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/events"))
          return Promise.resolve(listHtml);
        if (url.includes("/event/1+"))
          return Promise.resolve(
            "<html><body><h1>A</h1><time datetime=\"2026-06-01T19:00:00Z\"></time></body></html>"
          );
        if (url.includes("/event/2+"))
          return Promise.resolve(
            "<html><body><h1>B</h1><time datetime=\"2026-05-01T20:00:00Z\"></time></body></html>"
          );
        return Promise.resolve("");
      }),
    };
    const scraper = new LastFmEventsScraper(mockFetcher);
    const events = await scraper.scrape("u");
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("B");
    expect(events[1].title).toBe("A");
  });

  it("skips event when detail fetch fails", async () => {
    const mockFetcher: IHtmlFetcher = {
      fetch: vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/events"))
          return Promise.resolve(
            '<html><body><a href="/event/1+Ok">Ok</a><a href="/event/2+Fail">Fail</a></body></html>'
          );
        if (url.includes("/event/2+"))
          return Promise.reject(new Error("Network error"));
        return Promise.resolve(
          "<html><body><h1>Ok</h1></body></html>"
        );
      }),
    };
    const scraper = new LastFmEventsScraper(mockFetcher);
    const events = await scraper.scrape("u");
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Ok");
  });

  describe("events list fallback", () => {
    const fetcherWithDetail = (detail: () => Promise<string>): IHtmlFetcher => ({
      fetch: vi.fn().mockImplementation((url: string) =>
        url.endsWith("/events") ? Promise.resolve(listRowHtml) : detail()
      ),
    });

    it("builds an incomplete event from the list row when the detail page fails", async () => {
      const onEventPageError = vi.fn();
      const error = new Error("bot challenge");
      const scraper = new LastFmEventsScraper(
        fetcherWithDetail(() => Promise.reject(error)),
        undefined, undefined, undefined,
        { onEventPageError }
      );

      const events = await scraper.scrape("u");

      expect(onEventPageError).toHaveBeenCalledWith("https://www.last.fm/event/5076218+Aura+at+fi+w%2F+SHDW+all+night+long", error);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: "5076218+Aura+at+fi+w%2F+SHDW+all+night+long",
        title: "Aura at fi w/ SHDW all night long",
        url: "https://www.last.fm/event/5076218+Aura+at+fi+w%2F+SHDW+all+night+long",
        startsAt: new Date(2026, 11, 4),
        venue: "Ursprung Fi",
        city: "Köln",
        country: "Germany",
        location: "Ursprung Fi – Köln, Germany",
        description: "Lineup: SHDW, Gutkind, Szunflower",
        incomplete: true,
      });
    });

    it("falls back when the detail page has no title", async () => {
      const scraper = new LastFmEventsScraper(fetcherWithDetail(() => Promise.resolve("<html></html>")));
      const events = await scraper.scrape("u");
      expect(events[0].incomplete).toBe(true);
    });

    it("uses the detail page when it loads, and fills a missing start date from the list", async () => {
      const scraper = new LastFmEventsScraper(
        fetcherWithDetail(() => Promise.resolve("<html><body><h1>Aura full</h1></body></html>"))
      );
      const [event] = await scraper.scrape("u");
      expect(event.title).toBe("Aura full");
      expect(event.incomplete).toBeUndefined();
      expect(event.startsAt).toEqual(new Date(2026, 11, 4));
    });
  });
});
