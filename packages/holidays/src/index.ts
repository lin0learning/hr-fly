export type HolidayDateType = 'public_holiday' | 'transfer_workday'

export interface HolidayCalendarYear {
  year: number
  region: string
  dates: Array<{
    date: string
    name: string
    name_cn: string
    name_en: string
    type: HolidayDateType
  }>
}

export interface HolidayWindow {
  name: string
  nameCn: string
  start: string
  end: string
}

const MAJOR_KEYWORDS = ['春节', '劳动节', '国庆节'] as const

export function getMajorHolidayWindows(data: HolidayCalendarYear): HolidayWindow[] {
  const holidays = data.dates
    .filter((d) => d.type === 'public_holiday')
    .sort((a, b) => a.date.localeCompare(b.date))

  const windows: HolidayWindow[] = []

  for (const keyword of MAJOR_KEYWORDS) {
    const matching = holidays.filter((d) => d.name_cn.includes(keyword))
    if (matching.length === 0) continue

    const groups: Array<typeof matching> = []
    let group: typeof matching = [matching[0]]

    for (let i = 1; i < matching.length; i++) {
      const prev = new Date(group[group.length - 1].date)
      const curr = new Date(matching[i].date)
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000
      if (diffDays <= 1) {
        group.push(matching[i])
      } else {
        groups.push(group)
        group = [matching[i]]
      }
    }
    groups.push(group)

    for (const g of groups) {
      windows.push({
        name: keyword,
        nameCn: g[0].name_cn,
        start: g[0].date,
        end: g[g.length - 1].date,
      })
    }
  }

  return windows.sort((a, b) => a.start.localeCompare(b.start))
}

export function getNextMinorHolidayWindow(
  data: HolidayCalendarYear,
  today: string,
): HolidayWindow | null {
  const isMajor = (nameCn: string) => MAJOR_KEYWORDS.some((k) => nameCn.includes(k))

  const holidays = data.dates
    .filter((d) => d.type === 'public_holiday' && !isMajor(d.name_cn))
    .sort((a, b) => a.date.localeCompare(b.date))

  const future = holidays.filter((d) => d.date >= today)
  if (future.length === 0) return null

  const nameCn = future[0].name_cn
  const same = future.filter((d) => d.name_cn === nameCn)
  return {
    name: nameCn,
    nameCn,
    start: same[0].date,
    end: same[same.length - 1].date,
  }
}

export function isDateInWindow(date: string, window: HolidayWindow): boolean {
  return date >= window.start && date <= window.end
}

export { getHolidayDataForYear, data2025, data2026, data2027 } from './data/index.js'
