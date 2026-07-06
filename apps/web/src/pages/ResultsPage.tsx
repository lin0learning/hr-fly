import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adviseTrip } from '@hzcd/strategy'
import type { TripAdvice } from '@hzcd/strategy'
import { formatTime, searchFlights, type FlightOffer } from '../lib/api'
import { loadUserState } from '../lib/storage'

function SkeletonList() {
  return (
    <ul className="skeleton-list" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="skeleton-card">
          <div className="skeleton-line wide" />
          <div className="skeleton-line" />
          <div className="skeleton-line narrow" />
        </li>
      ))}
    </ul>
  )
}

export default function ResultsPage() {
  const [params] = useSearchParams()
  const dep = params.get('dep') ?? ''
  const back = params.get('back') ?? ''
  const type = params.get('type') ?? 'round'

  const [userState] = useState(loadUserState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<FlightOffer[]>([])
  const [systemMessage, setSystemMessage] = useState<string | null>(null)
  const [filteredCount, setFilteredCount] = useState(0)
  const [directOnly, setDirectOnly] = useState(true)
  const [sortType, setSortType] = useState('3')

  const depAdvice = useMemo(
    () => (dep ? adviseTrip(dep, userState, back || undefined) : null),
    [dep, back, userState],
  )

  useEffect(() => {
    if (!dep) return
    setLoading(true)
    setError(null)
    searchFlights({
      depDate: dep,
      backDate: type === 'round' && back ? back : undefined,
      journeyType: directOnly ? '1' : undefined,
      sortType,
    })
      .then((res) => {
        if (res.error) setError(res.error)
        setItems(res.items ?? [])
        setSystemMessage(res.systemMessage ?? null)
        setFilteredCount(res.filteredCount ?? 0)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '搜索失败'))
      .finally(() => setLoading(false))
  }, [dep, back, type, directOnly, sortType])

  const displayItems = useMemo(() => {
    let list = [...items]
    if (directOnly) {
      list = list.filter((i) => i.outbound?.direct && (i.inbound ? i.inbound.direct : true))
    }
    if (sortType === '3') list.sort((a, b) => a.priceYuan - b.priceYuan)
    return list
  }, [items, directOnly, sortType])

  const displayTags = depAdvice?.labels.slice(0, 2) ?? []

  return (
    <div className="page">
      <header className="page-header row">
        <Link to="/" className="back-link">
          ← 返回
        </Link>
        <h1>航班结果</h1>
      </header>

      <section className="card meta-card">
        <p>
          {dep}
          {type === 'round' && back ? ` → ${back}` : ''} · {type === 'round' ? '往返' : '单程'}
        </p>
        <p className="muted">仅显示双流机场进出航班</p>
        {depAdvice && <AdviceBlock advice={depAdvice} />}
      </section>

      <section className="filters card">
        <label className="checkbox">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />
          仅直飞
        </label>
        <label className="field inline">
          <span>排序</span>
          <select value={sortType} onChange={(e) => setSortType(e.target.value)}>
            <option value="3">价格从低到高</option>
            <option value="6">出发从早到晚</option>
            <option value="7">出发从晚到早</option>
          </select>
        </label>
      </section>

      {loading && <SkeletonList />}
      {error && <p className="error">{error}</p>}
      {!loading && !error && displayItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden>
            ✈
          </div>
          <p>未找到双流机场航班</p>
          <p className="muted">
            {filteredCount > 0 ? `已过滤 ${filteredCount} 条天府/其他机场航班` : '请尝试调整日期或筛选条件'}
          </p>
          <Link to="/" className="link-btn">
            重新搜票
          </Link>
        </div>
      )}

      <ul className="flight-list">
        {displayItems.map((item, idx) => (
          <li key={`${item.jumpUrl}-${idx}`} className="card flight-card">
            <div className="price-row">
              <span className="price">¥{item.priceYuan.toFixed(0)}</span>
              {displayTags.map((l) => (
                <span key={l} className="tag small">
                  {l}
                </span>
              ))}
            </div>
            {item.outbound && (
              <FlightLegRow label="去程" leg={item.outbound} showLine={Boolean(item.inbound)} />
            )}
            {item.inbound && <FlightLegRow label="返程" leg={item.inbound} showLine={false} />}
            <p className="muted">
              总时长约 {item.totalDurationMin} 分钟 · {item.outbound?.cabin}
            </p>
            {item.jumpUrl && (
              <a className="book-btn" href={item.jumpUrl} target="_blank" rel="noopener noreferrer">
                预订
              </a>
            )}
          </li>
        ))}
      </ul>

      {systemMessage && <p className="platform-hint">{systemMessage}</p>}
      <p className="footer-note">Based on fly.ai real-time results</p>
    </div>
  )
}

function AdviceBlock({ advice }: { advice: TripAdvice }) {
  return (
    <div className={`advice advice-${advice.reimbursementMode}`}>
      {advice.labels.slice(0, 2).map((l) => (
        <span key={l} className="tag">
          {l}
        </span>
      ))}
      <p className="advice-reason">{advice.reason}</p>
    </div>
  )
}

function FlightLegRow({
  label,
  leg,
  showLine,
}: {
  label: string
  leg: NonNullable<FlightOffer['outbound']>
  showLine: boolean
}) {
  return (
    <div className="leg">
      <div className="leg-timeline">
        <span className="leg-dot" />
        {showLine && <span className="leg-line" />}
      </div>
      <span className="leg-label">{label}</span>
      <div className="leg-main">
        <strong>
          {formatTime(leg.depDateTime)} → {formatTime(leg.arrDateTime)}
        </strong>
        <span>
          {leg.airline} {leg.flightNo} · {leg.depAirport} → {leg.arrAirport}
        </span>
        {!leg.direct && leg.stops.length > 0 && (
          <span className="warning">经停 {leg.stops.join('、')}</span>
        )}
      </div>
    </div>
  )
}
