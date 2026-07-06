import { createContext } from 'react'
import type { ResolvedTheme, ThemePreference } from '../lib/theme'

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (pref: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
