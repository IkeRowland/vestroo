/**
 * Trip-request market clock in **`Africa/Johannesburg`** (FE.19.2 / Story 19.2).
 *
 * South Africa (SAST) is **UTC+2 year-round** (no DST since 1994). We use that fixed offset
 * for `rideDate` + `rideTime` → instant conversion so `combineRideDateAndTime` matches default
 * generation without adding `date-fns-tz` / Luxon.
 *
 * For formatting “now” parts we still use `Intl` with `timeZone: 'Africa/Johannesburg'` so any
 * future policy change stays aligned with IANA data where offset differs.
 */

export const TRIP_REQUEST_MARKET_TIME_ZONE = 'Africa/Johannesburg' as const

/** Fixed offset for Africa/Johannesburg (SAST): UTC+2 with no DST. */
const JOHANNESBURG_UTC_OFFSET_MS = 2 * 60 * 60 * 1000

export type JohannesburgWallParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Calendar + wall-clock parts for an instant, in `Africa/Johannesburg`.
 */
export function getJohannesburgWallPartsFromInstant(ms: number): JohannesburgWallParts {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: TRIP_REQUEST_MARKET_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(new Date(ms))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 'NaN')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** `YYYY-MM-DD` for “today” in Johannesburg (for `<input type="date" min>`). */
export function getJohannesburgTodayYmd(nowMs: number = Date.now()): string {
  const p = getJohannesburgWallPartsFromInstant(nowMs)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

/**
 * Adds whole calendar days in the Johannesburg wall calendar (FE.19.4 quick chips / navigation).
 */
export function addJohannesburgCalendarDaysFromYmd(ymd: string, deltaDays: number): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!parts) return ymd
  const y = Number(parts[1])
  const mo = Number(parts[2])
  const d = Number(parts[3])
  if (![y, mo, d].every(Number.isFinite)) return ymd
  const noon = johannesburgWallToUtcInstant(y, mo, d, 12, 0)
  if (noon === null) return ymd
  const target = noon + deltaDays * 86400000
  const p = getJohannesburgWallPartsFromInstant(target)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

/** Next calendar day in Johannesburg wall calendar from `(y, mo, d)`. */
function addOneDayJohannesburgWall(y: number, mo: number, d: number): { y: number; mo: number; d: number } {
  const noon = johannesburgWallToUtcInstant(y, mo, d, 12, 0)
  if (noon === null) return { y, mo, d: d + 1 }
  const p = getJohannesburgWallPartsFromInstant(noon + 86400000)
  return { y: p.year, mo: p.month, d: p.day }
}

/**
 * Instant for Johannesburg wall time `(year, month, day, hour, minute)` (month 1–12).
 * Returns `null` if components are invalid.
 */
export function johannesburgWallToUtcInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number | null {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null
  }
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - JOHANNESBURG_UTC_OFFSET_MS
  const t = new Date(utcMs)
  if (Number.isNaN(t.getTime())) return null
  return t.getTime()
}

/** Round `ms` up to the next 15-minute boundary on its Johannesburg calendar day (may cross midnight). */
export function roundUpToNext15MinutesJohannesburg(ms: number): number {
  const p = getJohannesburgWallPartsFromInstant(ms)
  const dayStart = johannesburgWallToUtcInstant(p.year, p.month, p.day, 0, 0)
  if (dayStart === null) return ms
  const rel = ms - dayStart
  const step = 15 * 60 * 1000
  const roundedRel = Math.ceil(rel / step) * step
  return dayStart + roundedRel
}

export type DefaultTripRequestRideDateTime = { rideDate: string; rideTime: string }

/**
 * FE.19.2 default pickup calendar date + time (Johannesburg):
 * - Time: `now + 90min`, rounded **up** to the next 15-minute mark (wall clock in JNB).
 * - Date: calendar day of that rounded instant, **unless** `now+90min` falls on the **same**
 *   Johannesburg calendar day as `now` and its clock is **strictly after 22:00**, in which case
 *   the default **ride date** is the **next** calendar day in JNB with the same rounded **time**
 *   string (avoids awkward “book very late today” defaults per epic).
 */
export function computeDefaultTripRequestRideDateTime(nowMs: number = Date.now()): DefaultTripRequestRideDateTime {
  const tPick = nowMs + 90 * 60 * 1000
  const tRounded = roundUpToNext15MinutesJohannesburg(tPick)
  const p90 = getJohannesburgWallPartsFromInstant(tPick)
  const pNow = getJohannesburgWallPartsFromInstant(nowMs)
  const pr = getJohannesburgWallPartsFromInstant(tRounded)

  const sameCalendarPickAsNow =
    p90.year === pNow.year && p90.month === pNow.month && p90.day === pNow.day
  const afterTenPm =
    p90.hour > 22 || (p90.hour === 22 && p90.minute > 0)

  let y = pr.year
  let mo = pr.month
  let d = pr.day
  if (sameCalendarPickAsNow && afterTenPm) {
    const n = addOneDayJohannesburgWall(pNow.year, pNow.month, pNow.day)
    y = n.y
    mo = n.mo
    d = n.d
  }

  return {
    rideDate: `${y}-${pad2(mo)}-${pad2(d)}`,
    rideTime: `${pad2(pr.hour)}:${pad2(pr.minute)}`,
  }
}
