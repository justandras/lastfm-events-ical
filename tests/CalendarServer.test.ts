import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "http";
import { CalendarServer } from "../src/CalendarServer";
import { AppConfiguration } from "../src/AppConfiguration";
import { EventCache } from "../src/EventCache";
import { IcalFeedBuilder } from "../src/IcalFeedBuilder";
import { BackgroundScrapeScheduler } from "../src/BackgroundScrapeScheduler";
import { Logger } from "../src/Logger";
import { LastFmEventsScraper } from "lastfm-events-scraper";

describe("CalendarServer", () => {
  let config: AppConfiguration;
  let cache: EventCache;
  let scraper: LastFmEventsScraper;
  let icalBuilder: IcalFeedBuilder;
  let scrapeScheduler: BackgroundScrapeScheduler;
  let logger: Logger;
  let server: CalendarServer;

  function getBoundPort(s: CalendarServer): number {
    const srv = (s as unknown as { _server: http.Server | null })._server;
    const addr = srv?.address();
    if (addr && typeof addr === "object" && "port" in addr) return addr.port;
    return 0;
  }

  beforeEach(() => {
    config = {
      get contactEmail(): string {
        return "test@example.com";
      },
      get port(): number {
        return 0;
      },
      get defaultUsername(): string {
        return "TestUser";
      },
      get baseUserAgent(): string {
        return "test/1.0";
      },
      get cacheFilePath(): string {
        return "/tmp/cache.json";
      },
      get liveData(): boolean {
        return false;
      },
    } as AppConfiguration;
    cache = {
      getEvents: vi.fn().mockResolvedValue([]),
      mergeAndPersist: vi.fn().mockResolvedValue([]),
    } as unknown as EventCache;
    scraper = {
      scrape: vi.fn().mockResolvedValue([]),
    } as unknown as LastFmEventsScraper;
    icalBuilder = new IcalFeedBuilder();
    scrapeScheduler = {
      start: vi.fn(),
    } as unknown as BackgroundScrapeScheduler;
    logger = new Logger("silent");
    server = new CalendarServer(
      config,
      cache,
      scraper,
      icalBuilder,
      scrapeScheduler,
      logger
    );
  });

  afterEach(() => {
    const srv = (server as unknown as { _server: http.Server | null })._server;
    if (srv) srv.close();
  });

  it("start() resolves when server is listening", async () => {
    await expect(server.start()).resolves.toBeUndefined();
    expect(getBoundPort(server)).toBeGreaterThan(0);
  });

  it("/health returns 200 OK", async () => {
    await server.start();
    const port = getBoundPort(server);
    const res = await new Promise<{ statusCode: number; body: string }>(
      (resolve, reject) => {
        const r = http.request(
          { host: "localhost", port, path: "/health", method: "GET" },
          (resp) => {
            let b = "";
            resp.on("data", (c) => (b += c));
            resp.on("end", () =>
              resolve({ statusCode: resp.statusCode ?? 0, body: b })
            );
          }
        );
        r.on("error", reject);
        r.end();
      }
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("OK");
  });

  it("unknown path returns 404", async () => {
    await server.start();
    const port = getBoundPort(server);
    const res = await new Promise<{ statusCode: number }>((resolve, reject) => {
      const r = http.request(
        { host: "localhost", port, path: "/unknown", method: "GET" },
        (resp) => resolve({ statusCode: resp.statusCode ?? 0 })
      );
      r.on("error", reject);
      r.end();
    });
    expect(res.statusCode).toBe(404);
  });
});
