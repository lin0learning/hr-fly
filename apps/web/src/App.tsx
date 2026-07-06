import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'
import SettingsPage from './pages/SettingsPage'
import { useStandalone } from './hooks/useStandalone'

function TabIcon({ name }: { name: 'search' | 'settings' }) {
  if (name === 'search') {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
    )
  }
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export default function App() {
  const standalone = useStandalone()
  const location = useLocation()
  const [hintDismissed, setHintDismissed] = useState(
    () => sessionStorage.getItem('hzcd-install-hint') === '1',
  )

  function dismissHint() {
    sessionStorage.setItem('hzcd-install-hint', '1')
    setHintDismissed(true)
  }

  const showHint = !standalone && !hintDismissed && location.pathname === '/'

  return (
    <div className="app">
      {showHint && (
        <div className="install-hint">
          <span>在 Safari 中打开并「添加到主屏幕」获得完整 App 体验</span>
          <button type="button" onClick={dismissHint} aria-label="关闭">
            ×
          </button>
        </div>
      )}
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav className="tab-bar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <TabIcon name="search" />
          搜票
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <TabIcon name="settings" />
          设置
        </NavLink>
      </nav>
    </div>
  )
}
