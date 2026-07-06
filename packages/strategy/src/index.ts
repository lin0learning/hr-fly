import type { HolidayCalendarYear, HolidayWindow } from '@hzcd/holidays'
import {
  getHolidayDataForYear,
  getMajorHolidayWindows,
  getNextMinorHolidayWindow,
  isDateInWindow,
} from '@hzcd/holidays'

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export type BoundaryAssignTo = Quarter | 'prevQ4' | 'nextQ1'

export interface UserState {
  year: number
  quarters: Record<Quarter, { reimbursed: boolean }>
  boundaryAssignments: Array<{ date: string; assignTo: BoundaryAssignTo }>
}

export type ReimbursementMode =
  | 'eligible'
  | 'self_pay'
  | 'quota_used'
  | 'boundary_choice_required'

export interface TripAdvice {
  reimbursementMode: ReimbursementMode
  suggestedQuarter?: Quarter
  boundaryOptions?: Quarter[]
  labels: string[]
  warnings: string[]
  reason: string
}

export interface HomeBanner {
  lines: string[]
  nextMajorHoliday?: HolidayWindow
  minorHint?: string
}

export const DEFAULT_BOUNDARY_DATES = ['09-30', '10-01', '01-01'] as const

export const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: '第一季度',
  Q2: '第二季度',
  Q3: '第三季度',
  Q4: '第四季度',
}

export function createDefaultUserState(year: number): UserState {
  return {
    year,
    quarters: {
      Q1: { reimbursed: false },
      Q2: { reimbursed: false },
      Q3: { reimbursed: false },
      Q4: { reimbursed: false },
    },
    boundaryAssignments: [],
  }
}

