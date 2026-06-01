import { createEvents, EventAttributes } from 'ics'
import { ILastFmEvent } from './ILastFmEvent'
import { EventIdHelper } from './EventIdHelper'
import { LastFmHtmlFetcher } from 'lastfm-events-scraper'
import { IcsTimeZone } from './IcsTimeZone'
import { IcalFeedOptions } from './IcalFeedOptions'

const MAX_TITLE_LEN = 500
const MAX_DESCRIPTION_LEN = 4000
const MAX_LOCATION_LEN = 500
const DEFAULT_DURATION_HOURS = 4

type DateTimeArray = [number, number, number, number, number]

type IcsEventTiming =
	| { duration: { hours: number } }
	| {
			end: DateTimeArray
			endInputType: 'local'
			endOutputType: 'local'
	  }

/**
 * Builds iCalendar (ICS) feed content from Last.fm events.
 * Applies length limits and URL allowlisting for user-generated content.
 */
export class IcalFeedBuilder {
	private readonly _timeZone: IcsTimeZone

	public constructor(options?: { timeZone?: string; now?: Date }) {
		this._timeZone = new IcsTimeZone({ timeZone: options?.timeZone, now: options?.now })
	}

	/**
	 * Builds a single calendar feed string from the given events.
	 * @param events - Events to include (those without startsAt are skipped).
	 * @param calendarName - Optional calendar name in the ICS header.
	 * @param options - UID prefix, URL allowlist, and related feed options.
	 */
	public build(
		events: ILastFmEvent[],
		calendarName: string = 'Last.fm Events',
		options?: IcalFeedOptions
	): string {
		const icsEvents = events
			.map((e) => this.toIcsEvent(e, options))
			.filter((e): e is EventAttributes => e !== null)

		const { error, value } = createEvents(icsEvents, { calName: calendarName })
		if (error || !value) {
			throw new Error(`Failed to generate iCal feed: ${error ?? 'unknown error'}`)
		}
		return this._timeZone.injectIntoCalendar(value)
	}

	private toIcsEvent(
		event: ILastFmEvent,
		options?: IcalFeedOptions
	): EventAttributes | null {
		if (!event.startsAt) return null

		const uidPrefix = options?.uidPrefix ?? 'LASTFM-ICAL'
		const stableEventIds = options?.stableEventIds ?? true
		const isAllowedEventUrl =
			options?.isAllowedEventUrl ?? LastFmHtmlFetcher.isAllowedUrl
		const productId = options?.productId ?? 'lastfm-events-ical'

		const eventId = stableEventIds
			? EventIdHelper.getStableEventId(event.id)
			: event.id

		const startArray = this.toDateTimeArray(event.startsAt)
		const timing = this.resolveEventTiming(event.startsAt, event.endsAt)

		const safeUrl = this.safeEventUrl(event.url, isAllowedEventUrl)
		const safeVenueWebsite = this.safeVenueWebsite(event.venueWebsite)
		const descriptionLines: string[] = []
		if (safeUrl) descriptionLines.push(`${safeUrl}`)
		if (safeUrl && safeVenueWebsite) descriptionLines.push(`Venue: ${safeVenueWebsite}`)
		if (event.description) {
			descriptionLines.push('', this.truncate(event.description, MAX_DESCRIPTION_LEN))
		}
		const description = descriptionLines.join('\n')

		return {
			uid: `${uidPrefix}-${eventId}`,
			title: this.truncate(event.title, MAX_TITLE_LEN),
			start: startArray,
			startInputType: 'local',
			startOutputType: 'local',
			...timing,
			description: description || undefined,
			location: event.location ? this.truncate(event.location, MAX_LOCATION_LEN) : undefined,
			url: safeUrl || undefined,
			productId,
		}
	}

	private toDateTimeArray(date: Date): DateTimeArray {
		return [
			date.getFullYear(),
			date.getMonth() + 1,
			date.getDate(),
			date.getHours(),
			date.getMinutes(),
		]
	}

	private resolveEventTiming(startsAt: Date, endsAt?: Date): IcsEventTiming {
		if (endsAt && endsAt.getTime() > startsAt.getTime()) {
			return {
				end: this.toDateTimeArray(endsAt),
				endInputType: 'local',
				endOutputType: 'local',
			}
		}
		return { duration: { hours: DEFAULT_DURATION_HOURS } }
	}

	private truncate(s: string, max: number): string {
		return s.length <= max ? s : s.slice(0, max - 3) + '...'
	}

	private safeEventUrl(
		url: string,
		isAllowed: (url: string) => boolean
	): string {
		return isAllowed(url) ? url : ''
	}

	private safeVenueWebsite(url: string | undefined): string {
		if (!url) return ''
		try {
			const parsed = new URL(url)
			return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : ''
		} catch {
			return ''
		}
	}
}
