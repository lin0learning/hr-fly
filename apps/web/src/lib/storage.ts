import type { BoundaryAssignTo, Quarter, UserState } from '@hzcd/strategy'
import { createDefaultUserState } from '@hzcd/strategy'

const STORAGE_KEY = 'hzcd-reimbursement-v1'

export function loadUserState(): UserState {
  const year = new Date().getFullYear()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultUserState(year)
    const parsed = JSON.parse(raw) as UserState
    if (parsed.year !== year) {
      return { ...createDefaultUserState(year), boundaryAssignments: parsed.boundaryAssignments ?? [] }
    }
    return parsed
  } catch {
    return createDefaultUserState(year)
  }
}

export function saveUserState(state: UserState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function setQuarterReimbursed(state: UserState, quarter: Quarter, reimbursed: boolean): UserState {
  const next = {
    ...state,
    quarters: { ...state.quarters, [quarter]: { reimbursed } },
  }
  saveUserState(next)
  return next
}

export function setBoundaryAssignment(
  state: UserState,
  date: string,
  assignTo: BoundaryAssignTo,
): UserState {
  const rest = state.boundaryAssignments.filter((a) => a.date !== date)
  const next = { ...state, boundaryAssignments: [...rest, { date, assignTo }] }
  saveUserState(next)
  return next
}
