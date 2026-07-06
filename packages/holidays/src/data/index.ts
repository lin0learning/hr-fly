import type { HolidayCalendarYear } from '../index.js'
import raw2025 from '../../data/2025.json' with { type: 'json' }
import raw2026 from '../../data/2026.json' with { type: 'json' }

export const data2025 = raw2025 as HolidayCalendarYear
export const data2026 = raw2026 as HolidayCalendarYear

/** Placeholder until State Council publishes 2027 schedule */
export const data2027: HolidayCalendarYear = {
  year: 2027,
  region: 'CN',
  dates: [],
}

export function getHolidayDataForYear(year: number): HolidayCalendarYear {
  if (year === 2025) return data2025
  if (year === 2026) return data2026
  if (year === 2027) return data2027
  return { year, region: 'CN', dates: [] }
}
