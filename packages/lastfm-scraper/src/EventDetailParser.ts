import * as cheerio from 'cheerio'
import { LastFmEvent } from './LastFmEvent'

/** Regex for human-readable date/time (e.g. "14 March 2026 at 6:30pm"). */
const HUMAN_DATE_REGEX = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*(am|pm)?/i

const MONTH_NAMES: Record<string, number> = {
	january: 1,
	february: 2,
	march: 3,
	april: 4,
	may: 5,
	june: 6,
	july: 7,
	august: 8,
	september: 9,
	october: 10,
	november: 11,
	december: 12,
}

/**
 * Parses a single Last.fm event detail page and returns a structured event.
 */
export class EventDetailParser {
	/**
	 * Parses the event detail page HTML into a LastFmEvent, or null if no title found.
	 * @param html - Raw HTML of the event detail page.
	 * @param pageUrl - URL of the page (used for id and url on the event).
	 */
	public parse(html: string, pageUrl: string): LastFmEvent | null {
		const $ = cheerio.load(html)
		const title = $('h1').first().text().trim() || $('title').first().text().trim() || undefined

		if (!title) return null

		const startsAt = this.parseStartDate($)
		const { venue, venueWebsite, city, country, location, description } = this.parseLocationAndDescription($)

		const id = this.extractEventIdFromUrl(pageUrl)

		return new LastFmEvent({
			id,
			title,
			url: pageUrl,
			startsAt,
			venue: venue || undefined,
			venueWebsite: venueWebsite || undefined,
			city: city || undefined,
			country: country || undefined,
			location: location || undefined,
			description: description || undefined,
		})
	}

	private parseStartDate($: cheerio.CheerioAPI): Date | undefined {
		const timeEl = $('time[datetime]').first()
		const datetimeAttr = timeEl.attr('datetime')
		if (datetimeAttr) {
			const parsed = new Date(datetimeAttr)
			if (!Number.isNaN(parsed.getTime())) return parsed
		}
		return this.parseDateFromPageText($)
	}

	private parseDateFromPageText($: cheerio.CheerioAPI): Date | undefined {
		let dateText: string | undefined

		const dateLabel = $('h3, h2, dt')
			.filter((_, el) => $(el).text().trim().toLowerCase() === 'date')
			.first()

		if (dateLabel.length) {
			const sibling = dateLabel.next()
			dateText = sibling.text().trim() || sibling.next().text().trim()
		}

		if (!dateText) {
			const fallbackRegex = /(\d{1,2})\s+[A-Za-z]+\s+\d{4}.*\d{1,2}:\d{2}\s*(am|pm)?/i
			const candidate = $('p, div, span')
				.filter((_, el) => fallbackRegex.test($(el).text().trim()))
				.first()
			if (candidate.length) dateText = candidate.text().trim()
		}

		if (!dateText) return undefined
		return this.parseHumanReadableDate(dateText)
	}

	private parseHumanReadableDate(text: string): Date | undefined {
		const match = HUMAN_DATE_REGEX.exec(text)
		if (!match) return undefined

		const [, dayStr, monthName, yearStr, hourStr, minuteStr, ampmRaw] = match
		const day = Number.parseInt(dayStr, 10)
		const year = Number.parseInt(yearStr, 10)
		const minute = Number.parseInt(minuteStr, 10)
		let hour = Number.parseInt(hourStr, 10)

		const month = MONTH_NAMES[monthName.toLowerCase()]
		if (!month) return undefined

		if (ampmRaw) {
			const ampm = ampmRaw.toLowerCase()
			if (ampm === 'pm' && hour < 12) hour += 12
			else if (ampm === 'am' && hour === 12) hour = 0
		}

		// Last.fm renders these dates in the viewer's locale; treat them as local time.
		const date = new Date(year, month - 1, day, hour, minute)
		return Number.isNaN(date.getTime()) ? undefined : date
	}

