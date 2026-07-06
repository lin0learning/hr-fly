import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adviseTrip, getCalendarQuarter, getHomeBanner, QUARTER_LABELS } from '@hzcd/strategy'
import { loadUserState } from '../lib/storage'

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function HomePage() {
  const navigate = useNavigate()
  const [userState] = useState(loadUserState)
  const today = todayISO()

  const [tripType, setTripType] = useState<'round' | 'oneway'>('round')
  const [depDate, setDepDate] = useState('')
  const [backDate, setBackDate] = useState('')

  const banner = useMemo(() => getHomeBanner(today, userState), [today, userState])
  const currentQ = getCalendarQuarter(today)
  const quarterReimbursed = userState.quarters[currentQ].reimbursed

  const depAdvice = depDate ? adviseTrip(depDate, userState, backDate || undefined) : null

  function onSearch() {
    if (!depDate) return
    const params = new URLSearchParams({ dep: depDate, type: tripType })
    if (tripType === 'round' && backDate) params.set('back', backDate)
    navigate(`/results?${params}`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{import.meta.env.VITE_APP_NAME}</h1>
        <p className="subtitle">杭州 ↔ 成都 · 经济舱 · 双流进出</p>
      </header>

      <section className="banner card">
        <span className={`status-chip ${quarterReimbursed ? 'ok' : 'pending'}`}>
          {QUARTER_LABELS[currentQ]}
          {quarterReimbursed ? ' · 已报销' : ' · 未报销'}
        </span>
        {banner.lines.slice(1).map((line) => (
          <p key={line} className="banner-line">
            {line}
          </p>
        ))}
        {banner.minorHint && <p className="banner-minor">{banner.minorHint}</p>}
      </section>

      <section className="card route-card">
        <div className="route-row">
          <div className="city-block">
            <span className="city-name">杭州</span>
            <span className="city-code">HGH</span>
          </div>
          <span className="route-arrow">⇄</span>
          <div className="city-block">
            <span className="city-name">成都</span>
            <span className="city-code">CTU 双流</span>
          </div>
        </div>
        <p className="route-note">落地机场：双流国际机场</p>
      </section>

      <section className="card form-card">
        <div className="segmented">
          <button
            type="button"
            className={tripType === 'round' ? 'active' : ''}
            onClick={() => setTripType('round')}
          >
            往返
          </button>
          <button
            type="button"
            className={tripType === 'oneway' ? 'active' : ''}
            onClick={() => setTripType('oneway')}
          >
            单程
          </button>
        </div>

        <ul className="form-list">
          <li>
            <label htmlFor="dep-date">去程日期</label>
            <input
              id="dep-date"
              type="date"
              min={today}
              value={depDate}
              onChange={(e) => setDepDate(e.target.value)}
            />
          </li>
          {tripType === 'round' && (
            <li>
              <label htmlFor="back-date">返程日期</label>
              <input
                id="back-date"
                type="date"
                min={depDate || today}
                value={backDate}
                onChange={(e) => setBackDate(e.target.value)}
              />
            </li>
          )}
        </ul>

        {depAdvice && (
          <div className={`advice advice-${depAdvice.reimbursementMode}`}>
            {depAdvice.labels.map((l) => (
              <span key={l} className="tag">
                {l}
              </span>
            ))}
            <p className="advice-reason">{depAdvice.reason}</p>
            {depAdvice.warnings.map((w) => (
              <p key={w} className="warning">
                {w}
              </p>
            ))}
          </div>
        )}

        <button
          type="button"
          className="primary-btn"
          disabled={!depDate || (tripType === 'round' && !backDate)}
          onClick={onSearch}
        >
          搜索航班
        </button>
      </section>

      <p className="footer-note">Based on fly.ai real-time results</p>
    </div>
  )
}
