import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AppConfiguration } from "../src/AppConfiguration";

const originalEnv = process.env;

describe("AppConfiguration", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when CONTACT_EMAIL is missing", () => {
    delete process.env.CONTACT_EMAIL;
    expect(() => AppConfiguration.load()).toThrow(/CONTACT_EMAIL/);
  });

  it("throws when CONTACT_EMAIL is empty or whitespace", () => {
    process.env.CONTACT_EMAIL = "";
    expect(() => AppConfiguration.load()).toThrow(/CONTACT_EMAIL/);
    process.env.CONTACT_EMAIL = "   ";
    expect(() => AppConfiguration.load()).toThrow(/CONTACT_EMAIL/);
  });

  it("loads contact email and default port", () => {
    process.env.CONTACT_EMAIL = "me@example.com";
    delete process.env.PORT;
    delete process.env.LASTFM_USERNAME;
    delete process.env.CACHE_FILE_PATH;
    delete process.env.LIVE_DATA;
    const config = AppConfiguration.load();
    expect(config.contactEmail).toBe("me@example.com");
    expect(config.port).toBe(3000);
    expect(config.defaultUsername).toBeUndefined();
    expect(config.cacheFilePath).toBe("/data/events-cache.json");
    expect(config.liveData).toBe(false);
    expect(config.baseUserAgent).toBe("lastfm-events-ical/1.0");
  });

  it("loads PORT from env", () => {
    process.env.CONTACT_EMAIL = "a@b.co";
    process.env.PORT = "8080";
    const config = AppConfiguration.load();
    expect(config.port).toBe(8080);
  });

  it("falls back to 3000 when PORT is invalid", () => {
    process.env.CONTACT_EMAIL = "a@b.co";
    process.env.PORT = "not-a-number";
    const config = AppConfiguration.load();
    expect(config.port).toBe(3000);
  });

  it("loads LASTFM_USERNAME and LIVE_DATA", () => {
    process.env.CONTACT_EMAIL = "a@b.co";
    process.env.LASTFM_USERNAME = "MyUser";
    process.env.LIVE_DATA = "true";
    const config = AppConfiguration.load();
    expect(config.defaultUsername).toBe("MyUser");
    expect(config.liveData).toBe(true);
  });

  it("treats LIVE_DATA=1 as true", () => {
    process.env.CONTACT_EMAIL = "a@b.co";
    process.env.LIVE_DATA = "1";
    const config = AppConfiguration.load();
    expect(config.liveData).toBe(true);
  });

  it("loads CACHE_FILE_PATH and LASTFM_SCRAPER_UA", () => {
    process.env.CONTACT_EMAIL = "a@b.co";
    process.env.CACHE_FILE_PATH = "/tmp/cache.json";
    process.env.LASTFM_SCRAPER_UA = "MyBot/1.0";
    const config = AppConfiguration.load();
    expect(config.cacheFilePath).toBe("/tmp/cache.json");
    expect(config.baseUserAgent).toBe("MyBot/1.0");
  });
});
