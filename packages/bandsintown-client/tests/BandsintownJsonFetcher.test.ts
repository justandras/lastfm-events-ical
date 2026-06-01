import { describe, it, expect } from "vitest";
import { BandsintownJsonFetcher } from "../src/BandsintownJsonFetcher";

const EXAMPLE_ARTIST = "artist name from api url";
const EXAMPLE_APP_ID = "your app ID";
const EXAMPLE_EVENT_ID = "12345";

describe("BandsintownJsonFetcher", () => {
  describe("isAllowedApiUrl", () => {
    it("allows rest.bandsintown.com over https", () => {
      expect(
        BandsintownJsonFetcher.isAllowedApiUrl(
          `https://rest.bandsintown.com/artists/${encodeURIComponent(EXAMPLE_ARTIST)}/events?app_id=${encodeURIComponent(EXAMPLE_APP_ID)}`
        )
      ).toBe(true);
    });

    it("rejects other hosts and http", () => {
      expect(
        BandsintownJsonFetcher.isAllowedApiUrl("http://rest.bandsintown.com/x")
      ).toBe(false);
      expect(
        BandsintownJsonFetcher.isAllowedApiUrl("https://evil.com/x")
      ).toBe(false);
    });
  });

  describe("isAllowedUrl", () => {
    it("allows bandsintown.com event and ticket URLs", () => {
      expect(
        BandsintownJsonFetcher.isAllowedUrl(
          `https://www.bandsintown.com/e/${EXAMPLE_EVENT_ID}`
        )
      ).toBe(true);
      expect(
        BandsintownJsonFetcher.isAllowedUrl(
          `https://www.bandsintown.com/t/${EXAMPLE_EVENT_ID}`
        )
      ).toBe(true);
    });

    it("rejects non-bandsintown URLs", () => {
      expect(BandsintownJsonFetcher.isAllowedUrl("https://evil.com/e/1")).toBe(
        false
      );
    });
  });

  it("fetch rejects disallowed API URLs", async () => {
    const fetcher = new BandsintownJsonFetcher();
    await expect(
      fetcher.fetch("https://evil.com/artists/x/events")
    ).rejects.toThrow(/not allowed/i);
  });
});
