import { promises as fs } from "fs";
import path from "path";
import { ILastFmEvent } from "./ILastFmEvent";
import { AppConfiguration } from "./AppConfiguration";
import { EventIdHelper } from "./EventIdHelper";
import { Logger } from "./Logger";

interface CachedEventEntry {
  event: ILastFmEvent & { startsAt?: unknown };
  updatedAt: string;
}

interface CacheFile {
  version: number;
  events: Record<string, CachedEventEntry>;
}

/**
 * File-based cache for Last.fm events. Persists events to JSON and restores
 * them (including Date fields) on read. Merge only updates current/future events.
 */
export class EventCache {
  private readonly _config: AppConfiguration;
  private readonly _logger: Logger;

  public constructor(config: AppConfiguration, logger: Logger) {
    this._config = config;
    this._logger = logger;
  }

  /**
   * Returns all cached events (e.g. for the single configured user).
   */
  public async getEvents(): Promise<ILastFmEvent[]> {
    const cache = await this.readCacheFile();
    return Object.values(cache.events).map((e) => this.normalizeEvent(e.event));
  }

  /**
   * Merges scraped events into the cache (only current/future events are updated),
   * persists to disk, and returns the combined list sorted by start date.
   */
  public async mergeAndPersist(
    scrapedEvents: ILastFmEvent[],
    now: Date = new Date()
  ): Promise<ILastFmEvent[]> {
    const cache = await this.readCacheFile();
    const existing = cache.events;

    for (const event of scrapedEvents) {
      const isFutureOrCurrent =
        !event.startsAt || event.startsAt.getTime() >= now.getTime();
      if (!isFutureOrCurrent) continue;

      const key = EventIdHelper.getStableEventId(event.id);
      existing[key] = {
        event: event as ILastFmEvent & { startsAt?: unknown },
        updatedAt: now.toISOString(),
      };
    }

    const combined: ILastFmEvent[] = Object.values(existing).map((e) =>
      this.normalizeEvent(e.event)
    );
    await this.writeCacheFile(cache);
    combined.sort((a, b) => this.compareByStartDate(a, b));
    return combined;
  }

  private async readCacheFile(): Promise<CacheFile> {
    const cachePath = this._config.cacheFilePath;
    const defaultCache: CacheFile = { version: 1, events: {} };

    try {
      const data = await fs.readFile(cachePath, "utf8");
      const parsed = JSON.parse(data) as CacheFile;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        parsed.version !== 1 ||
        !parsed.events
      ) {
        return defaultCache;
      }
      for (const entry of Object.values(parsed.events)) {
        if (!entry?.event) continue;
        const evt = entry.event;
        if (typeof evt.startsAt === "string") {
          const d = new Date(evt.startsAt);
          evt.startsAt = Number.isNaN(d.getTime()) ? undefined : d;
        }
      }
      return parsed;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return defaultCache;
      }
      this._logger.warn({ err: error, cachePath }, "Failed to read cache file");
      return defaultCache;
    }
  }

  private async writeCacheFile(cache: CacheFile): Promise<void> {
    const cachePath = this._config.cacheFilePath;
    const dir = path.dirname(cachePath);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
    } catch (error) {
      this._logger.warn({ err: error, cachePath }, "Failed to write cache file");
    }
  }

  private normalizeEvent(evt: ILastFmEvent & { startsAt?: unknown }): ILastFmEvent {
    return {
      ...evt,
      startsAt:
        evt.startsAt instanceof Date ? evt.startsAt : undefined,
    };
  }

  private compareByStartDate(a: ILastFmEvent, b: ILastFmEvent): number {
    if (!a.startsAt && !b.startsAt) return 0;
    if (!a.startsAt) return 1;
    if (!b.startsAt) return -1;
    return a.startsAt.getTime() - b.startsAt.getTime();
  }
}
