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
  describe("session cookie", () => {
    const okResponse = () =>
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("<html>ok</html>"),
      });

    const sentHeaders = (mockFetch: ReturnType<typeof vi.fn>) =>
      mockFetch.mock.calls[0][1].headers as Record<string, string>;

    it("sends no Cookie header when not configured", async () => {
      const mockFetch = okResponse();
      vi.stubGlobal("fetch", mockFetch);
      const fetcher = new LastFmHtmlFetcher("test@example.com");
      await fetcher.fetch("https://www.last.fm/event/1");
      expect(fetcher.hasSessionCookie).toBe(false);
      expect(sentHeaders(mockFetch)).not.toHaveProperty("Cookie");
    });

    it("ignores a blank cookie", () => {
      expect(new LastFmHtmlFetcher("a@b.co", undefined, "   ").hasSessionCookie).toBe(false);
    });

    it("wraps a bare value as sessionid", async () => {
      const mockFetch = okResponse();
      vi.stubGlobal("fetch", mockFetch);
      const fetcher = new LastFmHtmlFetcher("a@b.co", undefined, " abc123 ");
      await fetcher.fetch("https://www.last.fm/event/1");
      expect(fetcher.hasSessionCookie).toBe(true);
      expect(sentHeaders(mockFetch).Cookie).toBe("sessionid=abc123");
    });

    it("uses a full Cookie header string as-is", async () => {
      const mockFetch = okResponse();
      vi.stubGlobal("fetch", mockFetch);
      const fetcher = new LastFmHtmlFetcher("a@b.co", undefined, "sessionid=abc; csrftoken=xyz");
      await fetcher.fetch("https://www.last.fm/event/1");
      expect(sentHeaders(mockFetch).Cookie).toBe("sessionid=abc; csrftoken=xyz");
    });

    it("rejects cookies with line breaks", () => {
      expect(() => new LastFmHtmlFetcher("a@b.co", undefined, "abc\r\nX-Evil: 1")).toThrow(/line breaks/);
    });

    it("never sends the cookie to disallowed hosts", async () => {
      const mockFetch = okResponse();
      vi.stubGlobal("fetch", mockFetch);
      const fetcher = new LastFmHtmlFetcher("a@b.co", undefined, "abc");
      await expect(fetcher.fetch("https://evil.com/")).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("hints at an expired cookie on 503 when configured", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }));
      const fetcher = new LastFmHtmlFetcher("a@b.co", undefined, "abc");
      await expect(fetcher.fetch("https://www.last.fm/event/1")).rejects.toThrow(/session cookie may have expired/);
    });

    it("suggests a cookie on 503 when not configured", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }));
      const fetcher = new LastFmHtmlFetcher("a@b.co");
      await expect(fetcher.fetch("https://www.last.fm/event/1")).rejects.toThrow(/consider configuring a session cookie/);
    });

    it("does not include the cookie value in error messages", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }));
      const fetcher = new LastFmHtmlFetcher("a@b.co", undefined, "supersecret");
      await expect(fetcher.fetch("https://www.last.fm/event/1")).rejects.not.toThrow(/supersecret/);
    });
  });

  it("throws when Last.fm serves a bot challenge page with HTTP 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<html><head><title>Client Challenge</title></head></html>"),
    }));
    const fetcher = new LastFmHtmlFetcher("a@b.co");
    await expect(fetcher.fetch("https://www.last.fm/event/1")).rejects.toThrow(/bot challenge/);
  });
});
