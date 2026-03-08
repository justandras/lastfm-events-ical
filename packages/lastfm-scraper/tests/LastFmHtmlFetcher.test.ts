import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LastFmHtmlFetcher } from "../src/LastFmHtmlFetcher";

/** Ensure no test can trigger real HTTP: stub fetch by default so tests never hit the network. */
const noNetworkFetch = vi.fn().mockRejectedValue(new Error("Tests must not perform real network requests"));

describe("LastFmHtmlFetcher", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", noNetworkFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("isAllowedUrl", () => {
    it("allows https www.last.fm URLs", () => {
      expect(
        LastFmHtmlFetcher.isAllowedUrl("https://www.last.fm/event/123")
      ).toBe(true);
      expect(
        LastFmHtmlFetcher.isAllowedUrl("https://www.last.fm/user/foo/events")
      ).toBe(true);
    });

    it("allows http last.fm URLs", () => {
      expect(LastFmHtmlFetcher.isAllowedUrl("http://last.fm/event/123")).toBe(
        true
      );
      expect(LastFmHtmlFetcher.isAllowedUrl("http://www.last.fm/event/123")).toBe(
        true
      );
    });

    it("rejects non-last.fm hosts", () => {
      expect(LastFmHtmlFetcher.isAllowedUrl("https://evil.com/event/123")).toBe(
        false
      );
      expect(
        LastFmHtmlFetcher.isAllowedUrl("https://lastfm.evil.com/event/123")
      ).toBe(false);
    });

    it("rejects non-http(s) protocols", () => {
      expect(
        LastFmHtmlFetcher.isAllowedUrl("file:///etc/passwd")
      ).toBe(false);
      expect(
        LastFmHtmlFetcher.isAllowedUrl("ftp://www.last.fm/event/123")
      ).toBe(false);
    });

    it("rejects invalid URLs", () => {
      expect(LastFmHtmlFetcher.isAllowedUrl("not-a-url")).toBe(false);
      expect(LastFmHtmlFetcher.isAllowedUrl("")).toBe(false);
    });
  });

  describe("constructor", () => {
    it("builds User-Agent with email and default base", () => {
      const fetcher = new LastFmHtmlFetcher("test@example.com");
      expect(fetcher).toBeDefined();
      expect(() => new LastFmHtmlFetcher("test@example.com")).not.toThrow();
    });

    it("accepts custom base User-Agent", () => {
      expect(
        () => new LastFmHtmlFetcher("a@b.co", "MyApp/1.0")
      ).not.toThrow();
    });

    it("throws for invalid email", () => {
      expect(() => new LastFmHtmlFetcher("")).toThrow(/empty/);
      expect(() => new LastFmHtmlFetcher("bad")).toThrow(/does not look valid/);
    });
  });

  describe("fetch", () => {
    let fetcher: LastFmHtmlFetcher;

    beforeEach(() => {
      fetcher = new LastFmHtmlFetcher("test@example.com");
    });

    it("throws for disallowed URL", async () => {
      await expect(
        fetcher.fetch("https://evil.com/page")
      ).rejects.toThrow(/Refusing to fetch non–last.fm URL/);
    });

    it("throws when response is not ok", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        fetcher.fetch("https://www.last.fm/event/123")
      ).rejects.toThrow(/Failed to fetch/);
    });

    it("returns response text for allowed URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("<html>ok</html>"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const html = await fetcher.fetch("https://www.last.fm/event/123");
      expect(html).toBe("<html>ok</html>");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.last.fm/event/123",
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("mailto:test@example.com"),
          }),
        })
      );
    });
  });
});
