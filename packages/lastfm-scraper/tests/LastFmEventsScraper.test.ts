import { describe, it, expect, vi } from "vitest";
import { LastFmEventsScraper } from "../src/LastFmEventsScraper";
import { IHtmlFetcher } from "../src/IHtmlFetcher";

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
});
