export class IcsTimeZone {
	private readonly _tzid: string
	private readonly _now: Date

	public constructor(options?: { timeZone?: string; now?: Date }) {
		this._tzid = options?.timeZone || IcsTimeZone.getSystemTimeZone()
		this._now = options?.now ?? new Date()
	}

	public get tzid(): string {
		return this._tzid
	}

	/**
	 * Injects timezone information into an ICS string:
	 * - Adds TZID parameter to DTSTART lines
	 * - Adds X-WR-TIMEZONE header
	 * - Adds VTIMEZONE block for the current system timezone
	 */
	public injectIntoCalendar(ics: string): string {
		const tzid = this._tzid
		if (!tzid) return ics

		// Keep line endings consistent with the `ics` library output.
		const eol = ics.includes('\r\n') ? '\r\n' : '\n'

		// For UTC-like zones, do not rewrite DTSTART to TZID form.
		// UTC is best represented as DTSTART:...Z (not DTSTART;TZID=UTC:...).
		const isUtcLike = IcsTimeZone.isUtcLikeTzid(tzid)
		const withTzidOnDtStart = isUtcLike
			? ics
			: // 1) Add TZID on DTSTART lines (local timestamps, no trailing Z).
				ics.replace(/(^|\r?\n)DTSTART:/g, `$1DTSTART;TZID=${tzid}:`)

		// 2) Add X-WR-TIMEZONE + VTIMEZONE block once per calendar.
		const vtimezone = this.buildVTimeZoneBlock(tzid, eol)
		const injection = [`X-WR-TIMEZONE:${tzid}`, vtimezone].filter(Boolean).join(eol) + eol + eol

		const idx = withTzidOnDtStart.indexOf(`${eol}BEGIN:VEVENT`)
		if (idx === -1) {
			// No VEVENTs; still add X-WR-TIMEZONE (no need for VTIMEZONE without events).
			if (withTzidOnDtStart.includes(`X-WR-TIMEZONE:`)) return withTzidOnDtStart
			return withTzidOnDtStart.replace(
				`${eol}X-PUBLISHED-TTL:PT1H`,
				`${eol}X-PUBLISHED-TTL:PT1H${eol}X-WR-TIMEZONE:${tzid}`
			)
		}

		if (withTzidOnDtStart.includes(`X-WR-TIMEZONE:`)) return withTzidOnDtStart
		return withTzidOnDtStart.slice(0, idx + eol.length) + injection + withTzidOnDtStart.slice(idx + eol.length)
	}

	private buildVTimeZoneBlock(tzid: string, eol: string): string {
		// Generate a VTIMEZONE based on the system tzid by sampling offsets and detecting transitions.
		// This is portable across arbitrary IANA zones and encodes DST transitions via DTSTART/RDATE.
		if (!tzid || IcsTimeZone.isUtcLikeTzid(tzid)) return ''

		const year = this._now.getFullYear()
		const fromYear = year - 5
		const toYear = year + 10
		const transitions = this.findTimeZoneTransitions(tzid, fromYear, toYear)
		const initialOffsetMin = this.getOffsetMinutes(new Date(Date.UTC(fromYear, 0, 1, 0, 0, 0)), tzid)

		type Key = string
		type Component = {
			isDaylight: boolean
			offsetFrom: number
			offsetTo: number
			dtstartLocal: string
			rdates: string[]
		}

		const componentsByKey = new Map<Key, Component>()

		if (!transitions.length) {
			const offset = initialOffsetMin
			const standard: Component = {
				isDaylight: false,
				offsetFrom: offset,
				offsetTo: offset,
				dtstartLocal: '19700101T000000',
				rdates: [],
			}
			componentsByKey.set(`S:${offset}:${offset}`, standard)
		} else {
			for (const t of transitions) {
				const key = `${t.isDaylight ? 'D' : 'S'}:${t.offsetFrom}:${t.offsetTo}`
				const existing = componentsByKey.get(key)
				if (!existing) {
					componentsByKey.set(key, {
						isDaylight: t.isDaylight,
						offsetFrom: t.offsetFrom,
						offsetTo: t.offsetTo,
						dtstartLocal: t.localStart,
						rdates: [],
					})
				} else {
					existing.rdates.push(t.localStart)
				}
			}
		}

		const blocks: string[] = ['BEGIN:VTIMEZONE', `TZID:${tzid}`]
		for (const c of componentsByKey.values()) {
			const kind = c.isDaylight ? 'DAYLIGHT' : 'STANDARD'
			blocks.push(`BEGIN:${kind}`)
			blocks.push(`TZOFFSETFROM:${IcsTimeZone.offsetToIcs(c.offsetFrom)}`)
			blocks.push(`TZOFFSETTO:${IcsTimeZone.offsetToIcs(c.offsetTo)}`)
			blocks.push(`TZNAME:${IcsTimeZone.offsetName(c.offsetTo)}`)
			blocks.push(`DTSTART:${c.dtstartLocal}`)
			for (const rd of c.rdates) blocks.push(`RDATE:${rd}`)
			blocks.push(`END:${kind}`)
		}
		blocks.push('END:VTIMEZONE')
		return blocks.join(eol)
	}