	private parseLocationAndDescription($: cheerio.CheerioAPI): {
		venue: string
		venueWebsite: string
		city: string
		country: string
		location: string
		description: string
	} {
		const locationEl = $('[itemprop="location"]').first()
		const venue =
			locationEl.text().trim() ||
			$('a[href*="/venue/"]').first().text().trim() ||
			$('p:contains("Venue")')
				.first()
				.text()
				.replace(/Venue[:\s]*/i, '')
				.trim() ||
			''
		const city =
			$('[itemprop="addressLocality"]').first().text().trim() ||
			$('span[class*="location"]').first().text().trim() ||
			''
		const country = $('[itemprop="addressCountry"]').first().text().trim() || ''
		const venueWebsite = this.extractVenueWebsite(locationEl)
		const description = this.extractMultilineDescription($) || $('meta[name="description"]').attr('content')?.trim() || ''

		const locationParts: string[] = []
		if (city) locationParts.push(city)
		if (country) locationParts.push(country)
		const location = [venue, locationParts.join(', ')].filter(Boolean).join(' – ')

		return {
			venue: this.trimLocation(venue),
			venueWebsite,
			city,
			country,
			location: this.trimLocation(location),
			description,
		}
	}

	private extractVenueWebsite(locationEl: cheerio.Cheerio<cheerio.AnyNode>): string {
		if (!locationEl?.length) return ''

		// Prefer explicit anchor links if present.
		const hrefCandidate = locationEl
			.find('a[href^="http://"], a[href^="https://"]')
			.toArray()
			.map((el) => locationEl.find(el).attr('href')?.trim() || '')
			.find((href) => href && !/last\.fm/i.test(href) && !/google\./i.test(href))

		if (hrefCandidate) return this.normalizeWebsiteUrl(hrefCandidate)

		// Fallback: parse "Web: https://..." lines from the raw text.
		const text = locationEl.text().replace(/\r/g, '')
		const match = text.match(/^\s*Web:\s*(https?:\/\/\S+)\s*$/im)
		return match?.[1] ? this.normalizeWebsiteUrl(match[1]) : ''
	}

	private normalizeWebsiteUrl(url: string): string {
		return url.trim().replace(/[),.]+$/g, '')
	}

	private extractMultilineDescription($: cheerio.CheerioAPI): string {
		const desc = $('[itemprop="description"]').first()
		if (!desc.length) return ''

		const html = desc.html() ?? ''
		if (!html.trim()) return this.normalizeDescription(desc.text())

		// Convert <br> to line breaks and paragraph boundaries to blank lines, then strip remaining tags.
		const withLineBreaks = html
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
			.replace(/<\/p>/gi, '\n\n')

		// Strip remaining tags but keep our injected newlines, then decode entities via cheerio.
		const noTags = withLineBreaks.replace(/<[^>]+>/g, '')
		const decoded = cheerio.load(`<div>${noTags}</div>`).text()
		const normalized = this.normalizeDescription(decoded)
		return normalized
	}

	private normalizeDescription(descriptionText: string): string {
		// For descriptions we preserve line breaks and spacing as much as possible.
		// We only normalize CRLF and collapse excessive blank lines.
		return descriptionText
			.replace(/\r/g, '')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	}

	private trimLocation(locationString: string): string {
		return locationString
			.replace(/^Location\s*/i, '') // remove "Location" at the start
			.replace(/^\s*Web:\s*https?:\/\/\S+\s*$/gim, '') // drop "Web: <url>" lines
			.replace(/^\s*Show on map\s*[–-].*$/gim, '') // drop "Show on map – ..." lines
			.replace(/\r/g, '')
			.replace(/[ \t]+/g, ' ') // collapse spaces/tabs
			.replace(/ *\n */g, '\n') // trim spaces around line breaks
			.replace(/\n{3,}/g, '\n\n') // collapse excessive blank lines
			.trim()
	}

	private extractEventIdFromUrl(url: string): string {
		const match = url.match(/\/event\/([^/]+)/)
		return match?.[1] ?? url
	}
}
