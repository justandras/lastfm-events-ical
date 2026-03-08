import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { AppConfiguration } from "../src/AppConfiguration";
import { EventCache } from "../src/EventCache";
import { Logger } from "../src/Logger";
import { ILastFmEvent } from "../src/ILastFmEvent";

describe("EventCache", () => {
  let cacheDir: string;
  let cachePath: string;
  let config: AppConfiguration;
  let logger: Logger;
  let cache: EventCache;

  beforeEach(async () => {
    cacheDir = path.join(os.tmpdir(), `event-cache-test-${Date.now()}`);
    cachePath = path.join(cacheDir, "cache.json");
    await fs.mkdir(cacheDir, { recursive: true });
    config = {
      get contactEmail(): string {
        return "test@example.com";
      },
      get port(): number {
        return 3000;
      },
      get defaultUsername(): string {
        return "user";
      },
      get baseUserAgent(): string {
        return "test/1.0";
      },
      get cacheFilePath(): string {
        return cachePath;
      },
      get liveData(): boolean {
        return false;
      },
    } as AppConfiguration;
    logger = new Logger("silent");
    cache = new EventCache(config, logger);
  });

  afterEach(async () => {
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("getEvents returns empty array when no cache file", async () => {
    const events = await cache.getEvents();
    expect(events).toEqual([]);
  });

  it("mergeAndPersist writes and getEvents reads back", async () => {
    const scraped: ILastFmEvent[] = [
      {
        id: "12345+Slug",
        title: "Concert",
        url: "https://www.last.fm/event/12345+Slug",
        startsAt: new Date(2027, 0, 15, 19, 0),
      },
    ];
    const merged = await cache.mergeAndPersist(scraped);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Concert");
    expect(merged[0].id).toBe("12345+Slug");

    const fromCache = await cache.getEvents();
    expect(fromCache).toHaveLength(1);
    expect(fromCache[0].title).toBe("Concert");
    expect(fromCache[0].startsAt).toBeInstanceOf(Date);
    expect(fromCache[0].startsAt!.getFullYear()).toBe(2027);
  });

  it("mergeAndPersist does not overwrite past events with scraped", async () => {
    const past: ILastFmEvent[] = [
      {
        id: "1+Past",
        title: "Past Event",
        url: "https://www.last.fm/event/1+Past",
        startsAt: new Date(2020, 0, 1, 20, 0),
      },
    ];
    await cache.mergeAndPersist(past, new Date(2019, 0, 1));
    const future: ILastFmEvent[] = [
      {
        id: "2+Future",
        title: "Future Event",
        url: "https://www.last.fm/event/2+Future",
        startsAt: new Date(2028, 0, 1, 20, 0),
      },
    ];
    const merged = await cache.mergeAndPersist(
      future,
      new Date(2025, 5, 1)
    );
    expect(merged).toHaveLength(2);
    const titles = merged.map((e) => e.title).sort();
    expect(titles).toContain("Past Event");
    expect(titles).toContain("Future Event");
  });

  it("restores startsAt as Date when cache has ISO string", async () => {
    const cacheContent = {
      version: 1,
      events: {
        "12345": {
          event: {
            id: "12345+Slug",
            title: "E",
            url: "https://www.last.fm/event/12345+Slug",
            startsAt: "2026-12-31T20:00:00.000Z",
          },
          updatedAt: new Date().toISOString(),
        },
      },
    };
    await fs.writeFile(
      cachePath,
      JSON.stringify(cacheContent),
      "utf8"
    );
    const events = await cache.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].startsAt).toBeInstanceOf(Date);
    expect(events[0].startsAt!.getFullYear()).toBe(2026);
  });
});