export function getCalendarQuarter(date: string): Quarter {
  const month = Number(date.slice(5, 7))
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

export function isBoundaryDate(date: string, boundaryDates = DEFAULT_BOUNDARY_DATES): boolean {
  const md = date.slice(5)
  return (boundaryDates as readonly string[]).includes(md)
}

export function getBoundaryOptions(date: string): Quarter[] | null {
  const md = date.slice(5, 10)
  if (md === '09-30' || md === '10-01') return ['Q3', 'Q4']
  if (md === '01-01') return ['Q1', 'Q4']
  return null
}

export function resolveQuarterForDate(date: string, userState: UserState): Quarter {
  const assignment = userState.boundaryAssignments.find((a) => a.date === date)
  if (assignment) {
    if (assignment.assignTo === 'prevQ4') {
      const y = Number(date.slice(0, 4))
      return getCalendarQuarter(`${y - 1}-12-31`)
    }
    if (assignment.assignTo === 'nextQ1') return 'Q1'
    return assignment.assignTo
  }

  const md = date.slice(5, 10)
  if (md === '01-01') {
    const assignmentQ1 = userState.boundaryAssignments.find((a) => a.date === date && a.assignTo === 'Q1')
    if (assignmentQ1) return 'Q1'
    const assignmentQ4 = userState.boundaryAssignments.find((a) => a.date === date && a.assignTo === 'Q4')
    if (assignmentQ4) return 'Q4'
    return 'Q1'
  }

  return getCalendarQuarter(date)
}

function getHolidayData(date: string): HolidayCalendarYear {
  const year = Number(date.slice(0, 4))
  return getHolidayDataForYear(year)
}

function findMajorWindowForDate(date: string): HolidayWindow | null {
  const data = getHolidayData(date)
  const windows = getMajorHolidayWindows(data)
  return windows.find((w) => isDateInWindow(date, w)) ?? null
}

export function adviseTrip(depDate: string, userState: UserState, backDate?: string): TripAdvice {
  const checkDate = depDate
  const labels: string[] = []
  const warnings: string[] = []

  if (isBoundaryDate(checkDate)) {
    const options = getBoundaryOptions(checkDate)
    const assignment = userState.boundaryAssignments.find((a) => a.date === checkDate)
    const onMajorHoliday = Boolean(findMajorWindowForDate(checkDate))
    if (!assignment && options && !onMajorHoliday) {
      return {
        reimbursementMode: 'boundary_choice_required',
        boundaryOptions: options,
        labels: ['边界日 · 请选择计入季度'],
        warnings: [`${checkDate} 为报销边界日，请先选择计入哪一季度`],
        reason: '边界日可灵活计入相邻季度，需在设置或搜索前确认。',
      }
    }
  }

  const quarter = resolveQuarterForDate(checkDate, userState)

  if (userState.quarters[quarter].reimbursed) {
    return {
      reimbursementMode: 'quota_used',
      suggestedQuarter: quarter,
      labels: ['本季额度已用 · 自付'],
      warnings: [`${QUARTER_LABELS[quarter]}报销额度已使用，本次视为自付`],
      reason: '本季度报销次数已用完。',
    }
  }

  const major = findMajorWindowForDate(checkDate)

  if (major) {
    labels.push(`建议 ${QUARTER_LABELS[quarter]} 报销`)
    labels.push(major.nameCn)
    if (isBoundaryDate(checkDate)) labels.push('边界日')
    return {
      reimbursementMode: 'eligible',
      suggestedQuarter: quarter,
      labels,
      warnings,
      reason: `出行日期在${major.nameCn}（${major.start} ~ ${major.end}）内，建议使用${QUARTER_LABELS[quarter]}额度。`,
    }
  }

  if (isBoundaryDate(checkDate) && userState.boundaryAssignments.some((a) => a.date === checkDate)) {
    return {
      reimbursementMode: 'eligible',
      suggestedQuarter: quarter,
      labels: [`建议 ${QUARTER_LABELS[quarter]} 报销`, '边界日'],
      warnings,
      reason: `边界日已选择计入${QUARTER_LABELS[quarter]}，可使用该季度报销额度。`,
    }
  }

  const data = getHolidayData(checkDate)
  const isPublicHoliday = data.dates.some(
    (d) => d.date === checkDate && d.type === 'public_holiday',
  )

  if (isPublicHoliday) {
    return {
      reimbursementMode: 'self_pay',
      labels: ['小假 · 建议自付'],
      warnings: ['非法定三大假，公司报销通常不适用，可自行购票探亲'],
      reason: '清明/端午/中秋等小假期建议自付出行。',
    }
  }

  if (backDate && backDate !== depDate) {
    labels.push('平日出行 · 自付')
  }

  return {
    reimbursementMode: 'self_pay',
    suggestedQuarter: quarter,
    labels: labels.length ? labels : ['自付'],
    warnings: warnings.length ? warnings : [],
    reason: '非节假日窗口，默认自付；若公司另有规定请以财务为准。',
  }
}

export function getHomeBanner(today: string, userState: UserState): HomeBanner {
  const year = Number(today.slice(0, 4))
  const data = getHolidayDataForYear(year)
  const majorWindows = getMajorHolidayWindows(data)
  const lines: string[] = []

  const currentQ = getCalendarQuarter(today)
  const qStatus = userState.quarters[currentQ].reimbursed
    ? `${QUARTER_LABELS[currentQ]}已报销`
    : `${QUARTER_LABELS[currentQ]}未报销`
  lines.push(qStatus)

  const nextMajor = majorWindows.find((w) => w.end >= today) ?? majorWindows[0]
  if (nextMajor) {
    const days = Math.ceil(
      (new Date(nextMajor.start).getTime() - new Date(today).getTime()) / 86400000,
    )
    if (days >= 0) {
      lines.push(`${nextMajor.name} ${days} 天后（${nextMajor.start}）`)
    }
  }

  const minor = getNextMinorHolidayWindow(data, today)
  let minorHint: string | undefined
  if (minor) {
    const days = Math.ceil(
      (new Date(minor.start).getTime() - new Date(today).getTime()) / 86400000,
    )
    if (days > 0 && days <= 90) {
      minorHint = `距${minor.nameCn}还有 ${days} 天，可考虑自付回一次`
    }
  }

  const upcomingBoundary = DEFAULT_BOUNDARY_DATES.map((md) => {
    const y = md === '01-01' && today.slice(5) > '06-30' ? year + 1 : year
    return `${y}-${md}`
  }).find((d) => d >= today && d <= `${year + 1}-12-31`)

  if (upcomingBoundary) {
    const days = Math.ceil(
      (new Date(upcomingBoundary).getTime() - new Date(today).getTime()) / 86400000,
    )
    if (days >= 0 && days <= 30) {
      lines.push(`报销边界日 ${upcomingBoundary} 临近（${days} 天）`)
    }
  }

  return { lines, nextMajorHoliday: nextMajor, minorHint }
}

export function daysFromToday(today: string, target: string): number {
  return Math.ceil((new Date(target).getTime() - new Date(today).getTime()) / 86400000)
}
