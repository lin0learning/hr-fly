import { useTheme } from '../hooks/useTheme'
import type { ThemePreference } from '../lib/theme'

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

export default function ThemeSwitcher() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="segmented" role="radiogroup" aria-label="主题">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={preference === opt.value}
          className={preference === opt.value ? 'active' : ''}
          onClick={() => setPreference(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