	private findTimeZoneTransitions(
		tzid: string,
		fromYear: number,
		toYear: number
	): Array<{ localStart: string; offsetFrom: number; offsetTo: number; isDaylight: boolean }> {
		const transitions: Array<{ localStart: string; offsetFrom: number; offsetTo: number; isDaylight: boolean }> = []

		const start = new Date(Date.UTC(fromYear, 0, 1, 0, 0, 0))
		const end = new Date(Date.UTC(toYear + 1, 0, 1, 0, 0, 0))

		let cursor = start
		while (cursor < end) {
			const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 0, 0, 0))
			const off1 = this.getOffsetMinutes(cursor, tzid)
			const off2 = this.getOffsetMinutes(next, tzid)

			if (off1 !== off2) {
				const transitionInstant = this.findTransitionInstant(cursor, next, tzid)
				const before = new Date(transitionInstant.getTime() - 60 * 1000)
				const after = transitionInstant
				const offsetFrom = this.getOffsetMinutes(before, tzid)
				const offsetTo = this.getOffsetMinutes(after, tzid)
				const isDaylight = offsetTo > offsetFrom
				const localStart = IcsTimeZone.formatLocalDateTime(after, tzid)

				transitions.push({ localStart, offsetFrom, offsetTo, isDaylight })
			}

			cursor = next
		}

		return transitions
	}

	private findTransitionInstant(startUtc: Date, endUtc: Date, tzid: string): Date {
		let lo = startUtc.getTime()
		let hi = endUtc.getTime()
		const offsetLo = this.getOffsetMinutes(new Date(lo), tzid)

		// Refine to ~1 second so we don't end up with odd seconds in VTIMEZONE DTSTART/RDATE.
		while (hi - lo > 1000) {
			const mid = Math.floor((lo + hi) / 2)
			const offsetMid = this.getOffsetMinutes(new Date(mid), tzid)
			if (offsetMid === offsetLo) lo = mid
			else hi = mid
		}

		return new Date(hi)
	}

	private getOffsetMinutes(dateUtc: Date, tzid: string): number {
		// Prefer parsing a GMT offset directly to avoid edge cases like hour=24 formatting.
		const parsed = IcsTimeZone.tryGetOffsetMinutesFromShortOffset(dateUtc, tzid)
		if (parsed !== null) return parsed

		const parts = IcsTimeZone.getDateTimeParts(dateUtc, tzid)
		const asUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
		return Math.round((asUtcMs - dateUtc.getTime()) / 60000)
	}

	private static tryGetOffsetMinutesFromShortOffset(dateUtc: Date, tzid: string): number | null {
		try {
			const dtf = new Intl.DateTimeFormat('en-US', {
				timeZone: tzid,
				timeZoneName: 'shortOffset',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			})
			const parts = dtf.formatToParts(dateUtc)
			const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
			// Common forms: "GMT+2", "GMT+02:00", "UTC+1"
			const m = tzName.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/)
			if (!m) return null
			const sign = m[1] === '-' ? -1 : 1
			const hh = Number.parseInt(m[2], 10)
			const mm = m[3] ? Number.parseInt(m[3], 10) : 0
			if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
			return sign * (hh * 60 + mm)
		} catch {
			return null
		}
	}

	private static getDateTimeParts(
		dateUtc: Date,
		tzid: string
	): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
		const dtf = new Intl.DateTimeFormat('en-US', {
			timeZone: tzid,
			hour12: false,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})
		const parts = dtf.formatToParts(dateUtc)
		const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
		return {
			year: get('year'),
			month: get('month'),
			day: get('day'),
			hour: get('hour'),
			minute: get('minute'),
			second: get('second'),
		}
	}

	private static formatLocalDateTime(dateUtc: Date, tzid: string): string {
		const p = IcsTimeZone.getDateTimeParts(dateUtc, tzid)
		const pad = (n: number) => String(n).padStart(2, '0')
		return String(p.year) + pad(p.month) + pad(p.day) + 'T' + pad(p.hour) + pad(p.minute) + '00'
	}

	private static offsetToIcs(offsetMinutes: number): string {
		const sign = offsetMinutes >= 0 ? '+' : '-'
		const abs = Math.abs(offsetMinutes)
		const hh = Math.floor(abs / 60)
		const mm = abs % 60
		return `${sign}${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}`
	}

	private static offsetName(offsetMinutes: number): string {
		return `UTC${IcsTimeZone.offsetToIcs(offsetMinutes)}`
	}

	private static getSystemTimeZone(): string {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
		} catch {
			return 'UTC'
		}
	}

	private static isUtcLikeTzid(tzid: string): boolean {
		const t = (tzid || '').trim()
		return (
			t === 'UTC' ||
			t === 'Etc/UTC' ||
			t === 'Etc/GMT' ||
			t === 'GMT' ||
			t === 'GMT0' ||
			t === 'Etc/GMT0' ||
			t === 'Etc/Universal' ||
			t === 'Etc/Zulu'
		)
	}
}
