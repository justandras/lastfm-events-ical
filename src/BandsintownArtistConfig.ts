/**
 * A configured Bandsintown artist feed (slug maps to /{slug}.ics).
 */
export interface BandsintownArtistConfig {
  slug: string;
  artist: string;
  appId: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 64;
const RESERVED_SLUGS = new Set(["health", "calendar"]);

/**
 * Parses and validates BANDSINTOWN_ARTISTS JSON from the environment.
 */
export function parseBandsintownArtists(raw: string | undefined): BandsintownArtistConfig[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("BANDSINTOWN_ARTISTS must be valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("BANDSINTOWN_ARTISTS must be a JSON array");
  }

  const seenSlugs = new Set<string>();
  const artists: BandsintownArtistConfig[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (!entry || typeof entry !== "object") {
      throw new Error(`BANDSINTOWN_ARTISTS[${i}] must be an object`);
    }

    const record = entry as Record<string, unknown>;
    const slug = readNonEmptyString(record, "slug", `BANDSINTOWN_ARTISTS[${i}].slug`);
    const artist = readNonEmptyString(
      record,
      "artist",
      `BANDSINTOWN_ARTISTS[${i}].artist`
    );
    const appId = readNonEmptyString(
      record,
      "appId",
      `BANDSINTOWN_ARTISTS[${i}].appId`
    );

    validateSlug(slug);

    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate Bandsintown slug: ${slug}`);
    }
    seenSlugs.add(slug);

    artists.push({ slug, artist, appId });
  }

  return artists;
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  label: string
): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function validateSlug(slug: string): void {
  if (slug.length > MAX_SLUG_LENGTH) {
    throw new Error(`Bandsintown slug is too long: ${slug}`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Invalid Bandsintown slug "${slug}". Use lowercase letters, digits, and hyphens.`
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`Bandsintown slug is reserved: ${slug}`);
  }
}
