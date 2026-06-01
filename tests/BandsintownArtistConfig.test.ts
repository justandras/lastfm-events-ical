import { describe, it, expect } from "vitest";
import { parseBandsintownArtists } from "../src/BandsintownArtistConfig";

describe("parseBandsintownArtists", () => {
  it("returns empty array when unset or blank", () => {
    expect(parseBandsintownArtists(undefined)).toEqual([]);
    expect(parseBandsintownArtists("   ")).toEqual([]);
  });

  it("parses valid artist entries", () => {
    const artists = parseBandsintownArtists(
      '[{"slug":"desired-slug","artist":"artist name from api url","appId":"your app ID"}]'
    );
    expect(artists).toEqual([
      {
        slug: "desired-slug",
        artist: "artist name from api url",
        appId: "your app ID",
      },
    ]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseBandsintownArtists("not json")).toThrow(/valid JSON/i);
  });

  it("throws on duplicate slugs", () => {
    expect(() =>
      parseBandsintownArtists(
        '[{"slug":"a","artist":"A","appId":"1"},{"slug":"a","artist":"B","appId":"2"}]'
      )
    ).toThrow(/Duplicate/);
  });

  it("rejects reserved slugs", () => {
    expect(() =>
      parseBandsintownArtists('[{"slug":"health","artist":"A","appId":"1"}]')
    ).toThrow(/reserved/i);
  });

  it("rejects invalid slug characters", () => {
    expect(() =>
      parseBandsintownArtists('[{"slug":"Bad_Slug","artist":"A","appId":"1"}]')
    ).toThrow(/Invalid Bandsintown slug/i);
  });
});
