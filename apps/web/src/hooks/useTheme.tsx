import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyResolvedTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'
import { ThemeContext } from './theme-context'

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadThemePreference)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(loadThemePreference()))

  const apply = useCallback((pref: ThemePreference) => {
    const next = resolveTheme(pref)
    setResolved(next)
    applyResolvedTheme(next)
  }, [])

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      saveThemePreference(pref)
      setPreferenceState(pref)
      apply(pref)
    },
    [apply],
  )

  useEffect(() => {
    apply(preference)
  }, [preference, apply])

  useEffect(() => {
    if (preference !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference, apply])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeContextProvider')
  return ctx
}
